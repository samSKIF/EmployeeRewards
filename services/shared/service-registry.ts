// Service Registry - Service Discovery and Registration
// Manages service locations, health status, and routing information

import { eventBus } from './event-bus';

export interface ServiceInfo {
  name: string;
  version: string;
  url: string;
  port: number;
  healthCheck: string;
  status: 'registering' | 'healthy' | 'unhealthy' | 'degraded' | 'offline';
  lastHealthCheck?: Date;
  metadata?: {
    dependencies?: string[];
    capabilities?: string[];
    environment?: string;
  };
}

export interface ServiceEndpoint {
  path: string;
  methods: string[];
  description?: string;
}

class ServiceRegistry {
  private services: Map<string, ServiceInfo> = new Map();
  private endpoints: Map<string, ServiceEndpoint[]> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for service lifecycle events
    eventBus.subscribe('service.started', async (event) => {
      const { service, port, version } = event.data;
      await this.registerService({
        name: service,
        version,
        port,
        url: `http://localhost:${port}`,
        healthCheck: '/health',
        status: 'registering',
      });
    }, 'service-registry', 1);

    eventBus.subscribe('service.shutting_down', async (event) => {
      const { service } = event.data;
      await this.deregisterService(service);
    }, 'service-registry', 1);

    eventBus.subscribe('service.error', async (event) => {
      const service = this.services.get(event.source);
      if (service) {
        service.status = 'degraded';
        console.log(`[REGISTRY] Service ${event.source} marked as degraded due to error`);
      }
    }, 'service-registry', 2);
  }

  /**
   * Register a new service
   */
  async registerService(serviceInfo: ServiceInfo): Promise<void> {
    console.log(`[REGISTRY] Registering service: ${serviceInfo.name} v${serviceInfo.version}`);
    
    // Store service info
    this.services.set(serviceInfo.name, serviceInfo);
    
    // Start health checks
    this.startHealthChecks(serviceInfo.name);
    
    // Publish registration event
    await eventBus.publish({
      type: 'registry.service_registered',
      version: '1.0',
      source: 'service-registry',
      data: {
        service: serviceInfo.name,
        version: serviceInfo.version,
        url: serviceInfo.url,
        timestamp: new Date().toISOString(),
      },
    });

    // Initial health check
    await this.checkServiceHealth(serviceInfo.name);
  }

  /**
   * Deregister a service
   */
  async deregisterService(serviceName: string): Promise<void> {
    console.log(`[REGISTRY] Deregistering service: ${serviceName}`);
    
    // Stop health checks
    const interval = this.healthCheckIntervals.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(serviceName);
    }
    
    // Update status
    const service = this.services.get(serviceName);
    if (service) {
      service.status = 'offline';
    }
    
    // Publish deregistration event
    await eventBus.publish({
      type: 'registry.service_deregistered',
      version: '1.0',
      source: 'service-registry',
      data: {
        service: serviceName,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Register service endpoints
   */
  registerEndpoints(serviceName: string, endpoints: ServiceEndpoint[]): void {
    this.endpoints.set(serviceName, endpoints);
    console.log(`[REGISTRY] Registered ${endpoints.length} endpoints for ${serviceName}`);
  }

  /**
   * Get service information
   */
  getService(serviceName: string): ServiceInfo | undefined {
    return this.services.get(serviceName);
  }

  /**
   * Get all services
   */
  getAllServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  /**
   * Get healthy services
   */
  getHealthyServices(): ServiceInfo[] {
    return Array.from(this.services.values()).filter(s => s.status === 'healthy');
  }

  /**
   * Get service endpoints
   */
  getServiceEndpoints(serviceName: string): ServiceEndpoint[] {
    return this.endpoints.get(serviceName) || [];
  }

  /**
   * Find service by capability
   */
  findServiceByCapability(capability: string): ServiceInfo | undefined {
    return Array.from(this.services.values()).find(s => 
      s.metadata?.capabilities?.includes(capability)
    );
  }

  /**
   * Get service dependencies
   */
  getServiceDependencies(serviceName: string): string[] {
    const service = this.services.get(serviceName);
    return service?.metadata?.dependencies || [];
  }

  /**
   * Check if all dependencies are healthy
   */
  areDependenciesHealthy(serviceName: string): boolean {
    const dependencies = this.getServiceDependencies(serviceName);
    return dependencies.every(dep => {
      const depService = this.services.get(dep);
      return depService && depService.status === 'healthy';
    });
  }

  /**
   * Start health checks for a service
   */
  private startHealthChecks(serviceName: string): void {
    // Check every 30 seconds
    const interval = setInterval(async () => {
      await this.checkServiceHealth(serviceName);
    }, 30000);
    
    this.healthCheckIntervals.set(serviceName, interval);
  }

  /**
   * Check service health
   */
  private async checkServiceHealth(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) return;

    try {
      // In production, make actual HTTP request
      // const response = await fetch(`${service.url}${service.healthCheck}`);
      // const health = await response.json();
      
      // For now, simulate health check
      const isHealthy = Math.random() > 0.1; // 90% healthy
      
      const previousStatus = service.status;
      service.status = isHealthy ? 'healthy' : 'unhealthy';
      service.lastHealthCheck = new Date();
      
      // Publish status change event if status changed
      if (previousStatus !== service.status) {
        await eventBus.publish({
          type: 'registry.service_status_changed',
          version: '1.0',
          source: 'service-registry',
          data: {
            service: serviceName,
            previousStatus,
            newStatus: service.status,
            timestamp: new Date().toISOString(),
          },
        });
      }
      
      console.log(`[REGISTRY] Health check for ${serviceName}: ${service.status}`);
    } catch (error) {
      service.status = 'unhealthy';
      service.lastHealthCheck = new Date();
      console.error(`[REGISTRY] Health check failed for ${serviceName}:`, error);
    }
  }

  /**
   * Get registry metrics
   */
  getMetrics() {
    const services = Array.from(this.services.values());
    return {
      totalServices: services.length,
      healthyServices: services.filter(s => s.status === 'healthy').length,
      unhealthyServices: services.filter(s => s.status === 'unhealthy').length,
      degradedServices: services.filter(s => s.status === 'degraded').length,
      offlineServices: services.filter(s => s.status === 'offline').length,
      services: services.map(s => ({
        name: s.name,
        status: s.status,
        lastHealthCheck: s.lastHealthCheck,
        uptime: s.lastHealthCheck ? 
          (Date.now() - s.lastHealthCheck.getTime()) / 1000 : 0,
      })),
    };
  }

  /**
   * Service discovery - find best instance of a service
   */
  discover(serviceName: string): ServiceInfo | null {
    const service = this.services.get(serviceName);
    
    if (!service) {
      console.error(`[REGISTRY] Service ${serviceName} not found`);
      return null;
    }
    
    if (service.status !== 'healthy') {
      console.warn(`[REGISTRY] Service ${serviceName} is ${service.status}`);
    }
    
    return service;
  }

  /**
   * Load balancing - get next healthy instance (for future multi-instance support)
   */
  getNextHealthyInstance(serviceName: string): ServiceInfo | null {
    // For now, single instance per service
    // In production, implement round-robin or other algorithms
    const service = this.services.get(serviceName);
    return service && service.status === 'healthy' ? service : null;
  }
}

// Export singleton instance
export const serviceRegistry = new ServiceRegistry();

// Pre-register expected services for migration
const expectedServices = [
  {
    name: 'employee-core',
    version: '1.0.0',
    port: 3001,
    url: 'http://localhost:3001',
    healthCheck: '/health',
    status: 'offline' as const,
    metadata: {
      capabilities: ['authentication', 'user-management', 'departments'],
      dependencies: [],
    },
  },
  {
    name: 'social-engagement',
    version: '1.0.0',
    port: 3002,
    url: 'http://localhost:3002',
    healthCheck: '/health',
    status: 'offline' as const,
    metadata: {
      capabilities: ['posts', 'comments', 'channels', 'interests'],
      dependencies: ['employee-core'],
    },
  },
  {
    name: 'recognition-rewards',
    version: '1.0.0',
    port: 3003,
    url: 'http://localhost:3003',
    healthCheck: '/health',
    status: 'offline' as const,
    metadata: {
      capabilities: ['recognition', 'points', 'badges', 'leaderboards'],
      dependencies: ['employee-core'],
    },
  },
  {
    name: 'hr-operations',
    version: '1.0.0',
    port: 3004,
    url: 'http://localhost:3004',
    healthCheck: '/health',
    status: 'offline' as const,
    metadata: {
      capabilities: ['leave-management', 'performance-reviews'],
      dependencies: ['employee-core'],
    },
  },
];

// Register expected services as offline (will become healthy when started)
expectedServices.forEach(service => {
  serviceRegistry.registerService(service);
});