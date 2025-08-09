/**
 * Employee Core Service Proxy
 * Handles communication with the Employee Core microservice
 * Part of the dual-write pattern for gradual migration
 */

import { logger } from '@platform/sdk';

export interface EmployeeCoreConfig {
  baseUrl: string;
  enabled: boolean;
  timeout?: number;
  retryAttempts?: number;
}

export class EmployeeCoreProxy {
  private config: EmployeeCoreConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy: boolean = false;

  constructor(config: EmployeeCoreConfig) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3001',
      enabled: config.enabled ?? false,
      timeout: config.timeout || 5000,
      retryAttempts: config.retryAttempts || 2
    };

    if (this.config.enabled) {
      this.startHealthChecks();
    }
  }

  private async startHealthChecks(): Promise<void> {
    // Initial health check
    await this.checkHealth();

    // Periodic health checks every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.checkHealth();
    }, 30000);
  }

  private async checkHealth(): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      this.isHealthy = response.ok;
      
      if (this.isHealthy) {
        logger.info('[DualWrite] Employee Core service is healthy');
      } else {
        logger.warn('[DualWrite] Employee Core service health check failed');
      }
    } catch (error: any) {
      this.isHealthy = false;
      logger.warn('[DualWrite] Employee Core service unreachable:', error.message);
    }
  }

  public async login(credentials: {
    username?: string;
    email?: string;
    password: string;
  }): Promise<any> {
    if (!this.config.enabled || !this.isHealthy) {
      return null;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (response.ok) {
        const data = await response.json();
        logger.info('[DualWrite] Login successful via Employee Core');
        return data;
      } else {
        logger.warn('[DualWrite] Login failed via Employee Core:', response.status);
        return null;
      }
    } catch (error: any) {
      logger.error('[DualWrite] Error calling Employee Core login:', error.message);
      return null;
    }
  }

  public async createUser(userData: any): Promise<any> {
    if (!this.config.enabled || !this.isHealthy) {
      return null;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/employees`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Internal-Service': 'monolith' // Internal service header
        },
        body: JSON.stringify(userData),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (response.ok) {
        const data = await response.json();
        logger.info('[DualWrite] User created in Employee Core:', data.id);
        return data;
      } else {
        logger.warn('[DualWrite] User creation failed in Employee Core:', response.status);
        return null;
      }
    } catch (error: any) {
      logger.error('[DualWrite] Error creating user in Employee Core:', error.message);
      return null;
    }
  }

  public async updateUser(userId: number, updates: any): Promise<any> {
    if (!this.config.enabled || !this.isHealthy) {
      return null;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/employees/${userId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Internal-Service': 'monolith'
        },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (response.ok) {
        const data = await response.json();
        logger.info('[DualWrite] User updated in Employee Core:', userId);
        return data;
      } else {
        logger.warn('[DualWrite] User update failed in Employee Core:', response.status);
        return null;
      }
    } catch (error: any) {
      logger.error('[DualWrite] Error updating user in Employee Core:', error.message);
      return null;
    }
  }

  public async deleteUser(userId: number): Promise<boolean> {
    if (!this.config.enabled || !this.isHealthy) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/employees/${userId}`, {
        method: 'DELETE',
        headers: { 'X-Internal-Service': 'monolith' },
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (response.ok) {
        logger.info('[DualWrite] User deleted in Employee Core:', userId);
        return true;
      } else {
        logger.warn('[DualWrite] User deletion failed in Employee Core:', response.status);
        return false;
      }
    } catch (error: any) {
      logger.error('[DualWrite] Error deleting user in Employee Core:', error.message);
      return false;
    }
  }

  public async changePassword(userId: number, newPassword: string): Promise<boolean> {
    if (!this.config.enabled || !this.isHealthy) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Internal-Service': 'monolith'
        },
        body: JSON.stringify({ userId, newPassword }),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (response.ok) {
        logger.info('[DualWrite] Password changed in Employee Core for user:', userId);
        return true;
      } else {
        logger.warn('[DualWrite] Password change failed in Employee Core:', response.status);
        return false;
      }
    } catch (error: any) {
      logger.error('[DualWrite] Error changing password in Employee Core:', error.message);
      return false;
    }
  }

  public async getUsers(filters: {
    organization_id: number;
    limit?: number;
    page?: number;
    department?: string;
    search?: string;
  }): Promise<any[] | null> {
    if (!this.config.enabled || !this.isHealthy) {
      return null;
    }

    try {
      const queryParams = new URLSearchParams();
      if (filters.organization_id) queryParams.set('organization_id', filters.organization_id.toString());
      if (filters.limit) queryParams.set('limit', filters.limit.toString());
      if (filters.page) queryParams.set('page', filters.page.toString());
      if (filters.department) queryParams.set('department', filters.department);
      if (filters.search) queryParams.set('search', filters.search);

      const response = await fetch(`${this.config.baseUrl}/api/v1/employees?${queryParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (response.ok) {
        const data = await response.json();
        logger.info(`[DualWrite] Retrieved ${data?.users?.length || 0} users from Employee Core`);
        return data?.users || data || [];
      } else {
        logger.warn('[DualWrite] Failed to get users from Employee Core:', response.status);
        return null;
      }
    } catch (error: any) {
      logger.error('[DualWrite] Error getting users from Employee Core:', error.message);
      return null;
    }
  }

  public getStatus(): { enabled: boolean; healthy: boolean; url: string } {
    return {
      enabled: this.config.enabled,
      healthy: this.isHealthy,
      url: this.config.baseUrl
    };
  }

  public shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Singleton instance
export const employeeCoreProxy = new EmployeeCoreProxy({
  baseUrl: process.env.EMPLOYEE_CORE_URL || 'http://localhost:3001',
  enabled: process.env.ENABLE_EMPLOYEE_CORE_DUAL_WRITE === 'true',
  timeout: parseInt(process.env.EMPLOYEE_CORE_TIMEOUT || '5000'),
  retryAttempts: parseInt(process.env.EMPLOYEE_CORE_RETRY_ATTEMPTS || '2')
});