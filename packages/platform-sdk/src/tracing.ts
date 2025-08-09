import { context, trace } from '@opentelemetry/api';
export const tracer = trace.getTracer('platform-sdk');
export async function withSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const span = tracer.startSpan(name);
  try {
    return await context.with(trace.setSpan(context.active(), span), fn);
  } catch (e) {
    span.recordException(e as Error);
    throw e;
  } finally {
    span.end();
  }
}