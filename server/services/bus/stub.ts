/**
 * Stub event bus. Logs messages to console.
 */
export async function start(): Promise<void> {
  // nothing to do
}
export async function publish(topic: string, message: unknown): Promise<void> {
  console.log('[STUB BUS] PUBLISH', topic, JSON.stringify(message));
}
export async function registerConsumer(topic: string, handler: (msg: any) => Promise<void>): Promise<void> {
  console.log('[STUB BUS] registerConsumer ->', topic);
  // no-op: in stub mode we don't auto-consume; tests may call handler directly.
}
export async function health(): Promise<{ ok: boolean; details?: any }> {
  return { ok: true };
}
export async function close(): Promise<void> {
  console.log('[STUB BUS] closed');
}