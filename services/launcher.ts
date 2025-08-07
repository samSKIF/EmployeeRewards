#!/usr/bin/env node

/**
 * Microservices Launcher
 * Orchestrates startup of all microservices with health monitoring
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

interface ServiceConfig {
  name: string;
  path: string;
  port: number;
  command: string;
  args: string[];
  env?: Record<string, string>;
  healthCheckUrl?: string;
  dependencies?: string[];
}

class ServiceLauncher extends EventEmitter {
  private services: Map<string, ChildProcess> = new Map();
  private serviceConfigs: ServiceConfig[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setupServices();
    this.setupShutdownHandlers();
  }

  private setupServices(): void {
    this.serviceConfigs = [
      {
        name: 'employee-core',
        path: './employee-core',
        port: 3001,
        command: 'npm',
        args: ['run', 'dev'],
        healthCheckUrl: 'http://localhost:3001/health',
        env: {
          EMPLOYEE_CORE_PORT: '3001',
          DATABASE_URL: process.env.DATABASE_URL || '',
        }
      },
      {
        name: 'api-gateway',
        path: './api-gateway',
        port: 3000,
        command: 'tsx',
        args: ['index.ts'],
        healthCheckUrl: 'http://localhost:3000/health',
        dependencies: ['employee-core'],
        env: {
          GATEWAY_PORT: '3000',
        }
      }
    ];
  }

  private setupShutdownHandlers(): void {
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('exit', () => this.shutdown('exit'));
  }

  async launch(): Promise<void> {
    console.log('🚀 Starting ThrivioHR Microservices...\n');

    // Launch services in dependency order
    for (const config of this.serviceConfigs) {
      await this.launchService(config);
      await this.waitForHealth(config);
    }

    console.log('\n✅ All services started successfully!');
    console.log('📡 API Gateway: http://localhost:3000');
    console.log('🔐 Employee Core: http://localhost:3001');
    
    this.startHealthMonitoring();
  }

  private async launchService(config: ServiceConfig): Promise<void> {
    console.log(`Starting ${config.name}...`);

    const servicePath = path.join(__dirname, config.path);
    
    // Check if service directory exists
    if (!fs.existsSync(servicePath)) {
      console.error(`❌ Service directory not found: ${servicePath}`);
      return;
    }

    const child = spawn(config.command, config.args, {
      cwd: servicePath,
      env: { ...process.env, ...config.env },
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    child.stdout?.on('data', (data) => {
      console.log(`[${config.name}] ${data.toString().trim()}`);
    });

    child.stderr?.on('data', (data) => {
      console.error(`[${config.name}] ERROR: ${data.toString().trim()}`);
    });

    child.on('error', (error) => {
      console.error(`[${config.name}] Failed to start: ${error.message}`);
    });

    child.on('exit', (code, signal) => {
      console.log(`[${config.name}] Exited with code ${code} (signal: ${signal})`);
      this.services.delete(config.name);
      
      // Restart if unexpected exit
      if (code !== 0 && !this.isShuttingDown) {
        console.log(`[${config.name}] Attempting restart in 5 seconds...`);
        setTimeout(() => this.launchService(config), 5000);
      }
    });

    this.services.set(config.name, child);
  }

  private async waitForHealth(config: ServiceConfig, maxAttempts = 30): Promise<void> {
    if (!config.healthCheckUrl) return;

    console.log(`Waiting for ${config.name} to be healthy...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(config.healthCheckUrl);
        if (response.ok) {
          console.log(`✓ ${config.name} is healthy`);
          return;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.warn(`⚠️ ${config.name} health check timed out`);
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const config of this.serviceConfigs) {
        if (config.healthCheckUrl) {
          try {
            const response = await fetch(config.healthCheckUrl);
            if (!response.ok) {
              console.warn(`⚠️ ${config.name} health check failed`);
            }
          } catch (error) {
            console.warn(`⚠️ ${config.name} is unreachable`);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private isShuttingDown = false;
  
  private shutdown(signal: string): void {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log(`\n📛 Shutting down services (${signal})...`);
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Shutdown services in reverse order
    const reverseConfigs = [...this.serviceConfigs].reverse();
    
    for (const config of reverseConfigs) {
      const child = this.services.get(config.name);
      if (child) {
        console.log(`Stopping ${config.name}...`);
        child.kill('SIGTERM');
      }
    }

    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('Force exiting...');
      process.exit(0);
    }, 10000);
  }
}

// Main execution
if (require.main === module) {
  const launcher = new ServiceLauncher();
  
  launcher.launch().catch((error) => {
    console.error('Failed to launch services:', error);
    process.exit(1);
  });
}