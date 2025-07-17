import { Test, TestingModule } from '@nestjs/testing';
import { DistributedLockService, RateLimitService, QueueProcessingService } from '../concurrency-control';
import { RedisService } from '../../../../common/redis.service';

describe('ConcurrencyControl', () => {
  let distributedLockService: DistributedLockService;
  let rateLimitService: RateLimitService;
  let queueProcessingService: QueueProcessingService;
  let redisService: any;

  beforeEach(async () => {
    const mockRedisService = {
      setNX: jest.fn(),
      eval: jest.fn(),
      zadd: jest.fn(),
      zpopmax: jest.fn(),
      zcard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributedLockService,
        RateLimitService,
        QueueProcessingService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    distributedLockService = module.get<DistributedLockService>(DistributedLockService);
    rateLimitService = module.get<RateLimitService>(RateLimitService);
    queueProcessingService = module.get<QueueProcessingService>(QueueProcessingService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DistributedLockService', () => {
    describe('acquireLock', () => {
      it('should successfully acquire a lock', async () => {
        redisService.setNX.mockResolvedValue(true);

        const result = await distributedLockService.acquireLock('test-resource', 'lock-id-123', 30000);

        expect(result).toBe(true);
        expect(redisService.setNX).toHaveBeenCalledWith(
          'personality:lock:test-resource',
          'lock-id-123',
          30
        );
      });

      it('should fail to acquire lock when resource is already locked', async () => {
        redisService.setNX.mockResolvedValue(false);

        const result = await distributedLockService.acquireLock('test-resource', 'lock-id-123', 30000);

        expect(result).toBe(false);
      });

      it('should handle Redis errors gracefully', async () => {
        redisService.setNX.mockRejectedValue(new Error('Redis connection failed'));

        const result = await distributedLockService.acquireLock('test-resource', 'lock-id-123', 30000);

        expect(result).toBe(false);
      });
    });

    describe('releaseLock', () => {
      it('should successfully release a lock', async () => {
        redisService.eval.mockResolvedValue(1);

        const result = await distributedLockService.releaseLock('test-resource', 'lock-id-123');

        expect(result).toBe(true);
        expect(redisService.eval).toHaveBeenCalledWith(
          expect.stringContaining('redis.call("get", KEYS[1])'),
          ['personality:lock:test-resource'],
          ['lock-id-123']
        );
      });

      it('should fail to release lock when not owned', async () => {
        redisService.eval.mockResolvedValue(0);

        const result = await distributedLockService.releaseLock('test-resource', 'lock-id-123');

        expect(result).toBe(false);
      });

      it('should handle Redis errors gracefully', async () => {
        redisService.eval.mockRejectedValue(new Error('Redis connection failed'));

        const result = await distributedLockService.releaseLock('test-resource', 'lock-id-123');

        expect(result).toBe(false);
      });
    });

    describe('acquireLockWithRetry', () => {
      it('should acquire lock on first try', async () => {
        redisService.setNX.mockResolvedValue(true);

        const result = await distributedLockService.acquireLockWithRetry('test-resource', 'lock-id-123', 30000, 5);

        expect(result).toBe(true);
        expect(redisService.setNX).toHaveBeenCalledTimes(1);
      });

      it('should retry and eventually acquire lock', async () => {
        redisService.setNX
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true);

        const result = await distributedLockService.acquireLockWithRetry('test-resource', 'lock-id-123', 30000, 5);

        expect(result).toBe(true);
        expect(redisService.setNX).toHaveBeenCalledTimes(3);
      });

      it('should fail after max retries', async () => {
        redisService.setNX.mockResolvedValue(false);

        const result = await distributedLockService.acquireLockWithRetry('test-resource', 'lock-id-123', 30000, 3);

        expect(result).toBe(false);
        expect(redisService.setNX).toHaveBeenCalledTimes(3);
      });
    });

    describe('executeWithLock', () => {
      it('should execute operation with lock successfully', async () => {
        redisService.setNX.mockResolvedValue(true);
        redisService.eval.mockResolvedValue(1);

        const mockOperation = jest.fn().mockResolvedValue('operation result');

        const result = await distributedLockService.executeWithLock('test-resource', mockOperation);

        expect(result).toBe('operation result');
        expect(mockOperation).toHaveBeenCalled();
        expect(redisService.setNX).toHaveBeenCalled();
        expect(redisService.eval).toHaveBeenCalled(); // Lock release
      });

      it('should fail when cannot acquire lock', async () => {
        redisService.setNX.mockResolvedValue(false);

        const mockOperation = jest.fn();

        await expect(
          distributedLockService.executeWithLock('test-resource', mockOperation)
        ).rejects.toThrow('Failed to acquire lock for resource: test-resource');

        expect(mockOperation).not.toHaveBeenCalled();
      });

      it('should release lock even when operation throws', async () => {
        redisService.setNX.mockResolvedValue(true);
        redisService.eval.mockResolvedValue(1);

        const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));

        await expect(
          distributedLockService.executeWithLock('test-resource', mockOperation)
        ).rejects.toThrow('Operation failed');

        expect(redisService.eval).toHaveBeenCalled(); // Lock should still be released
      });

      it('should handle auto-renewal when enabled', async () => {
        redisService.setNX.mockResolvedValue(true);
        redisService.eval.mockResolvedValue(1);

        const mockOperation = jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'result';
        });

        const result = await distributedLockService.executeWithLock(
          'test-resource',
          mockOperation,
          {
            autoRenew: true,
            renewInterval: 50,
            ttl: 1000
          }
        );

        expect(result).toBe('result');
        expect(mockOperation).toHaveBeenCalled();
      });
    });
  });

  describe('RateLimitService', () => {
    describe('checkRateLimit', () => {
      it('should allow request when under limit', async () => {
        redisService.eval.mockResolvedValue([1, 9, Date.now() + 60000]);

        const result = await rateLimitService.checkRateLimit('test-key', 10, 60000);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9);
        expect(redisService.eval).toHaveBeenCalledWith(
          expect.stringContaining('redis.call'),
          ['personality:ratelimit:test-key'],
          expect.arrayContaining([expect.any(String), expect.any(String), '10', '60000'])
        );
      });

      it('should deny request when over limit', async () => {
        redisService.eval.mockResolvedValue([0, 0, Date.now() + 30000]);

        const result = await rateLimitService.checkRateLimit('test-key', 10, 60000);

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });

      it('should handle Redis errors by allowing request', async () => {
        redisService.eval.mockRejectedValue(new Error('Redis connection failed'));

        const result = await rateLimitService.checkRateLimit('test-key', 10, 60000);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9);
      });
    });

    describe('checkFixedWindowRateLimit', () => {
      it('should allow request in fixed window', async () => {
        redisService.eval.mockResolvedValue([1, 5, Date.now() + 60000]);

        const result = await rateLimitService.checkFixedWindowRateLimit('test-key', 10, 60000);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(5);
      });

      it('should deny request when fixed window exceeded', async () => {
        redisService.eval.mockResolvedValue([0, 0, Date.now() + 60000]);

        const result = await rateLimitService.checkFixedWindowRateLimit('test-key', 10, 60000);

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });

      it('should handle Redis errors by allowing request', async () => {
        redisService.eval.mockRejectedValue(new Error('Redis connection failed'));

        const result = await rateLimitService.checkFixedWindowRateLimit('test-key', 10, 60000);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9);
      });
    });
  });

  describe('QueueProcessingService', () => {
    describe('enqueue', () => {
      it('should successfully enqueue a task', async () => {
        redisService.zadd.mockResolvedValue(1);

        await queueProcessingService.enqueue('test-queue', { data: 'test' }, 5);

        expect(redisService.zadd).toHaveBeenCalledWith(
          'personality:queue:test-queue',
          5,
          expect.stringContaining('"data":"test"')
        );
      });

      it('should handle Redis errors when enqueuing', async () => {
        redisService.zadd.mockRejectedValue(new Error('Redis connection failed'));

        await expect(
          queueProcessingService.enqueue('test-queue', { data: 'test' }, 5)
        ).rejects.toThrow('Redis connection failed');
      });
    });

    describe('dequeue', () => {
      it('should successfully dequeue a task', async () => {
        const taskData = {
          id: 'task-123',
          data: { test: 'data' },
          priority: 5,
          enqueuedAt: Date.now()
        };
        redisService.zpopmax.mockResolvedValue([JSON.stringify(taskData), '5']);

        const result = await queueProcessingService.dequeue('test-queue');

        expect(result).toEqual(taskData);
        expect(redisService.zpopmax).toHaveBeenCalledWith('personality:queue:test-queue');
      });

      it('should return null when queue is empty', async () => {
        redisService.zpopmax.mockResolvedValue([]);

        const result = await queueProcessingService.dequeue('test-queue');

        expect(result).toBeNull();
      });

      it('should handle Redis errors when dequeuing', async () => {
        redisService.zpopmax.mockRejectedValue(new Error('Redis connection failed'));

        await expect(
          queueProcessingService.dequeue('test-queue')
        ).rejects.toThrow('Redis connection failed');
      });
    });

    describe('processBatch', () => {
      it('should process a batch of tasks', async () => {
        const tasks = [
          { id: 'task-1', data: 'data1' },
          { id: 'task-2', data: 'data2' }
        ];

        jest.spyOn(queueProcessingService, 'dequeue')
          .mockResolvedValueOnce(tasks[0])
          .mockResolvedValueOnce(tasks[1])
          .mockResolvedValueOnce(null);

        const mockProcessor = jest.fn().mockResolvedValue(undefined);

        const processedCount = await queueProcessingService.processBatch(
          'test-queue',
          5,
          mockProcessor
        );

        expect(processedCount).toBe(2);
        expect(mockProcessor).toHaveBeenCalledWith(tasks);
      });

      it('should handle concurrent processing detection', async () => {
        // First call should start processing
        jest.spyOn(queueProcessingService, 'dequeue').mockResolvedValue({ id: 'task-1', data: 'data1' });
        const mockProcessor = jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        // Start first batch processing
        const firstPromise = queueProcessingService.processBatch('test-queue', 5, mockProcessor);

        // Try to start second batch processing immediately
        const secondPromise = queueProcessingService.processBatch('test-queue', 5, mockProcessor);

        const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);

        expect(firstResult).toBeGreaterThan(0);
        expect(secondResult).toBe(0); // Should be prevented by concurrent processing detection
      });

      it('should handle processor errors gracefully', async () => {
        jest.spyOn(queueProcessingService, 'dequeue')
          .mockResolvedValueOnce({ id: 'task-1', data: 'data1' })
          .mockResolvedValueOnce(null);

        const mockProcessor = jest.fn().mockRejectedValue(new Error('Processor failed'));

        await expect(
          queueProcessingService.processBatch('test-queue', 5, mockProcessor)
        ).rejects.toThrow('Processor failed');
      });
    });

    describe('getQueueInfo', () => {
      it('should return queue information', async () => {
        redisService.zcard.mockResolvedValue(10);

        const info = await queueProcessingService.getQueueInfo('test-queue');

        expect(info.length).toBe(10);
        expect(info.processing).toBe(false);
        expect(redisService.zcard).toHaveBeenCalledWith('personality:queue:test-queue');
      });

      it('should handle Redis errors when getting queue info', async () => {
        redisService.zcard.mockRejectedValue(new Error('Redis connection failed'));

        const info = await queueProcessingService.getQueueInfo('test-queue');

        expect(info.length).toBe(0);
        expect(info.processing).toBe(false);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle distributed lock with rate limiting', async () => {
      // Setup mocks for successful flow
      redisService.setNX.mockResolvedValue(true);
      redisService.eval
        .mockResolvedValueOnce([1, 9, Date.now() + 60000]) // Rate limit check
        .mockResolvedValueOnce(1); // Lock release

      // Test rate limiting first
      const rateLimitResult = await rateLimitService.checkRateLimit('test-key', 10, 60000);
      expect(rateLimitResult.allowed).toBe(true);

      // Then test distributed lock
      const mockOperation = jest.fn().mockResolvedValue('success');
      const lockResult = await distributedLockService.executeWithLock('test-resource', mockOperation);

      expect(lockResult).toBe('success');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should handle queue processing with distributed locks', async () => {
      // Mock queue operations
      const task = { id: 'task-1', data: 'test-data' };
      redisService.zadd.mockResolvedValue(1);
      redisService.zpopmax.mockResolvedValue([JSON.stringify(task), '5']);

      // Mock lock operations
      redisService.setNX.mockResolvedValue(true);
      redisService.eval.mockResolvedValue(1);

      // Enqueue task
      await queueProcessingService.enqueue('test-queue', task, 5);

      // Process with lock
      const mockProcessor = jest.fn().mockImplementation(async (tasks) => {
        // Simulate processing with lock
        await distributedLockService.executeWithLock('process-lock', async () => {
          return tasks.length;
        });
      });

      jest.spyOn(queueProcessingService, 'dequeue').mockResolvedValue(task);

      const processedCount = await queueProcessingService.processBatch('test-queue', 1, mockProcessor);

      expect(processedCount).toBe(1);
      expect(mockProcessor).toHaveBeenCalled();
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle high-frequency lock operations', async () => {
      redisService.setNX.mockResolvedValue(true);
      redisService.eval.mockResolvedValue(1);

      const operations = Array.from({ length: 100 }, (_, i) => 
        distributedLockService.executeWithLock(`resource-${i % 10}`, async () => i)
      );

      const results = await Promise.all(operations);

      expect(results).toHaveLength(100);
      expect(redisService.setNX).toHaveBeenCalledTimes(100);
      expect(redisService.eval).toHaveBeenCalledTimes(100);
    });

    it('should handle burst rate limiting', async () => {
      let callCount = 0;
      redisService.eval.mockImplementation(() => {
        callCount++;
        if (callCount <= 10) {
          return Promise.resolve([1, 10 - callCount, Date.now() + 60000]);
        } else {
          return Promise.resolve([0, 0, Date.now() + 60000]);
        }
      });

      const requests = Array.from({ length: 15 }, () =>
        rateLimitService.checkRateLimit('burst-test', 10, 60000)
      );

      const results = await Promise.all(requests);

      const allowedCount = results.filter(r => r.allowed).length;
      const deniedCount = results.filter(r => !r.allowed).length;

      expect(allowedCount).toBe(10);
      expect(deniedCount).toBe(5);
    });
  });
});