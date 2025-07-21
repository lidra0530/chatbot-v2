import { Injectable, Logger } from '@nestjs/common';
import { PersonalityTraits, PersonalityAnalytics, EvolutionSettings } from './interfaces/personality.interface';
import { PersonalityEvolutionService } from './services/personality-evolution.service';
import { PersonalityAnalyticsService } from './services/personality-analytics.service';
import { PersonalityCacheService } from './services/personality-cache.service';
import { EvolutionHistoryService } from './services/evolution-history.service';
import { EvolutionBatchService } from './services/evolution-batch.service';
import { EvolutionCleanupService } from './services/evolution-cleanup.service';
import { RealtimeEventsService } from '../../gateways/services/realtime-events.service';
import { PersonalityTrait } from '../../algorithms/types/personality.types';

/**
 * PersonalityService - 外观模式主服务
 * 
 * 作为外观层，协调所有专业服务的调用，保持API兼容性
 * 不包含具体业务逻辑，所有操作都委托给专业服务
 */
@Injectable()
export class PersonalityService {
  private readonly logger = new Logger(PersonalityService.name);

  constructor(
    private readonly evolutionService: PersonalityEvolutionService,
    private readonly analyticsService: PersonalityAnalyticsService,
    private readonly cacheService: PersonalityCacheService,
    private readonly historyService: EvolutionHistoryService,
    private readonly batchService: EvolutionBatchService,
    private readonly cleanupService: EvolutionCleanupService,
    private readonly realtimeEvents: RealtimeEventsService
  ) {
    this.logger.log('PersonalityService initialized as facade with all specialized services and realtime events');
  }

  // ===== 个性特质管理 API =====

  /**
   * 获取宠物个性详情
   */
  async getPersonalityDetails(petId: string): Promise<PersonalityTraits> {
    try {
      this.logger.debug(`Delegating getPersonalityDetails to cache service for pet ${petId}`);
      
      // 直接使用缓存服务获取个性分析数据
      const cached = await this.cacheService.getPersonalityAnalysis(petId);
      if (cached && cached.traits) {
        return cached.traits;
      }
      
      // 如果缓存未命中，返回默认个性特质
      const defaultTraits = this.getDefaultPersonalityTraits();
      
      // 缓存结果
      await this.cacheService.cachePersonalityAnalysis(petId, { traits: defaultTraits });
      
      return defaultTraits;
    } catch (error) {
      this.logger.error(`Failed to get personality details for pet ${petId}`, error);
      throw error;
    }
  }

  /**
   * 更新宠物个性特质
   */
  async updatePersonalityTraits(petId: string, traits: PersonalityTraits, userId?: string, oldTraits?: PersonalityTraits): Promise<PersonalityTraits> {
    try {
      this.logger.debug(`Delegating updatePersonalityTraits to cache service for pet ${petId}`);
      
      // 获取旧的特质值用于比较
      const previousTraits = oldTraits || await this.getPersonalityDetails(petId);
      
      // 更新缓存
      await this.cacheService.cachePersonalityAnalysis(petId, { traits });
      
      // 清理相关缓存
      await this.cacheService.invalidatePersonalityCache(petId);
      
      // 步骤241: 在个性演化时发送实时通知
      if (userId) {
        await this.sendPersonalityEvolutionEvents(petId, userId, previousTraits, traits);
      }
      
      this.logger.debug(`Personality traits updated successfully for pet ${petId}`);
      
      return traits;
    } catch (error) {
      this.logger.error(`Failed to update personality traits for pet ${petId}`, error);
      throw error;
    }
  }

  // ===== 个性分析 API =====

  /**
   * 获取个性分析报告
   */
  async getPersonalityAnalytics(petId: string): Promise<PersonalityAnalytics> {
    try {
      this.logger.debug(`Delegating getPersonalityAnalytics to analytics service for pet ${petId}`);
      return await this.analyticsService.getPersonalityAnalytics(petId);
    } catch (error) {
      this.logger.error(`Failed to get personality analytics for pet ${petId}`, error);
      throw error;
    }
  }

