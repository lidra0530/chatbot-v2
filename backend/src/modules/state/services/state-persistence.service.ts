import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { PetState } from '../../../algorithms/state-driver';
import { StateUpdateTrigger } from '../dto';

/**
 * 步骤154-157: 状态系统数据持久化服务
 * 负责状态变化的数据库记录、历史查询、索引优化和缓存策略
 */
@Injectable()
export class StatePersistenceService {
  private readonly logger = new Logger(StatePersistenceService.name);
  
  // 步骤157: 状态数据缓存
  private readonly stateCache = new Map<string, {
    state: PetState;
    timestamp: number;
    ttl: number;
  }>();
  
  private readonly CACHE_TTL = 300000; // 5分钟缓存
  private readonly CACHE_CLEANUP_INTERVAL = 600000; // 10分钟清理间隔

  constructor(private prisma: PrismaService) {
    this.logger.log('StatePersistenceService initialized');
    
    // 启动缓存清理定时任务
    this.startCacheCleanup();
  }

  /**
   * 步骤154: 实现状态变化的数据库记录
   * 记录详细的状态变化历史
   */
  async recordStateChange(
    petId: string,
    previousState: PetState,
    newState: PetState,
    trigger: StateUpdateTrigger,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    this.logger.debug(`Recording state change for pet: ${petId}`);

    try {
      const now = new Date();
      const changes = this.calculateDetailedStateChanges(previousState, newState);
      const impactScore = this.calculateDetailedImpactScore(changes);
      const significance = this.determineSignificance(impactScore, changes);

      // 创建详细的状态变化记录
      await this.prisma.petEvolutionLog.create({
        data: {
          petId,
          evolutionType: 'state',
          changeDescription: reason || `State updated via ${trigger}`,
          triggerEvent: trigger,
          beforeSnapshot: this.sanitizeStateForStorage(previousState),
          afterSnapshot: this.sanitizeStateForStorage(newState),
          impactScore,
          significance,
          analysisData: {
            trigger,
            timestamp: now.toISOString(),
            changes,
            metadata: metadata || {},
            // 添加详细分析数据
            changeAnalysis: {
              totalChanges: Object.keys(changes).length,
              positiveChanges: Object.values(changes).filter(v => v > 0).length,
              negativeChanges: Object.values(changes).filter(v => v < 0).length,
              maxChange: Math.max(...Object.values(changes).map(Math.abs)),
              avgChange: Object.values(changes).reduce((sum, val) => sum + Math.abs(val), 0) / Object.keys(changes).length
            },
            // 状态分布分析
            stateDistribution: {
              basic: this.analyzeStateDistribution(newState.basic),
              advanced: this.analyzeStateDistribution(newState.advanced)
            }
          },
          yearMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
          dayOfWeek: now.getDay(),
          hourOfDay: now.getHours(),
          // 设置过期时间（90天后过期）
          expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
        }
      });

      // 更新缓存
      this.updateStateCache(petId, newState);

      this.logger.debug(`State change recorded successfully for pet ${petId}`);
    } catch (error) {
      this.logger.error(`Error recording state change for pet ${petId}:`, error);
      throw error;
    }
  }

