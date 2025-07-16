import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../common/redis.service';

export interface PersonalityAnalysisCache {
  petId: string;
  analysisData: any;
  timestamp: number;
  ttl: number;
}

export interface EvolutionTrendCache {
  petId: string;
  timeRange: string;
  trends: any[];
  timestamp: number;
}

@Injectable()
export class PersonalityCacheService {
  private readonly logger = new Logger(PersonalityCacheService.name);
  
  // 缓存键前缀
  private readonly CACHE_PREFIXES = {
    PERSONALITY_ANALYSIS: 'personality:analysis:',
    EVOLUTION_HISTORY: 'personality:evolution:',
    EVOLUTION_TRENDS: 'personality:trends:',
    EVOLUTION_STATS: 'personality:stats:',
    BATCH_EVOLUTION: 'personality:batch:',
  };

  // 缓存过期时间（秒）
  private readonly CACHE_TTL = {
    PERSONALITY_ANALYSIS: 300, // 5分钟
    EVOLUTION_HISTORY: 600, // 10分钟
    EVOLUTION_TRENDS: 1800, // 30分钟
    EVOLUTION_STATS: 600, // 10分钟
    BATCH_EVOLUTION: 300, // 5分钟
  };

  constructor(private redisService: RedisService) {}

  /**
   * 步骤115: 个性分析结果的缓存机制
   */
  
  // 个性分析缓存
  async cachePersonalityAnalysis(petId: string, analysisData: any): Promise<void> {
    const key = this.CACHE_PREFIXES.PERSONALITY_ANALYSIS + petId;
    const cacheData: PersonalityAnalysisCache = {
      petId,
      analysisData,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL.PERSONALITY_ANALYSIS,
    };

    await this.redisService.set(key, cacheData, this.CACHE_TTL.PERSONALITY_ANALYSIS);
    this.logger.debug(`Cached personality analysis for pet ${petId}`);
  }

  async getPersonalityAnalysis(petId: string): Promise<any | null> {
    const key = this.CACHE_PREFIXES.PERSONALITY_ANALYSIS + petId;
    const cached = await this.redisService.get<PersonalityAnalysisCache>(key);
    
    if (cached) {
      this.logger.debug(`Retrieved cached personality analysis for pet ${petId}`);
      return cached.analysisData;
    }

    return null;
  }

  // 演化历史缓存
  async cacheEvolutionHistory(petId: string, queryHash: string, historyData: any): Promise<void> {
    const key = `${this.CACHE_PREFIXES.EVOLUTION_HISTORY}${petId}:${queryHash}`;
    await this.redisService.set(key, historyData, this.CACHE_TTL.EVOLUTION_HISTORY);
    this.logger.debug(`Cached evolution history for pet ${petId} with query hash ${queryHash}`);
  }

  async getEvolutionHistory(petId: string, queryHash: string): Promise<any | null> {
    const key = `${this.CACHE_PREFIXES.EVOLUTION_HISTORY}${petId}:${queryHash}`;
    const cached = await this.redisService.get(key);
    
    if (cached) {
      this.logger.debug(`Retrieved cached evolution history for pet ${petId}`);
      return cached;
    }

    return null;
  }

  // 演化趋势缓存
  async cacheEvolutionTrends(petId: string, timeRange: string, trends: any[]): Promise<void> {
    const key = `${this.CACHE_PREFIXES.EVOLUTION_TRENDS}${petId}:${timeRange}`;
    const cacheData: EvolutionTrendCache = {
      petId,
      timeRange,
      trends,
      timestamp: Date.now(),
    };

    await this.redisService.set(key, cacheData, this.CACHE_TTL.EVOLUTION_TRENDS);
    this.logger.debug(`Cached evolution trends for pet ${petId} with time range ${timeRange}`);
  }

  async getEvolutionTrends(petId: string, timeRange: string): Promise<any[] | null> {
    const key = `${this.CACHE_PREFIXES.EVOLUTION_TRENDS}${petId}:${timeRange}`;
    const cached = await this.redisService.get<EvolutionTrendCache>(key);
    
    if (cached) {
      this.logger.debug(`Retrieved cached evolution trends for pet ${petId}`);
      return cached.trends;
    }

    return null;
  }

