/**
 * Script to run comprehensive dual-write test
 * Tests the system with 5000 operations under load
 */

import { runComprehensiveTest } from './dual-write/comprehensive-test';
import { logger } from '@platform/sdk';

async function main() {
  logger.info('========================================');
  logger.info('🧪 COMPREHENSIVE DUAL-WRITE TEST');
  logger.info('========================================');
  logger.info('Starting comprehensive test with 5000 operations...');
  logger.info('This will test system performance and reliability.\n');

  const result = await runComprehensiveTest({
    totalOperations: 5000,
    batchSize: 100,
    delayBetweenBatches: 50,
    includeFailureSimulation: true,
    failureRate: 2
  });

  if (result.success) {
    logger.info('========================================');
    logger.info('✅ COMPREHENSIVE TEST COMPLETE');
    logger.info('========================================');
    logger.info(`⚡ Total Operations: ${result.totalOperations}`);
    logger.info(`✅ Successful: ${result.successfulOperations}`);
    logger.info(`❌ Failed: ${result.failedOperations}`);
    logger.info(`📈 Success Rate: ${result.successRate.toFixed(2)}%`);
    logger.info(`⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
    logger.info(`🔥 Operations/sec: ${(result.totalOperations / (result.duration / 1000)).toFixed(2)}`);
    logger.info(`⚖️  Avg Response: ${result.averageResponseTime.toFixed(2)}ms`);
    
    if (result.finalMetrics) {
      logger.info('\n📊 Final System Metrics:');
      logger.info(`   Total Writes: ${result.finalMetrics.totalWrites}`);
      logger.info(`   Successful Dual Writes: ${result.finalMetrics.successfulDualWrites}`);
      logger.info(`   Failed Dual Writes: ${result.finalMetrics.failedDualWrites}`);
      const systemSuccessRate = result.finalMetrics.totalWrites > 0 
        ? (result.finalMetrics.successfulDualWrites / result.finalMetrics.totalWrites * 100).toFixed(2)
        : '0';
      logger.info(`   System Success Rate: ${systemSuccessRate}%`);
    }
    
    logger.info('\n🎯 Test Assessment:');
    if (result.successRate >= 98) {
      logger.info('   🏆 EXCELLENT: System performing exceptionally well');
    } else if (result.successRate >= 95) {
      logger.info('   ✅ GOOD: System meeting performance targets');
    } else if (result.successRate >= 90) {
      logger.info('   ⚠️  WARNING: System performance below optimal');
    } else {
      logger.info('   🚨 CRITICAL: System requires immediate attention');
    }
    
  } else {
    logger.error('❌ Comprehensive test failed:', result.error);
  }

  process.exit(0);
}

// Run the test
main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});

export { main as runTest };