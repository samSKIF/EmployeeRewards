import axios, { AxiosInstance } from 'axios';
export function http(baseURL: string, headers?: Record<string, string>): AxiosInstance {
  return axios.create({ baseURL, headers });
}