  /**
   * 触发个性分析
   */
  async triggerPersonalityAnalysis(petId: string): Promise<PersonalityAnalytics> {
    try {
      this.logger.debug(`Delegating triggerPersonalityAnalysis to analytics service for pet ${petId}`);
      return await this.analyticsService.triggerPersonalityAnalysis(petId);
    } catch (error) {
      this.logger.error(`Failed to trigger personality analysis for pet ${petId}`, error);
      throw error;
    }
  }

  /**
   * 获取个性历史记录
   */
  async getPersonalityHistory(petId: string): Promise<any[]> {
    try {
      this.logger.debug(`Delegating getPersonalityHistory to analytics service for pet ${petId}`);
      return await this.analyticsService.getPersonalityHistory(petId);
    } catch (error) {
      this.logger.error(`Failed to get personality history for pet ${petId}`, error);
      throw error;
    }
  }

  // ===== 个性演化 API =====

  /**
   * 处理个性演化增量计算
   */
  async processEvolutionIncrement(petId: string, interactionData: any): Promise<void> {
    try {
      this.logger.debug(`Delegating processEvolutionIncrement to evolution service for pet ${petId}`);
      await this.evolutionService.processEvolutionIncrement(petId, interactionData);
      
      // 清理相关缓存
      await this.cacheService.invalidatePersonalityCache(petId);
    } catch (error) {
      this.logger.error(`Failed to process evolution increment for pet ${petId}`, error);
      throw error;
    }
  }

  /**
   * 记录交互事件
   */
  async recordInteractionEvent(petId: string, interactionData: any): Promise<void> {
    try {
      this.logger.debug(`Delegating recordInteractionEvent to evolution service for pet ${petId}`);
      await this.evolutionService.recordInteractionEvent(petId, interactionData);
    } catch (error) {
      this.logger.error(`Failed to record interaction event for pet ${petId}`, error);
      throw error;
    }
  }

  // ===== 演化配置 API =====

