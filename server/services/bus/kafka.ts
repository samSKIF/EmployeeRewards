import { Kafka, logLevel } from 'kafkajs';
import { KAFKA } from '../../config/bus';

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
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }]
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
      try {
        const val = message.value ? message.value.toString('utf-8') : '{}';
        const parsed = JSON.parse(val);
        const h = handlers.get(topic);
        if (h) await h(parsed);
      } catch (e) {
        // TODO: add DLQ / retry policy
        console.error('[KAFKA] consumer error on', topic, e);
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