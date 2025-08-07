/**
 * Comprehensive Dual-Write Test
 * Tests the system with 5000 operations to validate performance and reliability
 */

import { dualWriteAdapter } from './dual-write-adapter';
import { migrationPhaseManager } from './migration-phases';
import { logger } from '@shared/logger';
import { eventBus } from '../../services/shared/event-bus';

export interface TestConfig {
  totalOperations: number;
  batchSize: number;
  delayBetweenBatches: number;
  includeFailureSimulation: boolean;
  failureRate: number; // Percentage of operations to simulate as failures
}

export interface TestResults {
  success: boolean;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  duration: number;
  averageResponseTime: number;
  batchResults: BatchResult[];
  finalMetrics: any;
  error?: string;
}

export interface BatchResult {
  batchNumber: number;
  operations: number;
  successes: number;
  failures: number;
  duration: number;
  timestamp: Date;
}

export class DualWriteTestRunner {
  private config: TestConfig;
  private results: TestResults;
  private startTime: number = 0;
  private operationTimes: number[] = [];

  constructor(config?: Partial<TestConfig>) {
    this.config = {
      totalOperations: config?.totalOperations ?? 5000,
      batchSize: config?.batchSize ?? 100,
      delayBetweenBatches: config?.delayBetweenBatches ?? 50,
      includeFailureSimulation: config?.includeFailureSimulation ?? true,
      failureRate: config?.failureRate ?? 2 // 2% failure rate for realistic testing
    };

    this.results = {
      success: false,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      successRate: 0,
      duration: 0,
      averageResponseTime: 0,
      batchResults: [],
      finalMetrics: null
    };

    logger.info('[Test] Dual-write test runner initialized', this.config);
  }

  /**
   * Run the comprehensive test
   */
  public async runTest(): Promise<TestResults> {
    logger.info('🚀 Starting comprehensive dual-write test');
    logger.info(`📊 Configuration: ${this.config.totalOperations} operations in batches of ${this.config.batchSize}`);

    this.startTime = Date.now();
    const initialMetrics = dualWriteAdapter.getStatus().metrics;
    
    try {
      const numBatches = Math.ceil(this.config.totalOperations / this.config.batchSize);
      
      for (let batch = 1; batch <= numBatches; batch++) {
        const operationsInBatch = Math.min(
          this.config.batchSize,
          this.config.totalOperations - (batch - 1) * this.config.batchSize
        );

        const batchResult = await this.runBatch(batch, operationsInBatch);
        this.results.batchResults.push(batchResult);

        // Log progress every 10 batches
        if (batch % 10 === 0 || batch === numBatches) {
          const progress = (batch / numBatches * 100).toFixed(1);
          logger.info(`📈 Progress: ${progress}% (Batch ${batch}/${numBatches})`);
        }

        // Small delay between batches to avoid overwhelming the system
        if (batch < numBatches && this.config.delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches));
        }
      }

      // Calculate final results
      this.calculateResults();
      
      // Get final metrics from adapter
      this.results.finalMetrics = dualWriteAdapter.getStatus().metrics;
      
      logger.info('✅ Comprehensive test completed successfully');
      this.logTestSummary();
      
      // Publish test completion event
      eventBus.publish({
        type: 'dual_write.test_completed',
        source: 'dual-write-test-runner',
        version: '1.0',
        data: {
          results: this.results,
          config: this.config
        }
      });

