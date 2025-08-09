export type BusMode = 'stub' | 'kafka';

export const BUS_MODE: BusMode = (process.env.BUS as BusMode) || 'stub';

export const KAFKA = {
  CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'thrivio',
  BROKERS: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',').map(s => s.trim()),
  SSL: process.env.KAFKA_SSL === 'true',
  SASL: process.env.KAFKA_SASL_MECHANISM
    ? {
        mechanism: process.env.KAFKA_SASL_MECHANISM as any, // 'plain' | 'scram-sha-256' | 'scram-sha-512'
        username: process.env.KAFKA_SASL_USERNAME || '',
        password: process.env.KAFKA_SASL_PASSWORD || ''
      }
    : undefined
};