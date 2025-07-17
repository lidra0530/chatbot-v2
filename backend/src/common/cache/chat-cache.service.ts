import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * 聊天缓存服务
 */
@Injectable()
export class ChatCacheService {
  private readonly logger = new Logger(ChatCacheService.name);
  
  // 内存缓存存储（生产环境建议使用Redis）
  private cache = new Map<string, {
    data: any;
    timestamp: number;
    ttl: number;
    hitCount: number;
  }>();
  
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
  };

  constructor() {
    // 每分钟清理过期缓存
    setInterval(() => this.cleanupExpiredCache(), 60000);
  }

  /**
   * 生成相似问题的缓存键
   */
  generateSimilarQuestionKey(message: string, petId: string): string {
    // 简化消息内容，移除标点符号和空格
    const normalizedMessage = message
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
      .toLowerCase()
      .substring(0, 50); // 限制长度
    
    return `similar_q:${petId}:${createHash('md5').update(normalizedMessage).digest('hex')}`;
  }

  /**
   * 生成个性化Prompt缓存键
   */
  generatePersonalityPromptKey(petId: string, personalityHash: string): string {
    return `personality_prompt:${petId}:${personalityHash}`;
  }

  /**
   * 生成对话上下文缓存键
   */
  generateConversationContextKey(conversationId: string): string {
    return `conversation_context:${conversationId}`;
  }

  /**
   * 设置缓存
   */
  set(key: string, data: any, ttl: number = 300000): void { // 默认5分钟TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hitCount: 0,
    });
    
    this.stats.sets++;
    this.logger.debug(`Cache set: ${key}, TTL: ${ttl}ms`);
  }

  /**
   * 获取缓存
   */
  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.stats.misses++;
      this.logger.debug(`Cache miss: ${key}`);
      return null;
    }
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      this.logger.debug(`Cache expired: ${key}`);
      return null;
    }
    
    // 更新命中次数
    cached.hitCount++;
    this.stats.hits++;
    this.logger.debug(`Cache hit: ${key}, hit count: ${cached.hitCount}`);
    
    return cached.data;
  }

  /**
   * 检查缓存是否存在且未过期
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    
    if (!cached) return false;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      this.stats.evictions++;
      return false;
    }
    
    return true;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * 清除指定前缀的缓存
   */
  clearByPrefix(prefix: string): number {
    let cleared = 0;
    
    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    this.logger.debug(`Cleared ${cleared} cache entries with prefix: ${prefix}`);
    return cleared;
  }

  /**
   * 获取缓存统计
   */
  getStats(): any {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      total,
      hitRate: Math.round(hitRate * 100) / 100,
      cacheSize: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * 重置缓存统计
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
    };
    
    this.logger.log('Cache stats reset');
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cleared all cache (${size} entries)`);
  }

  /**
   * 缓存相似问题答案
   */
  cacheSimilarQuestionAnswer(message: string, petId: string, answer: string): void {
    const key = this.generateSimilarQuestionKey(message, petId);
    this.set(key, {
      message,
      answer,
      petId,
      timestamp: new Date().toISOString(),
    }, 600000); // 10分钟TTL
  }

  /**
   * 获取相似问题答案
   */
  getSimilarQuestionAnswer(message: string, petId: string): any | null {
    const key = this.generateSimilarQuestionKey(message, petId);
    return this.get(key);
  }

  /**
   * 缓存个性化Prompt
   */
  cachePersonalityPrompt(petId: string, personality: any, prompt: string): void {
    const personalityHash = this.hashPersonality(personality);
    const key = this.generatePersonalityPromptKey(petId, personalityHash);
    
    this.set(key, {
      prompt,
      personality,
      petId,
      timestamp: new Date().toISOString(),
    }, 1800000); // 30分钟TTL
  }

  /**
   * 获取个性化Prompt
   */
  getPersonalityPrompt(petId: string, personality: any): string | null {
    const personalityHash = this.hashPersonality(personality);
    const key = this.generatePersonalityPromptKey(petId, personalityHash);
    
    const cached = this.get(key);
    return cached ? cached.prompt : null;
  }

  /**
   * 缓存对话上下文
   */
  cacheConversationContext(conversationId: string, context: any[]): void {
    const key = this.generateConversationContextKey(conversationId);
    this.set(key, {
      context,
      conversationId,
      timestamp: new Date().toISOString(),
    }, 300000); // 5分钟TTL
  }

  /**
   * 获取对话上下文
   */
  getConversationContext(conversationId: string): any[] | null {
    const key = this.generateConversationContextKey(conversationId);
    const cached = this.get(key);
    return cached ? cached.context : null;
  }

  /**
   * 使个性相关缓存失效
   */
  invalidatePersonalityCache(petId: string): void {
    this.clearByPrefix(`personality_prompt:${petId}:`);
    this.clearByPrefix(`similar_q:${petId}:`);
    this.logger.debug(`Invalidated personality cache for pet: ${petId}`);
  }

  /**
   * 使对话相关缓存失效
   */
  invalidateConversationCache(conversationId: string): void {
    this.delete(this.generateConversationContextKey(conversationId));
    this.logger.debug(`Invalidated conversation cache: ${conversationId}`);
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, cached] of this.cache) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
        cleaned++;
        this.stats.evictions++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * 生成个性特质哈希
   */
  private hashPersonality(personality: any): string {
    const traits = personality.traits || personality;
    const traitString = Object.keys(traits)
      .sort()
      .map(key => `${key}:${traits[key]}`)
      .join('|');
    
    return createHash('md5').update(traitString).digest('hex').substring(0, 8);
  }

  /**
   * 估算内存使用量
   */
  private estimateMemoryUsage(): string {
    let totalSize = 0;
    
    for (const [key, value] of this.cache) {
      totalSize += key.length * 2; // UTF-16 encoding
      totalSize += JSON.stringify(value).length * 2;
    }
    
    if (totalSize < 1024) return `${totalSize} bytes`;
    if (totalSize < 1024 * 1024) return `${Math.round(totalSize / 1024)} KB`;
    return `${Math.round(totalSize / (1024 * 1024))} MB`;
  }
}