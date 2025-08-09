import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

let sdk: NodeSDK | null = null;

export async function startTelemetry() {
  if (sdk) return;

  const serviceName = process.env.OTEL_SERVICE_NAME || 'server';

  const traceExporter = new OTLPTraceExporter({
    // respects env OTEL_EXPORTER_OTLP_ENDPOINT (e.g., http://localhost:4318)
  });

  // Set service name via environment variable for auto-detection
  process.env.OTEL_SERVICE_NAME = serviceName;
  
  sdk = new NodeSDK({
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()]
  });

  await sdk.start();
  console.log('[otel] started');
}

export async function stopTelemetry() {
  if (!sdk) return;
  await sdk.shutdown();
  console.log('[otel] stopped');
}