      this.results.success = true;
      return this.results;

    } catch (error: any) {
      logger.error('❌ Comprehensive test failed:', error);
      this.results.error = error.message;
      this.results.success = false;
      return this.results;
    }
  }

  /**
   * Run a single batch of operations
   */
  private async runBatch(batchNumber: number, operationCount: number): Promise<BatchResult> {
    const batchStart = Date.now();
    let successes = 0;
    let failures = 0;

    const operations = Array.from({ length: operationCount }, (_, i) => 
      this.simulateOperation(batchNumber, i + 1)
    );

    const results = await Promise.allSettled(operations);
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        successes++;
      } else {
        failures++;
      }
    });

    const duration = Date.now() - batchStart;
    
    return {
      batchNumber,
      operations: operationCount,
      successes,
      failures,
      duration,
      timestamp: new Date()
    };
  }

  /**
   * Simulate a dual-write operation
   */
  private async simulateOperation(batch: number, operation: number): Promise<{ success: boolean; time: number }> {
    const operationStart = Date.now();
    
    try {
      // Simulate realistic user data
      const userData = {
        id: `test-user-${batch}-${operation}`,
        username: `user${batch}_${operation}`,
        email: `test${batch}.${operation}@example.com`,
        full_name: `Test User ${batch}-${operation}`,
        department: 'Engineering',
        role: 'employee',
        organization_id: 1
      };

      // Simulate failure rate if configured
      if (this.config.includeFailureSimulation) {
        const shouldFail = Math.random() * 100 < this.config.failureRate;
        if (shouldFail) {
          throw new Error('Simulated failure for testing');
        }
      }

      // Simulate the dual-write operation using handleUserUpdate
      const result = await dualWriteAdapter.handleUserUpdate(
        parseInt(userData.id.replace('test-user-', '').replace('-', '')),
        userData,
        async () => {
          // Simulate primary storage operation
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
          return { success: true, id: userData.id };
        }
      );

      const operationTime = Date.now() - operationStart;
      this.operationTimes.push(operationTime);

      return {
        success: result?.success ?? true,
        time: operationTime
      };

    } catch (error: any) {
      const operationTime = Date.now() - operationStart;
      this.operationTimes.push(operationTime);
      
      return {
        success: false,
        time: operationTime
      };
    }
  }

  /**
   * Calculate final test results
   */
  private calculateResults(): void {
    this.results.totalOperations = this.results.batchResults.reduce(
      (sum, batch) => sum + batch.operations, 0
    );
    
    this.results.successfulOperations = this.results.batchResults.reduce(
      (sum, batch) => sum + batch.successes, 0
    );
    
    this.results.failedOperations = this.results.batchResults.reduce(
      (sum, batch) => sum + batch.failures, 0
    );

    this.results.successRate = this.results.totalOperations > 0
      ? (this.results.successfulOperations / this.results.totalOperations) * 100
      : 0;

    this.results.duration = Date.now() - this.startTime;
    
    this.results.averageResponseTime = this.operationTimes.length > 0
      ? this.operationTimes.reduce((sum, time) => sum + time, 0) / this.operationTimes.length
      : 0;
  }

  /**
   * Log comprehensive test summary
   */
  private logTestSummary(): void {
    logger.info('========================================');
    logger.info('📊 COMPREHENSIVE TEST RESULTS');
    logger.info('========================================');
    logger.info(`⚡ Operations: ${this.results.totalOperations}`);
    logger.info(`✅ Successful: ${this.results.successfulOperations}`);
    logger.info(`❌ Failed: ${this.results.failedOperations}`);
    logger.info(`📈 Success Rate: ${this.results.successRate.toFixed(2)}%`);
    logger.info(`⏱️  Total Duration: ${(this.results.duration / 1000).toFixed(2)}s`);
    logger.info(`🔥 Operations/sec: ${(this.results.totalOperations / (this.results.duration / 1000)).toFixed(2)}`);
    logger.info(`⚖️  Avg Response Time: ${this.results.averageResponseTime.toFixed(2)}ms`);
    logger.info('========================================');
    
    // Performance analysis
    const opsPerSecond = this.results.totalOperations / (this.results.duration / 1000);
    if (opsPerSecond > 100) {
      logger.info('🚀 EXCELLENT: High throughput performance');
    } else if (opsPerSecond > 50) {
      logger.info('✅ GOOD: Acceptable throughput performance');
    } else {
      logger.info('⚠️  WARNING: Low throughput performance');
    }

    if (this.results.successRate >= 99) {
      logger.info('🏆 EXCELLENT: Very high success rate');
    } else if (this.results.successRate >= 95) {
      logger.info('✅ GOOD: High success rate');
    } else if (this.results.successRate >= 90) {
      logger.info('⚠️  WARNING: Moderate success rate');
    } else {
      logger.info('🚨 CRITICAL: Low success rate - investigation required');
    }
  }
}

// Export convenience function
export async function runComprehensiveTest(config?: Partial<TestConfig>): Promise<TestResults> {
  const testRunner = new DualWriteTestRunner(config);
  return await testRunner.runTest();
}