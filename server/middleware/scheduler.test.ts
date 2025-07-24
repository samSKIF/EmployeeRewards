import cron from 'node-cron';
import { SchedulerService, scheduleTask, initializeScheduler, JobConfig } from './scheduler';

// Mock node-cron
jest.mock('node-cron');

const mockedCron = cron as jest.Mocked<typeof cron>;

describe('Scheduler Middleware', () => {
  let schedulerService: SchedulerService;

  beforeEach(() => {
    jest.clearAllMocks();
    schedulerService = new SchedulerService();

    // Mock cron.schedule to return a task object
    mockedCron.schedule = jest.fn().mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
      getStatus: jest.fn().mockReturnValue('scheduled'),
    });

    mockedCron.validate = jest.fn().mockReturnValue(true);
  });

  describe('SchedulerService', () => {
    it('should schedule a task successfully', () => {
      const jobConfig: JobConfig = {
        name: 'test-job',
        pattern: '0 9 * * *',
        task: jest.fn(),
        timezone: 'America/New_York',
        runOnInit: false,
      };

      const result = schedulerService.scheduleJob(jobConfig);

      expect(result).toBe(true);
      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 9 * * *',
        expect.any(Function),
        {
          scheduled: true,
          timezone: 'America/New_York',
        }
      );
    });

    it('should validate cron pattern before scheduling', () => {
      mockedCron.validate.mockReturnValue(false);

      const jobConfig: JobConfig = {
        name: 'invalid-job',
        pattern: 'invalid-pattern',
        task: jest.fn(),
      };

      const result = schedulerService.scheduleJob(jobConfig);

      expect(result).toBe(false);
      expect(mockedCron.validate).toHaveBeenCalledWith('invalid-pattern');
      expect(mockedCron.schedule).not.toHaveBeenCalled();
    });

    it('should handle duplicate job names', () => {
      const jobConfig1: JobConfig = {
        name: 'duplicate-job',
        pattern: '0 9 * * *',
        task: jest.fn(),
      };

      const jobConfig2: JobConfig = {
        name: 'duplicate-job',
        pattern: '0 10 * * *',
        task: jest.fn(),
      };

      const result1 = schedulerService.scheduleJob(jobConfig1);
      const result2 = schedulerService.scheduleJob(jobConfig2);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(mockedCron.schedule).toHaveBeenCalledTimes(1);
    });

    it('should stop a scheduled job', () => {
      const mockTask = {
        stop: jest.fn(),
        destroy: jest.fn(),
        start: jest.fn(),
        getStatus: jest.fn(),
      };

      mockedCron.schedule.mockReturnValue(mockTask);

      const jobConfig: JobConfig = {
        name: 'stoppable-job',
        pattern: '0 9 * * *',
        task: jest.fn(),
      };

      schedulerService.scheduleJob(jobConfig);
      const result = schedulerService.stopJob('stoppable-job');

      expect(result).toBe(true);
      expect(mockTask.stop).toHaveBeenCalled();
    });

    it('should return false when stopping non-existent job', () => {
      const result = schedulerService.stopJob('non-existent-job');

      expect(result).toBe(false);
    });

    it('should start a stopped job', () => {
      const mockTask = {
        stop: jest.fn(),
        destroy: jest.fn(),
        start: jest.fn(),
        getStatus: jest.fn(),
      };

      mockedCron.schedule.mockReturnValue(mockTask);

      const jobConfig: JobConfig = {
        name: 'startable-job',
        pattern: '0 9 * * *',
        task: jest.fn(),
      };

      schedulerService.scheduleJob(jobConfig);
      schedulerService.stopJob('startable-job');
      const result = schedulerService.startJob('startable-job');

      expect(result).toBe(true);
      expect(mockTask.start).toHaveBeenCalled();
    });

    it('should destroy a job completely', () => {
      const mockTask = {
        stop: jest.fn(),
        destroy: jest.fn(),
        start: jest.fn(),
        getStatus: jest.fn(),
      };

      mockedCron.schedule.mockReturnValue(mockTask);

      const jobConfig: JobConfig = {
        name: 'destroyable-job',
        pattern: '0 9 * * *',
        task: jest.fn(),
      };

      schedulerService.scheduleJob(jobConfig);
      const result = schedulerService.destroyJob('destroyable-job');

      expect(result).toBe(true);
      expect(mockTask.destroy).toHaveBeenCalled();
    });

    it('should get job status', () => {
      const mockTask = {
        stop: jest.fn(),
        destroy: jest.fn(),
        start: jest.fn(),
        getStatus: jest.fn().mockReturnValue('running'),
      };

      mockedCron.schedule.mockReturnValue(mockTask);

      const jobConfig: JobConfig = {
        name: 'status-job',
        pattern: '0 9 * * *',
        task: jest.fn(),
      };

      schedulerService.scheduleJob(jobConfig);
      const status = schedulerService.getJobStatus('status-job');

      expect(status).toBe('running');
      expect(mockTask.getStatus).toHaveBeenCalled();
    });

    it('should return null for non-existent job status', () => {
      const status = schedulerService.getJobStatus('non-existent-job');

      expect(status).toBeNull();
    });

    it('should list all scheduled jobs', () => {
      const jobConfig1: JobConfig = {
        name: 'job-1',
        pattern: '0 9 * * *',
        task: jest.fn(),
      };

      const jobConfig2: JobConfig = {
        name: 'job-2',
        pattern: '0 10 * * *',
        task: jest.fn(),
      };

      schedulerService.scheduleJob(jobConfig1);
      schedulerService.scheduleJob(jobConfig2);

      const jobs = schedulerService.listJobs();

      expect(jobs).toHaveLength(2);
      expect(jobs).toContain('job-1');
      expect(jobs).toContain('job-2');
    });

    it('should handle timezone-specific scheduling', () => {
      const jobConfig: JobConfig = {
        name: 'timezone-job',
        pattern: '0 9 * * *',
        task: jest.fn(),
        timezone: 'Europe/London',
      };

      schedulerService.scheduleJob(jobConfig);

      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 9 * * *',
        expect.any(Function),
        {
          scheduled: true,
          timezone: 'Europe/London',
        }
      );
    });

    it('should run task immediately if runOnInit is true', () => {
      const taskFunction = jest.fn();
      const jobConfig: JobConfig = {
        name: 'init-job',
        pattern: '0 9 * * *',
        task: taskFunction,
        runOnInit: true,
      };

      schedulerService.scheduleJob(jobConfig);

      expect(taskFunction).toHaveBeenCalled();
    });

    it('should not run task immediately if runOnInit is false', () => {
      const taskFunction = jest.fn();
      const jobConfig: JobConfig = {
        name: 'no-init-job',
        pattern: '0 9 * * *',
        task: taskFunction,
        runOnInit: false,
      };

      schedulerService.scheduleJob(jobConfig);

      expect(taskFunction).not.toHaveBeenCalled();
    });

    it('should handle errors in task execution gracefully', () => {
      const errorTask = jest.fn().mockImplementation(() => {
        throw new Error('Task execution failed');
      });

      const jobConfig: JobConfig = {
        name: 'error-job',
        pattern: '0 9 * * *',
        task: errorTask,
        runOnInit: true,
      };

      // Should not throw error during scheduling
      expect(() => {
        schedulerService.scheduleJob(jobConfig);
      }).not.toThrow();

      expect(errorTask).toHaveBeenCalled();
    });
  });

  describe('scheduleTask utility function', () => {
    it('should schedule a simple task', () => {
      const taskFn = jest.fn();

      scheduleTask('test-task', '0 9 * * *', taskFn);

      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 9 * * *',
        expect.any(Function),
        {
          scheduled: true,
          timezone: undefined,
        }
      );
    });

    it('should schedule task with options', () => {
      const taskFn = jest.fn();

      scheduleTask('test-task-with-options', '0 9 * * *', taskFn, {
        timezone: 'Asia/Tokyo',
        runOnInit: true,
      });

      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 9 * * *',
        expect.any(Function),
        {
          scheduled: true,
          timezone: 'Asia/Tokyo',
        }
      );
    });

    it('should validate pattern before scheduling', () => {
      mockedCron.validate.mockReturnValue(false);
      const taskFn = jest.fn();

      const result = scheduleTask('invalid-task', 'invalid-pattern', taskFn);

      expect(result).toBe(false);
      expect(mockedCron.schedule).not.toHaveBeenCalled();
    });
  });

  describe('initializeScheduler', () => {
    it('should initialize scheduler with predefined jobs', () => {
      const mockJobs = [
        {
          name: 'daily-cleanup',
          pattern: '0 2 * * *',
          task: jest.fn(),
          description: 'Daily database cleanup',
        },
        {
          name: 'weekly-report',
          pattern: '0 9 * * 1',
          task: jest.fn(),
          description: 'Weekly summary report',
        },
      ];

      initializeScheduler(mockJobs);

      expect(mockedCron.schedule).toHaveBeenCalledTimes(2);
    });

    it('should skip invalid jobs during initialization', () => {
      mockedCron.validate
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const mockJobs = [
        {
          name: 'valid-job',
          pattern: '0 9 * * *',
          task: jest.fn(),
        },
        {
          name: 'invalid-job',  
          pattern: 'invalid-pattern',
          task: jest.fn(),
        },
      ];

      initializeScheduler(mockJobs);

      expect(mockedCron.schedule).toHaveBeenCalledTimes(1);
    });

    it('should handle empty job list', () => {
      initializeScheduler([]);

      expect(mockedCron.schedule).not.toHaveBeenCalled();
    });
  });

  describe('Common cron patterns', () => {
    it('should handle daily job pattern', () => {
      const jobConfig: JobConfig = {
        name: 'daily-job',
        pattern: '0 0 * * *', // Every day at midnight
        task: jest.fn(),
      };

      schedulerService.scheduleJob(jobConfig);

      expect(mockedCron.validate).toHaveBeenCalledWith('0 0 * * *');
      expect(mockedCron.schedule).toHaveBeenCalled();
    });

    it('should handle weekly job pattern', () => {
      const jobConfig: JobConfig = {
        name: 'weekly-job',
        pattern: '0 9 * * 1', // Every Monday at 9 AM
        task: jest.fn(),
      };

      schedulerService.scheduleJob(jobConfig);

      expect(mockedCron.validate).toHaveBeenCalledWith('0 9 * * 1');
      expect(mockedCron.schedule).toHaveBeenCalled();
    });

    it('should handle monthly job pattern', () => {
      const jobConfig: JobConfig = {
        name: 'monthly-job',
        pattern: '0 9 1 * *', // First day of every month at 9 AM
        task: jest.fn(),
      };

      schedulerService.scheduleJob(jobConfig);

      expect(mockedCron.validate).toHaveBeenCalledWith('0 9 1 * *');
      expect(mockedCron.schedule).toHaveBeenCalled();
    });

    it('should handle hourly job pattern', () => {
      const jobConfig: JobConfig = {
        name: 'hourly-job',
        pattern: '0 * * * *', // Every hour
        task: jest.fn(),
      };

      schedulerService.scheduleJob(jobConfig);

      expect(mockedCron.validate).toHaveBeenCalledWith('0 * * * *');
      expect(mockedCron.schedule).toHaveBeenCalled();
    });

    it('should handle every 15 minutes pattern', () => {
      const jobConfig: JobConfig = {
        name: 'frequent-job',
        pattern: '*/15 * * * *', // Every 15 minutes
        task: jest.fn(),
      };

      schedulerService.scheduleJob(jobConfig);

      expect(mockedCron.validate).toHaveBeenCalledWith('*/15 * * * *');
      expect(mockedCron.schedule).toHaveBeenCalled();
    });
  });

  describe('Real-world scheduler scenarios', () => {
    it('should handle birthday notification job', () => {
      const birthdayTask = jest.fn();
      const jobConfig: JobConfig = {
        name: 'birthday-notifications',
        pattern: '0 9 * * *', // Daily at 9 AM
        task: birthdayTask,
        description: 'Send birthday notifications',
        runOnInit: false,
      };

      schedulerService.scheduleJob(jobConfig);

      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 9 * * *',
        expect.any(Function),
        expect.objectContaining({
          scheduled: true,
        })
      );
    });

    it('should handle data backup job', () => {
      const backupTask = jest.fn();
      const jobConfig: JobConfig = {
        name: 'daily-backup',
        pattern: '0 2 * * *', // Daily at 2 AM
        task: backupTask,
        description: 'Perform daily database backup',
        timezone: 'UTC',
      };

      schedulerService.scheduleJob(jobConfig);

      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function),
        expect.objectContaining({
          timezone: 'UTC',
        })
      );
    });

    it('should handle weekly report generation', () => {
      const reportTask = jest.fn();
      const jobConfig: JobConfig = {
        name: 'weekly-analytics',
        pattern: '0 8 * * 1', // Every Monday at 8 AM
        task: reportTask,
        description: 'Generate weekly analytics report',
      };

      schedulerService.scheduleJob(jobConfig);

      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 8 * * 1',
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should handle cache cleanup job', () => {
      const cleanupTask = jest.fn();
      const jobConfig: JobConfig = {
        name: 'cache-cleanup',
        pattern: '0 */6 * * *', // Every 6 hours
        task: cleanupTask,
        description: 'Clean expired cache entries',
      };

      schedulerService.scheduleJob(jobConfig);

      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 */6 * * *',
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should handle celebration post generation', () => {
      const celebrationTask = jest.fn();
      const jobConfig: JobConfig = {
        name: 'celebration-posts',
        pattern: '0 6 * * *', // Daily at 6 AM
        task: celebrationTask,
        description: 'Generate celebration posts for birthdays and anniversaries',
        runOnInit: true, // Run on startup too
      };

      schedulerService.scheduleJob(jobConfig);

      expect(celebrationTask).toHaveBeenCalled(); // Should run immediately
      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 6 * * *',
        expect.any(Function),
        expect.any(Object)
      );
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle scheduler service unavailable', () => {
      mockedCron.schedule.mockImplementation(() => {
        throw new Error('Scheduler service unavailable');
      });

      const jobConfig: JobConfig = {
        name: 'failing-job',
        pattern: '0 9 * * *',
        task: jest.fn(),
      };

      expect(() => {
        schedulerService.scheduleJob(jobConfig);
      }).not.toThrow(); // Should handle gracefully
    });

    it('should handle async task functions', async () => {
      const asyncTask = jest.fn().mockResolvedValue('completed');
      const jobConfig: JobConfig = {
        name: 'async-job',
        pattern: '0 9 * * *',
        task: asyncTask,
        runOnInit: true,
      };

      schedulerService.scheduleJob(jobConfig);

      expect(asyncTask).toHaveBeenCalled();
    });

    it('should handle task that takes long time', () => {
      const longRunningTask = jest.fn().mockImplementation(() => {
        // Simulate long-running task
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      const jobConfig: JobConfig = {
        name: 'long-running-job',
        pattern: '0 9 * * *',
        task: longRunningTask,
        runOnInit: true,
      };

      schedulerService.scheduleJob(jobConfig);

      expect(longRunningTask).toHaveBeenCalled();
    });

    it('should handle invalid timezone', () => {
      const jobConfig: JobConfig = {
        name: 'invalid-timezone-job',
        pattern: '0 9 * * *',
        task: jest.fn(),
        timezone: 'Invalid/Timezone',
      };

      const result = schedulerService.scheduleJob(jobConfig);

      // Should still attempt to schedule (cron library will handle invalid timezone)
      expect(result).toBe(true);
      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 9 * * *',
        expect.any(Function),
        expect.objectContaining({
          timezone: 'Invalid/Timezone',
        })
      );
    });

    it('should handle job with undefined task', () => {
      const jobConfig: JobConfig = {
        name: 'undefined-task-job',
        pattern: '0 9 * * *',
        task: undefined as any,
      };

      expect(() => {
        schedulerService.scheduleJob(jobConfig);
      }).not.toThrow();
    });

    it('should handle empty job name', () => {
      const jobConfig: JobConfig = {
        name: '',
        pattern: '0 9 * * *',
        task: jest.fn(),
      };

      const result = schedulerService.scheduleJob(jobConfig);

      expect(result).toBe(false); // Should reject empty names
    });

    it('should handle special characters in job name', () => {
      const jobConfig: JobConfig = {
        name: 'job-with-special-chars-!@#$%',
        pattern: '0 9 * * *',
        task: jest.fn(),
      };

      const result = schedulerService.scheduleJob(jobConfig);

      expect(result).toBe(true);
    });
  });

  describe('Job lifecycle management', () => {
    it('should handle complete job lifecycle', () => {
      const mockTask = {
        stop: jest.fn(),
        destroy: jest.fn(),
        start: jest.fn(),
        getStatus: jest.fn()
          .mockReturnValueOnce('scheduled')
          .mockReturnValueOnce('running')
          .mockReturnValueOnce('stopped'),
      };

      mockedCron.schedule.mockReturnValue(mockTask);

      const jobConfig: JobConfig = {
        name: 'lifecycle-job',
        pattern: '0 9 * * *',
        task: jest.fn(),
      };

      // Schedule
      const scheduleResult = schedulerService.scheduleJob(jobConfig);
      expect(scheduleResult).toBe(true);
      expect(schedulerService.getJobStatus('lifecycle-job')).toBe('scheduled');

      // Start
      const startResult = schedulerService.startJob('lifecycle-job');
      expect(startResult).toBe(true);
      expect(schedulerService.getJobStatus('lifecycle-job')).toBe('running');

      // Stop
      const stopResult = schedulerService.stopJob('lifecycle-job');
      expect(stopResult).toBe(true);
      expect(schedulerService.getJobStatus('lifecycle-job')).toBe('stopped');

      // Destroy
      const destroyResult = schedulerService.destroyJob('lifecycle-job');
      expect(destroyResult).toBe(true);
      expect(schedulerService.getJobStatus('lifecycle-job')).toBeNull();
    });

    it('should handle restarting a job', () => {
      const mockTask = {
        stop: jest.fn(),
        destroy: jest.fn(),
        start: jest.fn(),
        getStatus: jest.fn().mockReturnValue('running'),
      };

      mockedCron.schedule.mockReturnValue(mockTask);

      const jobConfig: JobConfig = {
        name: 'restart-job',
        pattern: '0 9 * * *',
        task: jest.fn(),
      };

      schedulerService.scheduleJob(jobConfig);
      schedulerService.stopJob('restart-job');
      schedulerService.startJob('restart-job');

      expect(mockTask.stop).toHaveBeenCalled();
      expect(mockTask.start).toHaveBeenCalled();
    });

    it('should handle updating job configuration', () => {
      const originalTask = jest.fn();
      const updatedTask = jest.fn();

      const originalConfig: JobConfig = {
        name: 'update-job',
        pattern: '0 9 * * *',
        task: originalTask,
      };

      const updatedConfig: JobConfig = {
        name: 'update-job',
        pattern: '0 10 * * *',
        task: updatedTask,
      };

      // Schedule original
      schedulerService.scheduleJob(originalConfig);
      expect(mockedCron.schedule).toHaveBeenCalledTimes(1);

      // Try to schedule updated (should fail due to duplicate name)
      const updateResult = schedulerService.scheduleJob(updatedConfig);
      expect(updateResult).toBe(false);
      expect(mockedCron.schedule).toHaveBeenCalledTimes(1);

      // Destroy and reschedule
      schedulerService.destroyJob('update-job');
      const rescheduleResult = schedulerService.scheduleJob(updatedConfig);
      expect(rescheduleResult).toBe(true);
      expect(mockedCron.schedule).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance and memory management', () => {
    it('should handle many concurrent jobs', () => {
      const jobCount = 100;
      const jobs = Array.from({ length: jobCount }, (_, i) => ({
        name: `concurrent-job-${i}`,
        pattern: '0 9 * * *',
        task: jest.fn(),
      }));

      jobs.forEach(job => {
        schedulerService.scheduleJob(job);
      });

      expect(mockedCron.schedule).toHaveBeenCalledTimes(jobCount);
      expect(schedulerService.listJobs()).toHaveLength(jobCount);
    });

    it('should cleanup resources on job destruction', () => {
      const mockTask = {
        stop: jest.fn(),
        destroy: jest.fn(),
        start: jest.fn(),
        getStatus: jest.fn(),
      };

      mockedCron.schedule.mockReturnValue(mockTask);

      const jobConfig: JobConfig = {
        name: 'cleanup-job',
        pattern: '0 9 * * *',
        task: jest.fn(),
      };

      schedulerService.scheduleJob(jobConfig);
      expect(schedulerService.listJobs()).toContain('cleanup-job');

      schedulerService.destroyJob('cleanup-job');
      expect(schedulerService.listJobs()).not.toContain('cleanup-job');
      expect(mockTask.destroy).toHaveBeenCalled();
    });

    it('should handle memory-intensive tasks', () => {
      const memoryIntensiveTask = jest.fn().mockImplementation(() => {
        // Simulate memory-intensive operation
        const largeArray = new Array(1000000).fill(0);
        return largeArray.length;
      });

      const jobConfig: JobConfig = {
        name: 'memory-intensive-job',
        pattern: '0 9 * * *',
        task: memoryIntensiveTask,
        runOnInit: true,
      };

      expect(() => {
        schedulerService.scheduleJob(jobConfig);
      }).not.toThrow();

      expect(memoryIntensiveTask).toHaveBeenCalled();
    });
  });

  describe('Integration with other services', () => {
    it('should integrate with database cleanup jobs', () => {
      const dbCleanupTask = jest.fn().mockImplementation(async () => {
        // Simulate database cleanup
        console.log('Cleaning up old records...');
        return { deletedRows: 150 };
      });

      const jobConfig: JobConfig = {
        name: 'db-cleanup',
        pattern: '0 3 * * *', // 3 AM daily
        task: dbCleanupTask,
        description: 'Clean up old database records',
      };

      schedulerService.scheduleJob(jobConfig);

      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 3 * * *',
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should integrate with email notification jobs', () => {
      const emailTask = jest.fn().mockImplementation(async () => {
        // Simulate email sending
        console.log('Sending scheduled emails...');
        return { sentEmails: 25 };
      });

      const jobConfig: JobConfig = {
        name: 'email-notifications',
        pattern: '0 8 * * 1-5', // Weekdays at 8 AM
        task: emailTask,
        description: 'Send scheduled email notifications',
        timezone: 'America/New_York',
      };

      schedulerService.scheduleJob(jobConfig);

      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 8 * * 1-5',
        expect.any(Function),
        expect.objectContaining({
          timezone: 'America/New_York',
        })
      );
    });

    it('should integrate with analytics jobs', () => {
      const analyticsTask = jest.fn().mockImplementation(async () => {
        // Simulate analytics calculation
        console.log('Calculating daily analytics...');
        return { processedEvents: 5000 };
      });

      const jobConfig: JobConfig = {
        name: 'daily-analytics',
        pattern: '0 1 * * *', // 1 AM daily
        task: analyticsTask,
        description: 'Calculate daily analytics',
      };

      schedulerService.scheduleJob(jobConfig);

      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 1 * * *',
        expect.any(Function),
        expect.any(Object)
      );
    });
  });
});