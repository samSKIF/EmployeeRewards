import axios, { AxiosInstance } from 'axios';
import { context, propagation } from '@opentelemetry/api';

export function http(baseURL: string, headers?: Record<string, string>): AxiosInstance {
  const client = axios.create({ baseURL, headers });

  client.interceptors.request.use((config) => {
    const carrier: Record<string, string> = { ...(config.headers as any) };
    propagation.inject(context.active(), carrier, {
      set: (c, k, v) => { c[k] = String(v); }
    });
    config.headers = carrier as any;
    return config;
  });

  return client;
}