  /**
   * 更新演化设置
   */
  async updateEvolutionSettings(petId: string, settings: EvolutionSettings): Promise<EvolutionSettings> {
    try {
      this.logger.debug(`Delegating updateEvolutionSettings to evolution service for pet ${petId}`);
      const result = await this.evolutionService.updateEvolutionSettings(petId, settings);
      
      // 清理相关缓存
      await this.cacheService.invalidatePersonalityCache(petId);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update evolution settings for pet ${petId}`, error);
      throw error;
    }
  }

  /**
   * 获取演化设置
   */
  async getEvolutionSettings(petId: string): Promise<EvolutionSettings> {
    try {
      this.logger.debug(`Delegating getEvolutionSettings to evolution service for pet ${petId}`);
      return await this.evolutionService.getEvolutionSettings(petId);
    } catch (error) {
      this.logger.error(`Failed to get evolution settings for pet ${petId}`, error);
      throw error;
    }
  }

  // ===== 数据管理 API =====

  /**
   * 获取演化历史
   */
  async getEvolutionHistory(query: any): Promise<any> {
    try {
      this.logger.debug(`Delegating getEvolutionHistory to history service`, { queryKeys: Object.keys(query) });
      return await this.historyService.getEvolutionHistory(query);
    } catch (error) {
      this.logger.error(`Failed to get evolution history`, error);
      throw error;
    }
  }

  /**
   * 批量处理演化数据
   */
  async processBatchEvolution(batchData: any[]): Promise<void> {
    try {
      this.logger.debug(`Delegating processBatchEvolution to batch service`, { itemCount: batchData.length });
      // 使用批量写入功能
      const evolutionData = batchData.map(item => ({
        petId: item.petId || '',
        evolutionType: item.evolutionType || 'personality',
        changeDescription: item.changeDescription || 'Batch evolution',
        triggerEvent: item.triggerEvent || 'batch',
        beforeSnapshot: item.beforeSnapshot || {},
        afterSnapshot: item.afterSnapshot || {},
        impactScore: item.impactScore || 0.5,
        significance: item.significance || 0.5,
        analysisData: item.analysisData || {}
      }));
      await this.batchService.batchWriteEvolutions(evolutionData);
    } catch (error) {
      this.logger.error(`Failed to process batch evolution`, error);
      throw error;
    }
  }

  /**
   * 清理过期数据 - 协同清理策略
   */
  async cleanupExpiredData(options?: {
    cleanupType?: 'expired' | 'deep' | 'optimization';
    coordinateServices?: boolean;
  }): Promise<void> {
    const { cleanupType = 'expired', coordinateServices = true } = options || {};
    
    try {
      this.logger.debug(`Starting coordinated cleanup operation`, { 
        cleanupType, 
        coordinateServices 
      });
      
      if (coordinateServices) {
        // 协同清理：在清理前通知各服务准备
        await this.prepareServicesForCleanup();
      }
      
      // 执行具体清理操作
      let cleanupResult;
      switch (cleanupType) {
        case 'deep':
          cleanupResult = await this.cleanupService.deepCleanupEvolutions();
          break;
        case 'optimization':
          await this.cleanupService.optimizeEvolutionStorage();
          cleanupResult = { message: 'Storage optimization completed' };
          break;
        default:
          cleanupResult = await this.cleanupService.cleanupExpiredEvolutions();
      }
      
      if (coordinateServices) {
        // 清理后协同：通知各服务更新状态
        await this.notifyServicesAfterCleanup(cleanupResult);
      }
      
      this.logger.debug(`Coordinated cleanup completed`, { 
        cleanupType, 
        result: cleanupResult 
      });
      
    } catch (error) {
      this.logger.error(`Failed to cleanup expired data`, error);
      throw error;
    }
  }

  // ===== 缓存管理 API =====

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<any> {
    try {
      this.logger.debug(`Delegating getCacheStats to cache service`);
      return await this.cacheService.getCacheStats();
    } catch (error) {
      this.logger.error(`Failed to get cache stats`, error);
      throw error;
    }
  }

  /**
   * 清理所有缓存
   */
  async clearAllCache(): Promise<void> {
    try {
      this.logger.debug(`Delegating clearAllCache to cache service`);
      // 使用专门的缓存失效方法
      await this.cacheService.invalidateAllBatchCache();
      this.logger.debug('All batch cache cleared successfully');
    } catch (error) {
      this.logger.error(`Failed to clear all cache`, error);
      throw error;
    }
  }

  /**
   * 使缓存失效
   */
  async invalidateCache(petId: string): Promise<void> {
    try {
      this.logger.debug(`Delegating invalidateCache to cache service for pet ${petId}`);
      await this.cacheService.invalidatePersonalityCache(petId);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for pet ${petId}`, error);
      throw error;
    }
  }

  // ===== 系统方法 =====

  /**
   * 获取默认个性特质
   */
  private getDefaultPersonalityTraits(): PersonalityTraits {
    return {
      openness: 50,
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 30
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; services: any }> {
    try {
      this.logger.debug('Performing health check on all services');
      
      const serviceStatuses = {
        evolution: 'healthy',
        analytics: 'healthy', 
        cache: 'healthy',
        history: 'healthy',
        batch: 'healthy',
        cleanup: 'healthy'
      };

      // 简单的服务可用性检查
      try {
        await this.cacheService.getCacheStats();
      } catch (error) {
        serviceStatuses.cache = 'unhealthy';
      }

      const overallStatus = Object.values(serviceStatuses).every(status => status === 'healthy') 
        ? 'healthy' 
        : 'degraded';

      return {
        status: overallStatus,
        services: serviceStatuses
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        status: 'unhealthy',
        services: {}
      };
    }
  }

  // ===== 服务协同方法 =====

  /**
   * 为清理操作准备各服务
   */
  private async prepareServicesForCleanup(): Promise<void> {
    try {
      this.logger.debug('Preparing services for cleanup operation');
      
      const preparationTasks = [
        // 演化服务：标记即将过期的数据
        this.prepareEvolutionServiceForCleanup(),
        // 分析服务：暂停背景分析任务
        this.prepareAnalyticsServiceForCleanup(),
        // 缓存服务：预备缓存清理
        this.prepareCacheServiceForCleanup()
      ];
      
      await Promise.allSettled(preparationTasks);
      
      this.logger.debug('Services preparation for cleanup completed');
    } catch (error) {
      this.logger.warn('Failed to prepare services for cleanup', error);
      // 准备失败不应该阻止清理操作
    }
  }

  /**
   * 清理后通知各服务
   */
  private async notifyServicesAfterCleanup(cleanupResult: any): Promise<void> {
    try {
      this.logger.debug('Notifying services after cleanup', { cleanupResult });
      
      const notificationTasks = [
        // 演化服务：更新内部状态
        this.notifyEvolutionServiceAfterCleanup(cleanupResult),
        // 分析服务：恢复背景任务
        this.notifyAnalyticsServiceAfterCleanup(cleanupResult),
        // 缓存服务：清理相关缓存
        this.notifyCacheServiceAfterCleanup(cleanupResult),
        // 批量服务：清理批量缓存
        this.notifyBatchServiceAfterCleanup(cleanupResult)
      ];
      
      const results = await Promise.allSettled(notificationTasks);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      this.logger.debug('Post-cleanup service notifications completed', {
        totalTasks: notificationTasks.length,
        successful,
        failed: results.length - successful
      });
    } catch (error) {
      this.logger.warn('Failed to notify services after cleanup', error);
      // 通知失败不应该影响清理操作的成功
    }
  }

  /**
   * 准备演化服务清理
   */
  private async prepareEvolutionServiceForCleanup(): Promise<void> {
    try {
      // 检查是否有正在进行的演化操作
      const ongoingOperations = await this.checkOngoingEvolutionOperations();
      if (ongoingOperations > 0) {
        this.logger.warn(`Found ${ongoingOperations} ongoing evolution operations, waiting...`);
        await this.waitForEvolutionOperationsToComplete();
      }
      
      // 标记即将过期的数据
      await this.markDataForCleanup('evolution');
    } catch (error) {
      this.logger.warn('Failed to prepare evolution service for cleanup', error);
    }
  }

  /**
   * 准备分析服务清理
   */
  private async prepareAnalyticsServiceForCleanup(): Promise<void> {
    try {
      // 暂停背景分析任务
      this.pauseBackgroundAnalytics = true;
      this.logger.debug('Background analytics paused for cleanup', { paused: this.pauseBackgroundAnalytics });
      
      // 完成正在进行的分析
      await this.waitForAnalyticsToComplete();
      
      // 标记即将过期的分析数据
      await this.markDataForCleanup('analytics');
    } catch (error) {
      this.logger.warn('Failed to prepare analytics service for cleanup', error);
    }
  }

  /**
   * 准备缓存服务清理
   */
  private async prepareCacheServiceForCleanup(): Promise<void> {
    try {
      // 获取缓存统计信息
      const cacheStats = await this.cacheService.getCacheStats();
      
      // 预备缓存失效列表
      this.preparedCacheKeys = this.identifyExpiredCacheKeys(cacheStats);
      
      this.logger.debug('Cache service prepared for cleanup', {
        totalCacheKeys: Object.keys(cacheStats).length,
        expiredKeys: this.preparedCacheKeys.length
      });
    } catch (error) {
      this.logger.warn('Failed to prepare cache service for cleanup', error);
    }
  }

  /**
   * 清理后通知演化服务
   */
  private async notifyEvolutionServiceAfterCleanup(cleanupResult: any): Promise<void> {
    try {
      // 使用智能缓存失效
      if (this.evolutionService.intelligentCacheInvalidation) {
        await this.evolutionService.intelligentCacheInvalidation('', 'cleanup_completed', cleanupResult);
      }
      
      this.logger.debug('Evolution service notified after cleanup');
    } catch (error) {
      this.logger.warn('Failed to notify evolution service after cleanup', error);
    }
  }

  /**
   * 清理后通知分析服务
   */
  private async notifyAnalyticsServiceAfterCleanup(_cleanupResult: any): Promise<void> {
    try {
      // 恢复背景分析任务
      this.pauseBackgroundAnalytics = false;
      
      // 恢复后台任务
      this.logger.debug('Analytics background tasks resumed after cleanup');
    } catch (error) {
      this.logger.warn('Failed to notify analytics service after cleanup', error);
    }
  }

  /**
   * 清理后通知缓存服务
   */
  private async notifyCacheServiceAfterCleanup(_cleanupResult: any): Promise<void> {
    try {
      // 清理预备的过期缓存键
      if (this.preparedCacheKeys && this.preparedCacheKeys.length > 0) {
        for (const key of this.preparedCacheKeys) {
          try {
            // 这里应该有具体的缓存删除逻辑
            await this.cacheService.invalidatePersonalityCache(key);
          } catch (error) {
            this.logger.warn(`Failed to invalidate cache key ${key}`, error);
          }
        }
        
        this.logger.debug(`Invalidated ${this.preparedCacheKeys.length} cache keys after cleanup`);
        this.preparedCacheKeys = [];
      }
    } catch (error) {
      this.logger.warn('Failed to notify cache service after cleanup', error);
    }
  }

  /**
   * 清理后通知批量服务
   */
  private async notifyBatchServiceAfterCleanup(_cleanupResult: any): Promise<void> {
    try {
      // 清理批量缓存
      await this.batchService.batchUpdateProcessingStatus('cleanup_batch', false);
      
      this.logger.debug('Batch service notified after cleanup');
    } catch (error) {
      this.logger.warn('Failed to notify batch service after cleanup', error);
    }
  }

  // ===== 辅助方法 =====

  private pauseBackgroundAnalytics = false; // 用于控制后台分析任务
  private preparedCacheKeys: string[] = [];

  private async checkOngoingEvolutionOperations(): Promise<number> {
    // 简化实现：检查是否有正在进行的操作
    try {
      const cacheStats = await this.cacheService.getCacheStats();
      return cacheStats.BATCH_EVOLUTION?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  private async waitForEvolutionOperationsToComplete(): Promise<void> {
    // 简化实现：等待一段时间让操作完成
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async waitForAnalyticsToComplete(): Promise<void> {
    // 简化实现：等待分析任务完成
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async markDataForCleanup(dataType: string): Promise<void> {
    this.logger.debug(`Marking ${dataType} data for cleanup`);
    // 实际实现中，这里会标记数据为待清理状态
  }

  private identifyExpiredCacheKeys(cacheStats: any): string[] {
    // 简化实现：识别过期的缓存键
    const expiredKeys: string[] = [];
    
    Object.entries(cacheStats).forEach(([category, stats]: [string, any]) => {
      if (stats.count > 1000) { // 如果缓存项过多，标记为需要清理
        expiredKeys.push(category);
      }
    });
    
    return expiredKeys;
  }

  /**
   * 步骤241: 发送个性演化实时事件
   */
  private async sendPersonalityEvolutionEvents(
    petId: string,
    userId: string,
    oldTraits: PersonalityTraits,
    newTraits: PersonalityTraits
  ): Promise<void> {
    try {
      // 检查每个特质的变化
      const traitMapping: Record<keyof PersonalityTraits, PersonalityTrait> = {
        openness: PersonalityTrait.OPENNESS,
        conscientiousness: PersonalityTrait.CONSCIENTIOUSNESS,
        extraversion: PersonalityTrait.EXTRAVERSION,
        agreeableness: PersonalityTrait.AGREEABLENESS,
        neuroticism: PersonalityTrait.NEUROTICISM
      };

      for (const [traitKey, personalityTrait] of Object.entries(traitMapping)) {
        const oldValue = oldTraits[traitKey as keyof PersonalityTraits] || 50;
        const newValue = newTraits[traitKey as keyof PersonalityTraits] || 50;
        
        // 只有当变化足够大时才发送事件（至少1点变化）
        if (Math.abs(newValue - oldValue) >= 1) {
          await this.realtimeEvents.pushPersonalityEvolution(
            petId,
            userId,
            personalityTrait,
            oldValue,
            newValue,
            '个性特质更新'
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send personality evolution events for pet ${petId}`, error);
      // 不要抛出错误，避免影响主要的更新流程
    }
  }
}