  /**
   * 步骤155: 实现状态历史的高效查询
   * 优化的状态历史查询方法
   */
  async getOptimizedStateHistory(
    petId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      significanceFilter?: string[];
      triggerFilter?: string[];
      includeAnalysis?: boolean;
    } = {}
  ): Promise<any[]> {
    this.logger.debug(`Getting optimized state history for pet: ${petId}`);

    try {
      const {
        limit = 50,
        offset = 0,
        startDate,
        endDate,
        significanceFilter,
        triggerFilter,
        includeAnalysis = false
      } = options;

      // 构建查询条件
      const where: any = {
        petId,
        evolutionType: 'state'
      };

      // 时间范围过滤
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // 重要性过滤
      if (significanceFilter && significanceFilter.length > 0) {
        where.significance = { in: significanceFilter };
      }

      // 触发器过滤
      if (triggerFilter && triggerFilter.length > 0) {
        where.triggerEvent = { in: triggerFilter };
      }

      // 执行优化查询
      const historyRecords = await this.prisma.petEvolutionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Math.min(limit, 200), // 最大200条记录
        select: {
          id: true,
          changeDescription: true,
          triggerEvent: true,
          impactScore: true,
          significance: true,
          createdAt: true,
          yearMonth: true,
          dayOfWeek: true,
          hourOfDay: true,
          ...(includeAnalysis ? {
            beforeSnapshot: true,
            afterSnapshot: true,
            analysisData: true
          } : {})
        }
      });

      // 处理和格式化结果
      return historyRecords.map(record => {
        const formatted: any = {
          id: record.id,
          description: record.changeDescription,
          trigger: record.triggerEvent,
          impact: record.impactScore,
          significance: record.significance,
          timestamp: record.createdAt,
          timeMetadata: {
            yearMonth: record.yearMonth,
            dayOfWeek: record.dayOfWeek,
            hourOfDay: record.hourOfDay
          }
        };

        if (includeAnalysis && record.analysisData) {
          formatted.analysis = record.analysisData;
          formatted.changes = this.calculateDetailedStateChanges(
            record.beforeSnapshot as any,
            record.afterSnapshot as any
          );
        }

        return formatted;
      });
    } catch (error) {
      this.logger.error(`Error getting state history for pet ${petId}:`, error);
      throw error;
    }
  }

  /**
   * 步骤156: 创建状态数据的数据库索引
   * 确保数据库索引优化
   */
  async ensureStateIndexes(): Promise<void> {
    this.logger.log('Ensuring state data indexes are optimized');

    try {
      // 这里我们验证Prisma schema中定义的索引是否正确应用
      // 实际的索引创建由Prisma migration处理
      
      // 验证关键索引的存在和性能
      const indexVerification = await this.verifyIndexPerformance();
      
      if (!indexVerification.isOptimal) {
        this.logger.warn('State data indexes may not be optimal', indexVerification.issues);
      } else {
        this.logger.log('State data indexes are properly configured');
      }
    } catch (error) {
      this.logger.error('Error ensuring state indexes:', error);
    }
  }

  /**
   * 步骤157: 实现状态数据的缓存策略
   * 多层缓存策略实现
   */
  async getCachedState(petId: string): Promise<PetState | null> {
    const cached = this.stateCache.get(petId);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.logger.debug(`Cache hit for pet state: ${petId}`);
      return cached.state;
    }
    
    if (cached) {
      this.stateCache.delete(petId);
    }
    
    return null;
  }

  async updateStateCache(petId: string, state: PetState): Promise<void> {
    this.stateCache.set(petId, {
      state: JSON.parse(JSON.stringify(state)), // 深拷贝
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    });
    
    this.logger.debug(`State cached for pet: ${petId}`);
  }

  async invalidateStateCache(petId: string): Promise<void> {
    this.stateCache.delete(petId);
    this.logger.debug(`State cache invalidated for pet: ${petId}`);
  }

  /**
   * 批量状态更新（优化性能）
   */
  async batchUpdateStates(updates: Array<{
    petId: string;
    previousState: PetState;
    newState: PetState;
    trigger: StateUpdateTrigger;
    reason?: string;
  }>): Promise<void> {
    this.logger.debug(`Batch updating ${updates.length} pet states`);

    try {
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const now = new Date();

      // 准备批量插入数据
      const evolutionLogs = updates.map(update => ({
        petId: update.petId,
        evolutionType: 'state',
        changeDescription: update.reason || `Batch state update via ${update.trigger}`,
        triggerEvent: update.trigger,
        beforeSnapshot: this.sanitizeStateForStorage(update.previousState),
        afterSnapshot: this.sanitizeStateForStorage(update.newState),
        impactScore: this.calculateDetailedImpactScore(
          this.calculateDetailedStateChanges(update.previousState, update.newState)
        ),
        significance: 'minor', // 批量更新通常是minor
        analysisData: {
          batchUpdate: true,
          batchId,
          changes: this.calculateDetailedStateChanges(update.previousState, update.newState)
        },
        yearMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        dayOfWeek: now.getDay(),
        hourOfDay: now.getHours(),
        batchId,
        expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      }));

      // 批量插入
      await this.prisma.petEvolutionLog.createMany({
        data: evolutionLogs
      });

      // 更新缓存
      updates.forEach(update => {
        this.updateStateCache(update.petId, update.newState);
      });

      this.logger.log(`Batch update completed for ${updates.length} pets with batchId: ${batchId}`);
    } catch (error) {
      this.logger.error('Error in batch state update:', error);
      throw error;
    }
  }

  /**
   * 获取状态统计信息
   */
  async getStateStatistics(petId: string, timeRange: number = 30): Promise<any> {
    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);

      const stats = await this.prisma.petEvolutionLog.findMany({
        where: {
          petId,
          evolutionType: 'state',
          createdAt: { gte: startDate }
        },
        select: {
          impactScore: true,
          significance: true,
          triggerEvent: true,
          createdAt: true,
          analysisData: true
        }
      });

      return {
        totalChanges: stats.length,
        averageImpact: stats.reduce((sum, s) => sum + s.impactScore, 0) / stats.length || 0,
        significanceDistribution: this.groupBy(stats, 'significance'),
        triggerDistribution: this.groupBy(stats, 'triggerEvent'),
        dailyActivity: this.groupByDay(stats),
        trends: this.calculateStateTrends(stats)
      };
    } catch (error) {
      this.logger.error(`Error getting state statistics for pet ${petId}:`, error);
      throw error;
    }
  }

  // 私有辅助方法

  private calculateDetailedStateChanges(previousState: any, newState: any): Record<string, number> {
    const changes: Record<string, number> = {};
    
    // 基础状态变化
    if (previousState.basic && newState.basic) {
      for (const key of Object.keys(newState.basic)) {
        if (typeof newState.basic[key] === 'number' && typeof previousState.basic[key] === 'number') {
          const change = newState.basic[key] - previousState.basic[key];
          if (Math.abs(change) > 0.01) { // 避免浮点数精度问题
            changes[`basic.${key}`] = Math.round(change * 100) / 100;
          }
        }
      }
    }
    
    // 高级状态变化
    if (previousState.advanced && newState.advanced) {
      for (const key of Object.keys(newState.advanced)) {
        if (typeof newState.advanced[key] === 'number' && typeof previousState.advanced[key] === 'number') {
          const change = newState.advanced[key] - previousState.advanced[key];
          if (Math.abs(change) > 0.01) {
            changes[`advanced.${key}`] = Math.round(change * 100) / 100;
          }
        }
      }
    }
    
    return changes;
  }

  private calculateDetailedImpactScore(changes: Record<string, number>): number {
    if (Object.keys(changes).length === 0) return 0;

    const totalChange = Object.values(changes).reduce((sum, change) => sum + Math.abs(change), 0);
    const maxPossibleChange = Object.keys(changes).length * 100; // 每个字段最大变化100
    
    return Math.min(totalChange / maxPossibleChange, 1.0);
  }

  private determineSignificance(impactScore: number, changes: Record<string, number>): string {
    const changeCount = Object.keys(changes).length;
    const maxChange = Math.max(...Object.values(changes).map(Math.abs));

    if (impactScore > 0.3 || maxChange > 20 || changeCount > 5) {
      return 'major';
    } else if (impactScore > 0.1 || maxChange > 10 || changeCount > 2) {
      return 'moderate';
    } else {
      return 'minor';
    }
  }

  private analyzeStateDistribution(stateObj: any): any {
    const values = Object.values(stateObj).filter(v => typeof v === 'number') as number[];
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      distribution: {
        low: values.filter(v => v < 30).length,
        medium: values.filter(v => v >= 30 && v <= 70).length,
        high: values.filter(v => v > 70).length
      }
    };
  }

  private sanitizeStateForStorage(state: any): any {
    // 清理状态对象，移除可能导致存储问题的字段
    const sanitized = JSON.parse(JSON.stringify(state));
    
    // 确保时间字段正确格式化
    if (sanitized.lastUpdate) {
      sanitized.lastUpdate = new Date(sanitized.lastUpdate).toISOString();
    }
    
    return sanitized;
  }

  private async verifyIndexPerformance(): Promise<{ isOptimal: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // 简单的性能测试查询
      const testStart = Date.now();
      await this.prisma.petEvolutionLog.findFirst({
        where: {
          evolutionType: 'state',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });
      const queryTime = Date.now() - testStart;
      
      if (queryTime > 100) { // 超过100ms认为需要优化
        issues.push(`Slow query performance: ${queryTime}ms`);
      }
      
      return {
        isOptimal: issues.length === 0,
        issues
      };
    } catch (error: any) {
      issues.push(`Error verifying indexes: ${error.message || 'Unknown error'}`);
      return { isOptimal: false, issues };
    }
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, cached] of this.stateCache.entries()) {
        if (now - cached.timestamp >= cached.ttl) {
          this.stateCache.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
      }
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  private groupByDay(array: any[]): Record<string, number> {
    return array.reduce((groups, item) => {
      const day = item.createdAt.toISOString().split('T')[0];
      groups[day] = (groups[day] || 0) + 1;
      return groups;
    }, {});
  }

  private calculateStateTrends(stats: any[]): any {
    if (stats.length < 2) return null;

    const sortedStats = stats.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const recentHalf = sortedStats.slice(Math.floor(sortedStats.length / 2));
    const olderHalf = sortedStats.slice(0, Math.floor(sortedStats.length / 2));

    const recentAvgImpact = recentHalf.reduce((sum, s) => sum + s.impactScore, 0) / recentHalf.length;
    const olderAvgImpact = olderHalf.reduce((sum, s) => sum + s.impactScore, 0) / olderHalf.length;

    return {
      impactTrend: recentAvgImpact - olderAvgImpact,
      activityTrend: recentHalf.length - olderHalf.length,
      direction: recentAvgImpact > olderAvgImpact ? 'increasing' : 'decreasing'
    };
  }
}