import { Injectable, Logger } from '@nestjs/common';
import { LRUCache } from 'lru-cache';
import { PetSkillProgress } from '../../../algorithms/skill-system';

/**
 * 步骤192: 技能数据缓存机制
 * 提供高效的技能数据缓存，减少数据库查询
 */

interface SkillCacheEntry {
  data: Map<string, PetSkillProgress>;
  version: number;
  lastUpdated: Date;
  hitCount: number;
}

interface SkillStatsCacheEntry {
  data: any;
  version: number;
  lastUpdated: Date;
  ttl: number;
}

@Injectable()
export class SkillsCacheService {
  private readonly logger = new Logger(SkillsCacheService.name);
  
  // 技能进度缓存 - 使用LRU策略，支持频繁访问的技能数据
  private readonly skillProgressCache: LRUCache<string, SkillCacheEntry>;
  
  // 技能统计缓存 - 缓存计算开销较大的统计数据
  private readonly skillStatsCache: LRUCache<string, SkillStatsCacheEntry>;
  
  // 技能定义缓存 - 缓存技能配置数据
  private readonly skillDefinitionsCache: LRUCache<string, any>;
  
  // 缓存版本控制
  private globalCacheVersion = 1;
  
  // 缓存配置
  private readonly cacheConfig = {
    skillProgress: {
      maxSize: 1000,        // 最多缓存1000个宠物的技能数据
      ttl: 30 * 60 * 1000,  // 30分钟TTL
      updateThreshold: 5 * 60 * 1000  // 5分钟更新阈值
    },
    skillStats: {
      maxSize: 500,         // 最多缓存500个统计结果
      ttl: 15 * 60 * 1000,  // 15分钟TTL
      computeThreshold: 10  // 计算阈值
    },
    skillDefinitions: {
      maxSize: 100,         // 技能定义变化不频繁
      ttl: 60 * 60 * 1000   // 1小时TTL
    }
  };

  constructor() {
    // 初始化技能进度缓存
    this.skillProgressCache = new LRUCache({
      max: this.cacheConfig.skillProgress.maxSize,
      ttl: this.cacheConfig.skillProgress.ttl,
      allowStale: true,
      updateAgeOnGet: true,
      noDeleteOnFetchRejection: true
    });

    // 初始化统计缓存
    this.skillStatsCache = new LRUCache({
      max: this.cacheConfig.skillStats.maxSize,
      ttl: this.cacheConfig.skillStats.ttl,
      allowStale: false
    });

    // 初始化定义缓存
    this.skillDefinitionsCache = new LRUCache({
      max: this.cacheConfig.skillDefinitions.maxSize,
      ttl: this.cacheConfig.skillDefinitions.ttl
    });

    this.logger.log('技能缓存服务初始化完成', {
      progressCacheSize: this.cacheConfig.skillProgress.maxSize,
      statsCacheSize: this.cacheConfig.skillStats.maxSize,
      definitionsCacheSize: this.cacheConfig.skillDefinitions.maxSize
    });
  }

  /**
   * 获取宠物技能进度缓存
   */
  getSkillProgress(petId: string): Map<string, PetSkillProgress> | null {
    const cacheKey = `progress:${petId}`;
    const cached = this.skillProgressCache.get(cacheKey);
    
    if (cached) {
      // 更新命中计数
      cached.hitCount++;
      
      // 检查是否需要刷新
      const age = Date.now() - cached.lastUpdated.getTime();
      if (age > this.cacheConfig.skillProgress.updateThreshold) {
        this.logger.debug(`技能进度缓存即将过期: ${petId}, age: ${age}ms`);
        return null; // 返回null触发数据库查询和缓存更新
      }
      
      this.logger.debug(`技能进度缓存命中: ${petId}, hitCount: ${cached.hitCount}`);
      return cached.data;
    }
    
    return null;
  }

  /**
   * 设置宠物技能进度缓存
   */
  setSkillProgress(petId: string, data: Map<string, PetSkillProgress>, version?: number): void {
    const cacheKey = `progress:${petId}`;
    const entry: SkillCacheEntry = {
      data: new Map(data), // 深拷贝避免引用问题
      version: version || this.globalCacheVersion,
      lastUpdated: new Date(),
      hitCount: 0
    };
    
    this.skillProgressCache.set(cacheKey, entry);
    this.logger.debug(`技能进度缓存已更新: ${petId}, skills: ${data.size}`);
  }

  /**
   * 无效化宠物技能进度缓存
   */
  invalidateSkillProgress(petId: string): void {
    const cacheKey = `progress:${petId}`;
    this.skillProgressCache.delete(cacheKey);
    this.logger.debug(`技能进度缓存已无效化: ${petId}`);
  }

