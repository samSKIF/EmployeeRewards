/**
 * Placeholder event bus. Replace with Kafka/NATS producer later.
 */
import { registerShutdownHook } from '../bootstrap/shutdown';

export async function publish(topic: string, message: unknown): Promise<void> {
  console.log('PUBLISH', topic, JSON.stringify(message));
}

export async function close(): Promise<void> {
  // no-op for stub; real impl should flush producer and close connection
  console.log('EVENT BUS closed');
}

// register close on process shutdown
registerShutdownHook(close);