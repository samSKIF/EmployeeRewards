
import { Client } from '@elastic/elasticsearch';

if (!process.env.ELASTICSEARCH_URL) {
  throw new Error(
    "ELASTICSEARCH_URL must be set for audit logging",
  );
}

class ElasticsearchLogger {
  private static instance: ElasticsearchLogger;
  private client: Client;

  private constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL!,
      auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
      } : undefined,
    });
  }

  public static getInstance(): ElasticsearchLogger {
    if (!ElasticsearchLogger.instance) {
      ElasticsearchLogger.instance = new ElasticsearchLogger();
    }
    return ElasticsearchLogger.instance;
  }

  public async logEvent(index: string, event: any): Promise<void> {
    try {
      await this.client.index({
        index: `audit-${index}-${new Date().toISOString().slice(0, 7)}`, // Monthly indices
        body: {
          ...event,
          timestamp: new Date().toISOString(),
          '@timestamp': new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  public async logUserAction(userId: number, action: string, details: any, organizationId?: number): Promise<void> {
    await this.logEvent('user-actions', {
      userId,
      action,
      details,
      organizationId,
      source: 'application',
    });
  }

  public async logSystemEvent(event: string, details: any, organizationId?: number): Promise<void> {
    await this.logEvent('system-events', {
      event,
      details,
      organizationId,
      source: 'system',
    });
  }

  public async logDataAccess(userId: number, resource: string, action: 'read' | 'write' | 'delete', details: any): Promise<void> {
    await this.logEvent('data-access', {
      userId,
      resource,
      action,
      details,
      source: 'data-access',
    });
  }
}

export const auditLogger = ElasticsearchLogger.getInstance();
