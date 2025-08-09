/**
 * Placeholder event bus. Replace with Kafka/NATS producer later.
 */
export async function publish(topic: string, message: unknown): Promise<void> {
  // TODO: swap with real producer
  console.log('PUBLISH', topic, JSON.stringify(message));
}