import { Kafka, logLevel } from 'kafkajs';
import { KAFKA, BUS_RETRIES, BUS_BACKOFF_MS, DLQ_SUFFIX } from '../../config/bus';
import { context, propagation } from '@opentelemetry/api';

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

let kafka: Kafka | null = null;
let producerStarted = false;
const consumers: { topic: string; groupId: string; started: boolean }[] = [];
const handlers = new Map<string, (msg: any) => Promise<void>>();

function getKafka(): Kafka {
  if (!kafka) {
    kafka = new Kafka({
      clientId: KAFKA.CLIENT_ID,
      brokers: KAFKA.BROKERS,
      ssl: KAFKA.SSL || undefined,
      sasl: KAFKA.SASL as any,
      logLevel: logLevel.NOTHING
    });
  }
  return kafka;
}

export async function start(): Promise<void> {
  // lazily start producer so health can succeed without publish
  await ensureProducer();
}

async function ensureProducer() {
  const k = getKafka();
  if (producerStarted) return;
  const producer = k.producer();
  await producer.connect();
  // store on module for reuse
  (globalThis as any).__busProducer = producer;
  producerStarted = true;
}

export async function publish(topic: string, message: unknown): Promise<void> {
  await ensureProducer();
  const producer = (globalThis as any).__busProducer as import('kafkajs').Producer;
  const headers: Record<string, string> = {};
  propagation.inject(context.active(), headers, {
    set: (c, k, v) => { c[k] = String(v); }
  });

  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message), headers }]
  });
}

export async function registerConsumer(topic: string, handler: (msg: any) => Promise<void>): Promise<void> {
  const k = getKafka();
  handlers.set(topic, handler);
  const groupId = `${KAFKA.CLIENT_ID}-${topic}`;
  const consumer = k.consumer({ groupId });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const val = message.value ? message.value.toString('utf-8') : '{}';
      const parsed = JSON.parse(val);
      let attempt = 0;
      let lastError: any = null;
      const hdrs = Object.fromEntries(Object.entries(message.headers || {}).map(([k, v]) => [k, v?.toString?.() || String(v)]));
      const extracted = propagation.extract(context.active(), hdrs, {
        get: (c, k) => (c as any)[k],
        keys: (c) => Object.keys(c as any)
      });

      await context.with(extracted, async () => {
        while (attempt < BUS_RETRIES) {
          try {
            const h = handlers.get(topic);
            if (h) await h(parsed);
            lastError = null;
            break;
          } catch (e: any) {
            lastError = e;
            attempt++;
            if (attempt < BUS_RETRIES) {
              const delay = BUS_BACKOFF_MS * Math.pow(2, attempt - 1);
              await sleep(delay);
            }
          }
        }
      });
      if (lastError) {
        // Send to DLQ with metadata
        const producer = (globalThis as any).__busProducer as import('kafkajs').Producer;
        const dlqTopic = `${topic}${DLQ_SUFFIX}`;
        const payload = {
          error: String(lastError?.message || lastError),
          original: parsed,
          attempts: BUS_RETRIES,
          ts: new Date().toISOString()
        };
        await producer.send({ topic: dlqTopic, messages: [{ value: JSON.stringify(payload) }] });
        // Note: by handling error here, we prevent infinite reprocessing loops
      }
    }
  });

  consumers.push({ topic, groupId, started: true });
}

export async function health(): Promise<{ ok: boolean; details?: any }> {
  try {
    const k = getKafka();
    const admin = k.admin();
    await admin.connect();
    const brokers = KAFKA.BROKERS;
    await admin.disconnect();
    return { ok: true, details: { brokers } };
  } catch (e: any) {
    return { ok: false, details: { error: e?.message || String(e) } };
  }
}

export async function close(): Promise<void> {
  try {
    const producer = (globalThis as any).__busProducer as import('kafkajs').Producer | undefined;
    if (producer) await producer.disconnect();
  } catch {}
  try {
    const k = getKafka();
    // kafkajs doesn't track all consumers globally; in a real impl we'd track instances
    // Here we just log; on process exit, kafkajs closes sockets anyway.
    // Optionally add admin/consumer disconnects if you hold references.
  } catch {}
}