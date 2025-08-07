// Authentication HTTP Client - Handles API communication
// Decoupled HTTP client for auth service dependency injection

import { IAuthHttpClient } from './auth.interface';

export class AuthHttpClient implements IAuthHttpClient {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  setAuthHeader(token: string): void {
    this.authToken = token;
  }

  removeAuthHeader(): void {
    this.authToken = null;
  }

  private getHeaders(): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    if (this.authToken) {
      headers.set('Authorization', `Bearer ${this.authToken}`);
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || response.statusText };
      }
      
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();
    if (!responseText) {
      return {} as T;
    }

    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      throw new Error('Invalid JSON response from server');
    }
  }

  async get<T>(url: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(url: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(url: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(url: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(url: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }
}