  /**
   * 获取技能统计缓存
   */
  getSkillStats(petId: string, type: string): any | null {
    const cacheKey = `stats:${petId}:${type}`;
    const cached = this.skillStatsCache.get(cacheKey);
    
    if (cached) {
      this.logger.debug(`技能统计缓存命中: ${petId}:${type}`);
      return cached.data;
    }
    
    return null;
  }

  /**
   * 设置技能统计缓存
   */
  setSkillStats(petId: string, type: string, data: any, customTtl?: number): void {
    const cacheKey = `stats:${petId}:${type}`;
    const entry: SkillStatsCacheEntry = {
      data,
      version: this.globalCacheVersion,
      lastUpdated: new Date(),
      ttl: customTtl || this.cacheConfig.skillStats.ttl
    };
    
    this.skillStatsCache.set(cacheKey, entry, { ttl: entry.ttl });
    this.logger.debug(`技能统计缓存已更新: ${petId}:${type}`);
  }

  /**
   * 获取技能定义缓存
   */
  getSkillDefinitions(key: string): any | null {
    return this.skillDefinitionsCache.get(key) || null;
  }

  /**
   * 设置技能定义缓存
   */
  setSkillDefinitions(key: string, data: any): void {
    this.skillDefinitionsCache.set(key, data);
    this.logger.debug(`技能定义缓存已更新: ${key}`);
  }

  /**
   * 批量无效化缓存
   */
  invalidateByPetId(petId: string): void {
    // 无效化技能进度
    this.invalidateSkillProgress(petId);
    
    // 无效化相关统计
    for (const key of this.skillStatsCache.keys()) {
      if (key.startsWith(`stats:${petId}:`)) {
        this.skillStatsCache.delete(key);
      }
    }
    
    this.logger.debug(`已无效化宠物相关缓存: ${petId}`);
  }

  /**
   * 预热缓存
   */
  async warmupCache(petIds: string[], skillDataLoader: (petId: string) => Promise<Map<string, PetSkillProgress>>): Promise<void> {
    this.logger.log('开始预热技能缓存', { petCount: petIds.length });
    
    const startTime = Date.now();
    let successCount = 0;
    
    for (const petId of petIds) {
      try {
        const skillData = await skillDataLoader(petId);
        this.setSkillProgress(petId, skillData);
        successCount++;
      } catch (error) {
        this.logger.warn(`预热缓存失败: ${petId}`, error);
      }
    }
    
    const duration = Date.now() - startTime;
    this.logger.log('技能缓存预热完成', {
      successCount,
      totalCount: petIds.length,
      duration: `${duration}ms`,
      hitRate: `${((successCount / petIds.length) * 100).toFixed(2)}%`
    });
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): any {
    return {
      skillProgress: {
        size: this.skillProgressCache.size,
        maxSize: this.cacheConfig.skillProgress.maxSize,
        remainingTTL: this.skillProgressCache.getRemainingTTL(''),
        calculatedSize: this.skillProgressCache.calculatedSize,
      },
      skillStats: {
        size: this.skillStatsCache.size,
        maxSize: this.cacheConfig.skillStats.maxSize,
        calculatedSize: this.skillStatsCache.calculatedSize,
      },
      skillDefinitions: {
        size: this.skillDefinitionsCache.size,
        maxSize: this.cacheConfig.skillDefinitions.maxSize,
        calculatedSize: this.skillDefinitionsCache.calculatedSize,
      },
      globalVersion: this.globalCacheVersion,
      uptime: process.uptime()
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const before = {
      progress: this.skillProgressCache.size,
      stats: this.skillStatsCache.size,
      definitions: this.skillDefinitionsCache.size
    };

    // LRU缓存会自动清理过期项，但我们可以强制清理
    this.skillProgressCache.purgeStale();
    this.skillStatsCache.purgeStale();
    this.skillDefinitionsCache.purgeStale();

    const after = {
      progress: this.skillProgressCache.size,
      stats: this.skillStatsCache.size,
      definitions: this.skillDefinitionsCache.size
    };

    this.logger.debug('缓存清理完成', { before, after });
  }

  /**
   * 清空所有缓存
   */
  clearAll(): void {
    this.skillProgressCache.clear();
    this.skillStatsCache.clear();
    this.skillDefinitionsCache.clear();
    this.globalCacheVersion++;
    
    this.logger.log('所有技能缓存已清空', { newVersion: this.globalCacheVersion });
  }

  /**
   * 获取缓存键的TTL
   */
  getTTL(type: 'progress' | 'stats' | 'definitions', key: string): number {
    switch (type) {
      case 'progress':
        return this.skillProgressCache.getRemainingTTL(`progress:${key}`);
      case 'stats':
        return this.skillStatsCache.getRemainingTTL(`stats:${key}`);
      case 'definitions':
        return this.skillDefinitionsCache.getRemainingTTL(key);
      default:
        return 0;
    }
  }
}