import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../common/redis.service';
import { PersonalityLogger } from './personality-logger';

/**
 * 分布式锁服务
 */
@Injectable()
export class DistributedLockService {
  private readonly logger: PersonalityLogger;
  private readonly lockTTL = 30000; // 30秒默认锁超时
  private readonly retryDelay = 100; // 100ms重试间隔
  private readonly maxRetries = 50; // 最大重试次数

  constructor(private readonly redisService: RedisService) {
    this.logger = new PersonalityLogger('DistributedLock');
  }

  /**
   * 获取分布式锁
   */
  async acquireLock(
    resource: string, 
    lockId: string,
    ttl: number = this.lockTTL
  ): Promise<boolean> {
    const lockKey = `personality:lock:${resource}`;
    const startTime = Date.now();

    try {
      this.logger.logTrace('acquireLock', 'start', {
        step: 'attempting_lock_acquisition',
        lockKey,
        lockId,
        ttl
      });

      // 使用Redis SET NX EX命令实现分布式锁
      const result = await this.redisService.setNX(lockKey, lockId, Math.floor(ttl / 1000));
      
      const duration = Date.now() - startTime;
      
      if (result) {
        this.logger.logBusiness('log', 'Lock acquired', {
          operation: 'acquireLock',
          businessData: {
            resource,
            lockId,
            ttl,
            duration
          }
        });
        return true;
      } else {
        this.logger.logBusiness('warn', 'Lock acquisition failed', {
          operation: 'acquireLock',
          businessData: {
            resource,
            lockId,
            ttl,
            duration,
            reason: 'resource_already_locked'
          }
        });
        return false;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logBusiness('error', 'Lock acquisition error', {
        operation: 'acquireLock',
        businessData: {
          resource,
          lockId,
          ttl,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return false;
    }
  }

  /**
   * 释放分布式锁
   */
  async releaseLock(resource: string, lockId: string): Promise<boolean> {
    const lockKey = `personality:lock:${resource}`;
    const startTime = Date.now();

    try {
      this.logger.logTrace('releaseLock', 'start', {
        step: 'attempting_lock_release',
        lockKey,
        lockId
      });

      // 使用Lua脚本确保只有锁的持有者才能释放锁
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redisService.eval(luaScript, [lockKey], [lockId]);
      const duration = Date.now() - startTime;
      
      if (result === 1) {
        this.logger.logBusiness('log', 'Lock released', {
          operation: 'releaseLock',
          businessData: {
            resource,
            lockId,
            duration
          }
        });
        return true;
      } else {
        this.logger.logBusiness('warn', 'Lock release failed', {
          operation: 'releaseLock',
          businessData: {
            resource,
            lockId,
            duration,
            reason: 'lock_not_owned_or_expired'
          }
        });
        return false;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logBusiness('error', 'Lock release error', {
        operation: 'releaseLock',
        businessData: {
          resource,
          lockId,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return false;
    }
  }

  /**
   * 带重试的锁获取
   */
  async acquireLockWithRetry(
    resource: string,
    lockId: string,
    ttl: number = this.lockTTL,
    maxRetries: number = this.maxRetries
  ): Promise<boolean> {
    let retries = 0;
    const startTime = Date.now();

    this.logger.logTrace('acquireLockWithRetry', 'start', {
      step: 'retry_lock_acquisition_start',
      resource,
      lockId,
      maxRetries
    });

    while (retries < maxRetries) {
      const acquired = await this.acquireLock(resource, lockId, ttl);
      
      if (acquired) {
        const duration = Date.now() - startTime;
        this.logger.logPerformance('acquireLockWithRetry', duration, {
          success: true,
          businessData: {
            resource,
            lockId,
            retriesUsed: retries
          }
        });
        return true;
      }

      retries++;
      
      this.logger.logTrace('acquireLockWithRetry', 'progress', {
        step: 'retry_attempt',
        progress: Math.round((retries / maxRetries) * 100),
        currentRetry: retries,
        maxRetries
      });

      if (retries < maxRetries) {
        await this.sleep(this.retryDelay);
      }
    }

    const duration = Date.now() - startTime;
    this.logger.logPerformance('acquireLockWithRetry', duration, {
      success: false,
      businessData: {
        resource,
        lockId,
        retriesUsed: retries,
        reason: 'max_retries_exceeded'
      }
    });

    return false;
  }

  /**
   * 自动续期锁
   */
  async renewLock(resource: string, lockId: string, ttl: number = this.lockTTL): Promise<boolean> {
    const lockKey = `personality:lock:${resource}`;

    try {
      // 使用Lua脚本原子性地检查并续期锁
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("expire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await this.redisService.eval(luaScript, [lockKey], [lockId, Math.floor(ttl / 1000).toString()]);
      
      if (result === 1) {
        this.logger.logBusiness('debug', 'Lock renewed', {
          operation: 'renewLock',
          businessData: { resource, lockId, ttl }
        });
        return true;
      } else {
        this.logger.logBusiness('warn', 'Lock renewal failed', {
          operation: 'renewLock',
          businessData: { 
            resource, 
            lockId, 
            ttl,
            reason: 'lock_not_owned_or_expired'
          }
        });
        return false;
      }
    } catch (error) {
      this.logger.logBusiness('error', 'Lock renewal error', {
        operation: 'renewLock',
        businessData: {
          resource,
          lockId,
          ttl,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return false;
    }
  }

  /**
   * 执行带锁的操作
   */
  async executeWithLock<T>(
    resource: string,
    operation: () => Promise<T>,
    options?: {
      lockId?: string;
      ttl?: number;
      maxRetries?: number;
      autoRenew?: boolean;
      renewInterval?: number;
    }
  ): Promise<T> {
    const {
      lockId = `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      ttl = this.lockTTL,
      maxRetries = this.maxRetries,
      autoRenew = false,
      renewInterval = Math.floor(ttl * 0.7) // 70% of TTL
    } = options || {};

    const startTime = Date.now();
    let renewalTimer: NodeJS.Timeout | null = null;

    this.logger.logTrace('executeWithLock', 'start', {
      step: 'lock_operation_start',
      resource,
      lockId,
      autoRenew
    });

    // 获取锁
    const lockAcquired = await this.acquireLockWithRetry(resource, lockId, ttl, maxRetries);
    
    if (!lockAcquired) {
      throw new Error(`Failed to acquire lock for resource: ${resource}`);
    }

    try {
      // 设置自动续期
      if (autoRenew) {
        renewalTimer = setInterval(async () => {
          await this.renewLock(resource, lockId, ttl);
        }, renewInterval);
      }

      // 执行操作
      const result = await operation();
      
      const duration = Date.now() - startTime;
      this.logger.logPerformance('executeWithLock', duration, {
        success: true,
        businessData: {
          resource,
          lockId,
          autoRenew,
          operationCompleted: true
        }
      });

      return result;
    } finally {
      // 清理续期定时器
      if (renewalTimer) {
        clearInterval(renewalTimer);
      }

      // 释放锁
      await this.releaseLock(resource, lockId);
      
      this.logger.logTrace('executeWithLock', 'complete', {
        step: 'lock_operation_complete',
        resource,
        lockId,
        totalDuration: Date.now() - startTime
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 限流控制服务
 */
@Injectable()
export class RateLimitService {
  private readonly logger: PersonalityLogger;

  constructor(private readonly redisService: RedisService) {
    this.logger = new PersonalityLogger('RateLimit');
  }

  /**
   * 滑动窗口限流
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const startTime = Date.now();
    const now = Date.now();
    const windowStart = now - windowMs;
    const rateLimitKey = `personality:ratelimit:${key}`;

    try {
      // 使用Lua脚本实现原子性的滑动窗口限流
      const luaScript = `
        local key = KEYS[1]
        local window_start = ARGV[1]
        local now = ARGV[2]
        local limit = tonumber(ARGV[3])
        local window_ms = tonumber(ARGV[4])
        
        -- 移除过期的记录
        redis.call('zremrangebyscore', key, 0, window_start)
        
        -- 获取当前窗口内的请求数
        local current_count = redis.call('zcard', key)
        
        if current_count < limit then
          -- 添加当前请求
          redis.call('zadd', key, now, now)
          redis.call('expire', key, math.ceil(window_ms / 1000))
          return {1, limit - current_count - 1, now + window_ms}
        else
          -- 超出限制
          local oldest = redis.call('zrange', key, 0, 0, 'WITHSCORES')
          local reset_time = now + window_ms
          if #oldest > 0 then
            reset_time = oldest[2] + window_ms
          end
          return {0, 0, reset_time}
        end
      `;

      const result = await this.redisService.eval(
        luaScript,
        [rateLimitKey],
        [windowStart.toString(), now.toString(), limit.toString(), windowMs.toString()]
      );

      const [allowed, remaining, resetTime] = result as [number, number, number];
      const duration = Date.now() - startTime;

      this.logger.logBusiness(allowed ? 'debug' : 'warn', 'Rate limit check', {
        operation: 'checkRateLimit',
        businessData: {
          key,
          limit,
          windowMs,
          allowed: !!allowed,
          remaining,
          resetTime,
          duration
        }
      });

      return {
        allowed: !!allowed,
        remaining,
        resetTime
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logBusiness('error', 'Rate limit check error', {
        operation: 'checkRateLimit',
        businessData: {
          key,
          limit,
          windowMs,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      // 在错误情况下允许请求通过
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: Date.now() + windowMs
      };
    }
  }

  /**
   * 固定窗口限流
   */
  async checkFixedWindowRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const rateLimitKey = `personality:fixedlimit:${key}:${windowStart}`;

    try {
      const luaScript = `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local ttl = tonumber(ARGV[2])
        local reset_time = tonumber(ARGV[3])
        
        local current = redis.call('get', key)
        if current == false then
          current = 0
        else
          current = tonumber(current)
        end
        
        if current < limit then
          local new_count = redis.call('incr', key)
          redis.call('expire', key, ttl)
          return {1, limit - new_count, reset_time}
        else
          return {0, 0, reset_time}
        end
      `;

      const ttl = Math.ceil(windowMs / 1000);
      const resetTime = windowStart + windowMs;
      
      const result = await this.redisService.eval(
        luaScript,
        [rateLimitKey],
        [limit.toString(), ttl.toString(), resetTime.toString()]
      );

      const [allowed, remaining, resetTimeResult] = result as [number, number, number];

      this.logger.logBusiness(allowed ? 'debug' : 'warn', 'Fixed window rate limit check', {
        operation: 'checkFixedWindowRateLimit',
        businessData: {
          key,
          limit,
          windowMs,
          allowed: !!allowed,
          remaining,
          resetTime: resetTimeResult
        }
      });

      return {
        allowed: !!allowed,
        remaining,
        resetTime: resetTimeResult
      };
    } catch (error) {
      this.logger.logBusiness('error', 'Fixed window rate limit error', {
        operation: 'checkFixedWindowRateLimit',
        businessData: {
          key,
          limit,
          windowMs,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: windowStart + windowMs
      };
    }
  }
}

/**
 * 队列处理服务
 */
@Injectable()
export class QueueProcessingService {
  private readonly logger: PersonalityLogger;
  private readonly processingQueues = new Map<string, boolean>();

  constructor(private readonly redisService: RedisService) {
    this.logger = new PersonalityLogger('QueueProcessing');
  }

  /**
   * 添加任务到队列
   */
  async enqueue(queueName: string, task: any, priority: number = 0): Promise<void> {
    const queueKey = `personality:queue:${queueName}`;
    const taskData = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      data: task,
      priority,
      enqueuedAt: Date.now()
    };

    try {
      // 使用有序集合实现优先级队列
      await this.redisService.zadd(queueKey, priority, JSON.stringify(taskData));
      
      this.logger.logBusiness('debug', 'Task enqueued', {
        operation: 'enqueue',
        businessData: {
          queueName,
          taskId: taskData.id,
          priority,
          queueKey
        }
      });
    } catch (error) {
      this.logger.logBusiness('error', 'Enqueue error', {
        operation: 'enqueue',
        businessData: {
          queueName,
          priority,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * 从队列获取任务
   */
  async dequeue(queueName: string): Promise<any | null> {
    const queueKey = `personality:queue:${queueName}`;

    try {
      // 获取最高优先级的任务
      const result = await this.redisService.zpopmax(queueKey);
      
      if (result && result.length >= 2) {
        const taskData = JSON.parse(result[0]);
        
        this.logger.logBusiness('debug', 'Task dequeued', {
          operation: 'dequeue',
          businessData: {
            queueName,
            taskId: taskData.id,
            priority: result[1],
            queuedDuration: Date.now() - taskData.enqueuedAt
          }
        });
        
        return taskData;
      }
      
      return null;
    } catch (error) {
      this.logger.logBusiness('error', 'Dequeue error', {
        operation: 'dequeue',
        businessData: {
          queueName,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * 批量处理队列任务
   */
  async processBatch(
    queueName: string,
    batchSize: number,
    processor: (tasks: any[]) => Promise<void>
  ): Promise<number> {
    if (this.processingQueues.get(queueName)) {
      this.logger.logBusiness('warn', 'Queue already being processed', {
        operation: 'processBatch',
        businessData: { queueName, reason: 'concurrent_processing_detected' }
      });
      return 0;
    }

    this.processingQueues.set(queueName, true);
    const startTime = Date.now();
    let processedCount = 0;

    try {
      this.logger.logTrace('processBatch', 'start', {
        step: 'batch_processing_start',
        queueName,
        batchSize
      });

      const tasks: any[] = [];
      
      // 获取一批任务
      for (let i = 0; i < batchSize; i++) {
        const task = await this.dequeue(queueName);
        if (task) {
          tasks.push(task);
        } else {
          break; // 队列为空
        }
      }

      if (tasks.length > 0) {
        // 处理任务批次
        await processor(tasks);
        processedCount = tasks.length;

        this.logger.logBatch('processBatch', {
          itemCount: tasks.length,
          successCount: tasks.length,
          failureCount: 0,
          duration: Date.now() - startTime,
          batchSize
        });
      }

      return processedCount;
    } catch (error) {
      this.logger.logBusiness('error', 'Batch processing error', {
        operation: 'processBatch',
        businessData: {
          queueName,
          batchSize,
          processedCount,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    } finally {
      this.processingQueues.set(queueName, false);
      
      this.logger.logTrace('processBatch', 'complete', {
        step: 'batch_processing_complete',
        queueName,
        processedCount,
        totalDuration: Date.now() - startTime
      });
    }
  }

  /**
   * 获取队列信息
   */
  async getQueueInfo(queueName: string): Promise<{
    length: number;
    processing: boolean;
  }> {
    const queueKey = `personality:queue:${queueName}`;
    
    try {
      const length = await this.redisService.zcard(queueKey);
      const processing = this.processingQueues.get(queueName) || false;
      
      return { length, processing };
    } catch (error) {
      this.logger.logBusiness('error', 'Queue info error', {
        operation: 'getQueueInfo',
        businessData: {
          queueName,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return { length: 0, processing: false };
    }
  }
}