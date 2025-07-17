import { Injectable, Logger } from '@nestjs/common';

// 临时接口定义，将来会被完整实现替换
export interface LockOptions {
  ttl?: number;
  maxRetries?: number;
  autoRenew?: boolean;
  renewInterval?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * 分布式锁服务 - 临时实现
 * TODO: 在技术债清理阶段实现完整的Redis分布式锁
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly locks = new Map<string, { lockId: string; expiresAt: number }>();

  /**
   * 使用锁执行操作 - 临时内存锁实现
   */
  async executeWithLock<T>(
    resource: string,
    operation: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const { ttl = 30000, maxRetries = 5 } = options;
    
    this.logger.debug(`Attempting to acquire lock for resource: ${resource}`);
    
    // 简单的内存锁实现 - 生产环境需要Redis分布式锁
    let retries = 0;
    while (retries < maxRetries) {
      const lockId = await this.tryAcquireLock(resource, ttl);
      if (lockId) {
        try {
          this.logger.debug(`Lock acquired for resource: ${resource}, lockId: ${lockId}`);
          const result = await operation();
          return result;
        } finally {
          await this.releaseLock(resource, lockId);
          this.logger.debug(`Lock released for resource: ${resource}, lockId: ${lockId}`);
        }
      }
      
      retries++;
      const delay = Math.min(1000 * Math.pow(2, retries), 5000); // 指数退避，最大5秒
      this.logger.warn(`Failed to acquire lock for ${resource}, retry ${retries}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error(`Failed to acquire lock for resource ${resource} after ${maxRetries} retries`);
  }

  /**
   * 尝试获取锁
   */
  private async tryAcquireLock(resource: string, ttl: number): Promise<string | null> {
    const now = Date.now();
    const existing = this.locks.get(resource);
    
    // 检查现有锁是否过期
    if (existing && existing.expiresAt > now) {
      return null; // 锁仍然有效
    }
    
    // 获取新锁
    const lockId = `lock_${now}_${Math.random().toString(36).substring(2)}`;
    this.locks.set(resource, {
      lockId,
      expiresAt: now + ttl
    });
    
    return lockId;
  }

  /**
   * 释放锁
   */
  private async releaseLock(resource: string, lockId: string): Promise<boolean> {
    const existing = this.locks.get(resource);
    if (existing && existing.lockId === lockId) {
      this.locks.delete(resource);
      return true;
    }
    return false;
  }

  /**
   * 清理过期锁 - 定期清理
   */
  // @ts-ignore
  private cleanupExpiredLocks(): void {
    const now = Date.now();
    for (const [resource, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(resource);
        this.logger.debug(`Cleaned up expired lock for resource: ${resource}`);
      }
    }
  }
}

/**
 * 限流服务 - 临时实现
 * TODO: 在技术债清理阶段实现完整的Redis滑动窗口限流
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly windows = new Map<string, { requests: number[]; windowStart: number }>();

  /**
   * 检查限流 - 临时滑动窗口实现
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;
    
    // 获取或创建窗口
    let window = this.windows.get(windowKey);
    if (!window) {
      window = { requests: [], windowStart: Math.floor(now / windowMs) * windowMs };
      this.windows.set(windowKey, window);
    }
    
    // 清理过期的请求记录
    const windowEnd = window.windowStart + windowMs;
    window.requests = window.requests.filter(timestamp => timestamp >= window.windowStart);
    
    // 检查是否超过限制
    if (window.requests.length >= limit) {
      const resetTime = windowEnd;
      const retryAfter = Math.max(0, resetTime - now);
      
      this.logger.warn(`Rate limit exceeded for key: ${key}, limit: ${limit}, window: ${windowMs}ms`);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter
      };
    }
    
    // 记录请求
    window.requests.push(now);
    const remaining = Math.max(0, limit - window.requests.length);
    
    this.logger.debug(`Rate limit check passed for key: ${key}, remaining: ${remaining}`);
    
    return {
      allowed: true,
      remaining,
      resetTime: windowEnd
    };
  }

  /**
   * 清理过期窗口 - 定期清理
   */
  // @ts-ignore
  private cleanupExpiredWindows(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1小时
    
    for (const [key, window] of this.windows.entries()) {
      if (now - window.windowStart > maxAge) {
        this.windows.delete(key);
        this.logger.debug(`Cleaned up expired rate limit window: ${key}`);
      }
    }
  }

  /**
   * 获取限流统计
   */
  async getStats(key: string): Promise<any> {
    const stats = [];
    for (const [windowKey, window] of this.windows.entries()) {
      if (windowKey.startsWith(key)) {
        stats.push({
          window: windowKey,
          requests: window.requests.length,
          windowStart: window.windowStart
        });
      }
    }
    return stats;
  }
}