  // 演化统计缓存
  async cacheEvolutionStats(petId: string, timeRange: string, stats: any): Promise<void> {
    const key = `${this.CACHE_PREFIXES.EVOLUTION_STATS}${petId}:${timeRange}`;
    await this.redisService.set(key, stats, this.CACHE_TTL.EVOLUTION_STATS);
    this.logger.debug(`Cached evolution stats for pet ${petId} with time range ${timeRange}`);
  }

  async getEvolutionStats(petId: string, timeRange: string): Promise<any | null> {
    const key = `${this.CACHE_PREFIXES.EVOLUTION_STATS}${petId}:${timeRange}`;
    const cached = await this.redisService.get(key);
    
    if (cached) {
      this.logger.debug(`Retrieved cached evolution stats for pet ${petId}`);
      return cached;
    }

    return null;
  }

  // 批量演化历史缓存
  async cacheBatchEvolution(petIds: string[], batchData: any): Promise<void> {
    const key = `${this.CACHE_PREFIXES.BATCH_EVOLUTION}${petIds.sort().join(':')}`;
    await this.redisService.set(key, batchData, this.CACHE_TTL.BATCH_EVOLUTION);
    this.logger.debug(`Cached batch evolution for ${petIds.length} pets`);
  }

  async getBatchEvolution(petIds: string[]): Promise<any | null> {
    const key = `${this.CACHE_PREFIXES.BATCH_EVOLUTION}${petIds.sort().join(':')}`;
    const cached = await this.redisService.get(key);
    
    if (cached) {
      this.logger.debug(`Retrieved cached batch evolution for ${petIds.length} pets`);
      return cached;
    }

    return null;
  }

  // 缓存失效方法
  async invalidatePersonalityCache(petId: string): Promise<void> {
    const patterns = [
      `${this.CACHE_PREFIXES.PERSONALITY_ANALYSIS}${petId}`,
      `${this.CACHE_PREFIXES.EVOLUTION_HISTORY}${petId}:*`,
      `${this.CACHE_PREFIXES.EVOLUTION_TRENDS}${petId}:*`,
      `${this.CACHE_PREFIXES.EVOLUTION_STATS}${petId}:*`,
    ];

    for (const pattern of patterns) {
      await this.redisService.flushPattern(pattern);
    }

    this.logger.debug(`Invalidated personality cache for pet ${petId}`);
  }

  async invalidateAllBatchCache(): Promise<void> {
    await this.redisService.flushPattern(`${this.CACHE_PREFIXES.BATCH_EVOLUTION}*`);
    this.logger.debug('Invalidated all batch evolution cache');
  }

  // 生成查询哈希
  generateQueryHash(query: any): string {
    const queryString = JSON.stringify(query, Object.keys(query).sort());
    return Buffer.from(queryString).toString('base64');
  }

  // 缓存统计
  async getCacheStats(): Promise<Record<string, any>> {
    const patterns = Object.values(this.CACHE_PREFIXES);
    const stats: Record<string, any> = {};

    for (const pattern of patterns) {
      const keys = await this.redisService.keys(`${pattern}*`);
      const prefixName = pattern.replace(/:/g, '').toUpperCase();
      stats[prefixName] = {
        count: keys.length,
        keys: keys,
      };
    }

    return stats;
  }

  // 内存缓存备用机制
  private memoryCache = new Map<string, { data: any; expiry: number }>();

  async setMemoryCache(key: string, data: any, ttl: number): Promise<void> {
    const expiry = Date.now() + ttl * 1000;
    this.memoryCache.set(key, { data, expiry });
    
    // 清理过期的内存缓存
    this.cleanupMemoryCache();
  }

  async getMemoryCache(key: string): Promise<any | null> {
    const cached = this.memoryCache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    if (cached) {
      this.memoryCache.delete(key);
    }

    return null;
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expiry <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  // 混合缓存策略（优先Redis，备用内存）
  async getWithFallback(key: string): Promise<any | null> {
    // 首先尝试从Redis获取
    let data = await this.redisService.get(key);
    
    if (data) {
      return data;
    }

    // 如果Redis失败，尝试从内存缓存获取
    data = await this.getMemoryCache(key);
    
    if (data) {
      this.logger.debug(`Retrieved from memory cache fallback for key ${key}`);
      return data;
    }

    return null;
  }

  async setWithFallback(key: string, data: any, ttl: number): Promise<void> {
    // 同时设置Redis和内存缓存
    await Promise.all([
      this.redisService.set(key, data, ttl),
      this.setMemoryCache(key, data, ttl),
    ]);
  }
}