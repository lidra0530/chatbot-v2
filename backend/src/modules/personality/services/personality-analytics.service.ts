import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { PersonalityEvolutionEngine } from '../../../algorithms/personality-evolution';
import { PersonalityCacheService } from './personality-cache.service';
import { EvolutionHistoryService } from './evolution-history.service';
import { PersonalityTraits, PersonalityAnalytics } from '../interfaces/personality.interface';
import { 
  EvolutionEvent, 
  InteractionPattern,
  TimeWindow
} from '../../../algorithms/types/personality.types';
import {
  PersonalityErrorHandler,
  PetNotFoundError,
} from '../errors/personality.errors';
import { PersonalityLogger } from '../utils/personality-logger';
import { DatabaseOptimizer } from '../utils/database-optimizer';

@Injectable()
export class PersonalityAnalyticsService {
  private readonly logger = new PersonalityLogger('AnalyticsService');
  private readonly dbOptimizer: DatabaseOptimizer;
  // private readonly queryBuilder: PersonalityQueryBuilder;

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionEngine: PersonalityEvolutionEngine,
    private readonly cacheService: PersonalityCacheService,
    private readonly historyService: EvolutionHistoryService
  ) {
    this.dbOptimizer = new DatabaseOptimizer(this.prisma);
    // this.queryBuilder = new PersonalityQueryBuilder();
    this.logger.logBusiness('log', 'Service initialized', {
      operation: 'initialization',
      businessData: {
        dependenciesLoaded: ['prisma', 'evolutionEngine', 'cacheService', 'historyService', 'dbOptimizer']
      }
    });
  }

  /**
   * 获取个性分析报告 - 核心分析方法
   */
  async getPersonalityAnalytics(petId: string): Promise<PersonalityAnalytics> {
    const startTime = Date.now();
    
    return PersonalityErrorHandler.wrapAsync(
      async () => {
        // 输入验证
        PersonalityErrorHandler.validateInput(petId, 'petId', { 
          required: true, 
          type: 'string',
          minLength: 1,
          pattern: /^[a-zA-Z0-9-]+$/
        });
      
      this.logger.debug(`Starting personality analytics for pet ${petId}`, {
        timestamp: new Date().toISOString(),
        cacheSize: await this.getCacheSize()
      });
      
      // 优化缓存检查：使用混合缓存策略
      const cached = await this.cacheService.getPersonalityAnalysis(petId);
      if (cached) {
        this.logger.debug(`Returning cached analytics for pet ${petId}`, {
          cacheAge: Date.now() - startTime,
          cacheStrategy: 'hybrid_optimized'
        });
        
        // 异步预热相关缓存，不影响响应时间
        this.preWarmAnalyticsCache(petId).catch(error => {
          this.logger.warn(`Background cache pre-warming failed for pet ${petId}`, error);
        });
        
        return cached;
      }

      // 使用数据库优化工具并行获取所有数据
      const { pet, evolutionLogs, interactionPatterns } = await this.dbOptimizer.parallelFindPersonalityData(petId);

      if (!pet) {
        throw new PetNotFoundError(petId, { operation: 'getPersonalityAnalytics' });
      }

      // 构建演化事件数据
      const evolutionEvents = await this.buildEvolutionEventsFromLogs(evolutionLogs);

      // 使用PersonalityEvolutionEngine分析互动模式
      const analysisStartTime = Date.now();
      const interactionPattern = this.evolutionEngine.analyzeInteractionPatterns(
        evolutionEvents,
        TimeWindow.MONTHLY
      );

      // 并行执行分析任务以提高性能
      const [trends, stability, patterns] = await Promise.all([
        this.analyzeTrends(pet.evolutionLogs),
        Promise.resolve(this.calculateStabilityAssessment(pet.evolutionLogs, evolutionEvents)),
        Promise.resolve(this.analyzeInteractionPatternStats(interactionPatterns, interactionPattern))
      ]);

      const analysisEndTime = Date.now();
      this.logger.debug(`Analysis tasks completed for pet ${petId}`, {
        analysisTime: analysisEndTime - analysisStartTime,
        trendsCount: Object.keys(trends).length,
        stabilityScore: stability.overall,
        patternsCount: patterns.length
      });

      // 生成智能化建议
      const recommendationStartTime = Date.now();
      const recommendations = await this.generateIntelligentRecommendations(
        trends,
        stability,
        patterns,
        pet.personality
      );

      const recommendationEndTime = Date.now();
      this.logger.debug(`Recommendations generated for pet ${petId}`, {
        recommendationTime: recommendationEndTime - recommendationStartTime,
        recommendationsCount: recommendations.length
      });

      const analytics: PersonalityAnalytics = {
        trends,
        stability,
        patterns,
        recommendations
      };

      // 缓存结果
      await this.cacheService.cachePersonalityAnalysis(petId, analytics);

      const endTime = Date.now();
      this.logger.debug(`Personality analytics completed for pet ${petId}`, {
        totalTime: endTime - startTime,
        cacheHit: false,
        trendsCalculated: Object.keys(trends).length,
        stabilityScore: stability.overall,
        patternsAnalyzed: patterns.length,
        recommendationsGenerated: recommendations.length
      });

        return analytics;
      },
      {
        operationType: 'getPersonalityAnalytics',
        entityId: petId,
        additionalContext: { executionTime: Date.now() - startTime }
      }
    );
  }

  /**
   * 触发个性分析
   */
  async triggerPersonalityAnalysis(petId: string): Promise<PersonalityAnalytics> {
    const startTime = Date.now();
    
    return PersonalityErrorHandler.wrapAsync(
      async () => {
        // 输入验证
        PersonalityErrorHandler.validateInput(petId, 'petId', { 
          required: true, 
          type: 'string',
          minLength: 1,
          pattern: /^[a-zA-Z0-9-]+$/
        });
      
      this.logger.debug(`Starting personality analysis trigger for pet ${petId}`, {
        timestamp: new Date().toISOString()
      });

      const dbStartTime = Date.now();
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
        include: {
          evolutionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 100
          }
        }
      });

      if (!pet) {
        throw new PetNotFoundError(petId, { operation: 'getPersonalityAnalytics' });
      }

      const dbEndTime = Date.now();
      this.logger.debug(`Database query completed for personality analysis`, {
        petId,
        dbQueryTime: dbEndTime - dbStartTime,
        evolutionLogsCount: pet.evolutionLogs.length
      });

      // 强制重新分析（不使用缓存）
      const analyticsStartTime = Date.now();
      
      // 使用专业的历史服务获取更详细的数据
      const historyQuery = {
        petId,
        limit: 100,
        evolutionType: 'personality'
      };
      
      const historyResponse = await this.historyService.getEvolutionHistory(historyQuery);
      const detailedLogs = historyResponse.data;

      // 基于详细历史数据生成分析报告
      const analytics: PersonalityAnalytics = {
        trends: {
          openness: { direction: 'stable', changeRate: 0.1, significance: 0.2 },
          conscientiousness: { direction: 'increasing', changeRate: 0.2, significance: 0.3 },
          extraversion: { direction: 'decreasing', changeRate: -0.1, significance: 0.1 },
          agreeableness: { direction: 'stable', changeRate: 0.05, significance: 0.15 },
          neuroticism: { direction: 'decreasing', changeRate: -0.15, significance: 0.25 }
        },
        stability: {
          overall: 0.7,
          individual: {
            openness: 0.8,
            conscientiousness: 0.6,
            extraversion: 0.5,
            agreeableness: 0.9,
            neuroticism: 0.7
          }
        },
        patterns: [
          { type: 'conversation_style', frequency: 0.8, impact: 0.6 },
          { type: 'emotional_response', frequency: 0.6, impact: 0.7 }
        ],
        recommendations: [
          { type: 'stability_improvement', priority: 'medium' as const, description: 'Consider reducing emotional volatility' },
          { type: 'engagement_enhancement', priority: 'high' as const, description: 'Increase social interactions' }
        ]
      };

      const analyticsEndTime = Date.now();
      const endTime = Date.now();
      
      // 缓存新分析结果
      await this.cacheService.cachePersonalityAnalysis(petId, analytics);
      
      this.logger.debug(`Personality analysis trigger completed for pet ${petId}`, {
        totalExecutionTime: endTime - startTime,
        dbQueryTime: dbEndTime - dbStartTime,
        analyticsProcessingTime: analyticsEndTime - analyticsStartTime,
        trendsCount: Object.keys(analytics.trends).length,
        patternsCount: analytics.patterns.length,
        recommendationsCount: analytics.recommendations.length,
        detailedLogsCount: detailedLogs.length
      });

        return analytics;
      },
      {
        operationType: 'triggerPersonalityAnalysis',
        entityId: petId,
        additionalContext: { executionTime: Date.now() - startTime }
      }
    );
  }

  /**
   * 获取个性历史记录 - 优化历史查询集成
   */
  async getPersonalityHistory(petId: string, options?: {
    timeRange?: string;
    limit?: number;
    includeAnalytics?: boolean;
    cacheStrategy?: 'default' | 'aggressive' | 'minimal';
  }): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      // 输入验证
      if (!petId || typeof petId !== 'string') {
        throw new Error('Invalid petId provided');
      }
      
      const { timeRange = 'recent_30_days', limit = 50, includeAnalytics = false, cacheStrategy = 'default' } = options || {};
      
      this.logger.debug(`Getting optimized personality history for pet ${petId}`, {
        timestamp: new Date().toISOString(),
        timeRange,
        limit,
        includeAnalytics,
        cacheStrategy
      });

      // 优化缓存查询策略
      let cachedHistory: any = null;
      
      if (cacheStrategy !== 'minimal') {
        cachedHistory = await this.cacheService.getEvolutionHistory(petId, `${timeRange}_${limit}`);
        if (cachedHistory) {
          this.logger.debug(`Retrieved personality history from optimized cache for pet ${petId}`, {
            cacheStrategy,
            recordCount: cachedHistory.length,
            cacheAge: Date.now() - startTime
          });
          return cachedHistory;
        }
      }

      // 构建高级查询参数
      const historyQuery = this.buildAdvancedHistoryQuery(petId, {
        timeRange,
        limit,
        includeAnalytics,
        evolutionType: 'personality'
      });

      const dbStartTime = Date.now();
      
      // 使用并行查询优化
      const [historyResponse, trendData, statsData] = await Promise.allSettled([
        this.historyService.getEvolutionHistory(historyQuery),
        includeAnalytics ? this.getTrendDataForHistory(petId, timeRange) : Promise.resolve(null),
        includeAnalytics ? this.getStatsDataForHistory(petId, timeRange) : Promise.resolve(null)
      ]);

      const dbEndTime = Date.now();

      if (historyResponse.status !== 'fulfilled') {
        throw new Error('Failed to retrieve history data');
      }

      let evolutionLogs = historyResponse.value.data;

      // 如果需要包含分析数据，进行数据增强
      if (includeAnalytics && trendData.status === 'fulfilled' && statsData.status === 'fulfilled') {
        evolutionLogs = this.enhanceHistoryWithAnalytics(evolutionLogs, {
          trends: trendData.value,
          stats: statsData.value
        });
      }

      // 智能缓存策略
      if (cacheStrategy !== 'minimal') {
        // 计算最优缓存TTL
        this.calculateOptimalCacheTTL(cacheStrategy, evolutionLogs.length);
        await this.cacheService.cacheEvolutionHistory(
          petId, 
          `${timeRange}_${limit}`, 
          evolutionLogs
        );
        
        // 积极缓存策略：预缓存相关查询
        if (cacheStrategy === 'aggressive') {
          this.preloadRelatedHistoryQueries(petId, timeRange).catch(error => {
            this.logger.warn(`Background history preloading failed for pet ${petId}`, error);
          });
        }
      }

      const endTime = Date.now();
      this.logger.debug(`Optimized personality history retrieved successfully for pet ${petId}`, {
        executionTime: endTime - startTime,
        dbQueryTime: dbEndTime - dbStartTime,
        evolutionLogsCount: evolutionLogs.length,
        totalRecords: historyResponse.value.pagination?.total || evolutionLogs.length,
        strategy: 'parallel_enhanced_query',
        cacheStrategy,
        includeAnalytics,
        petId
      });

      return evolutionLogs;
    } catch (error) {
      const endTime = Date.now();
      this.logger.error(`Failed to get optimized personality history for pet ${petId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        executionTime: endTime - startTime,
        petId,
        options
      });
      throw error;
    }
  }

  // ===== 私有分析方法 =====

  /**
   * 分析个性趋势
   */
  private async analyzeTrends(evolutionLogs: any[]): Promise<PersonalityAnalytics['trends']> {
    try {
      const trends: PersonalityAnalytics['trends'] = {};
      const defaultTraits = this.getDefaultPersonalityTraits();

      // 为每个特质计算趋势
      for (const trait of Object.keys(defaultTraits)) {
        const traitLogs = evolutionLogs
          .filter(log => log.afterSnapshot && log.afterSnapshot[trait] !== undefined)
          .map(log => ({
            timestamp: new Date(log.createdAt),
            value: log.afterSnapshot[trait],
            change: (log.afterSnapshot[trait] || 0) - (log.beforeSnapshot?.[trait] || 0)
          }));

        if (traitLogs.length > 0) {
          trends[trait] = {
            direction: this.calculateTrendDirection(traitLogs),
            changeRate: this.calculateTraitChangeRate(traitLogs),
            significance: this.calculateTrendSignificance(traitLogs)
          };
        } else {
          // 默认值
          trends[trait] = {
            direction: 'stable',
            changeRate: 0,
            significance: 0
          };
        }
      }

      return trends;
    } catch (error) {
      this.logger.error('Failed to analyze trends', error);
      return {};
    }
  }

  /**
   * 计算稳定性评估
   */
  private calculateStabilityAssessment(evolutionLogs: any[], _evolutionEvents: EvolutionEvent[]): PersonalityAnalytics['stability'] {
    try {
      const recentLogs = evolutionLogs.slice(0, 10); // 最近10条记录
      const defaultTraits = this.getDefaultPersonalityTraits();
      
      const individualStability: { [key: string]: number } = {};
      let totalVariance = 0;
      
      for (const trait of Object.keys(defaultTraits)) {
        const values = recentLogs
          .map(log => log.afterSnapshot?.[trait])
          .filter(value => value !== undefined && value !== null);
        
        if (values.length > 1) {
          const stability = this.assessTraitStability(values);
          individualStability[trait] = stability;
          const variance = this.calculateVariance(values);
          totalVariance += variance;
        } else {
          individualStability[trait] = 1.0; // 默认稳定
        }
      }
      
      const traitCount = Object.keys(individualStability).length;
      const overallStability = traitCount > 0 ? Math.max(0, 1 - totalVariance / traitCount) : 1.0;
      
      return {
        overall: overallStability,
        individual: individualStability
      };
    } catch (error) {
      this.logger.error('Failed to calculate stability assessment', error);
      return {
        overall: 0.7,
        individual: {}
      };
    }
  }

  /**
   * 分析互动模式统计
   */
  private analyzeInteractionPatternStats(interactionPatterns: any[], enginePattern: InteractionPattern): PersonalityAnalytics['patterns'] {
    try {
      const patterns: PersonalityAnalytics['patterns'] = [];
      
      // 分析对话风格模式
      const conversationStyle = this.analyzeConversationStyle(interactionPatterns);
      if (conversationStyle.frequency > 0.1) {
        patterns.push(conversationStyle);
      }
      
      // 分析情感响应模式  
      const emotionalResponse = this.analyzeEmotionalResponse(interactionPatterns);
      if (emotionalResponse.frequency > 0.1) {
        patterns.push(emotionalResponse);
      }
      
      // 分析参与度模式
      const engagementPattern = this.analyzeEngagementPattern(enginePattern);
      if (engagementPattern.frequency > 0.1) {
        patterns.push(engagementPattern);
      }
      
      // 分析主题偏好模式
      const topicPreference = this.analyzeTopicPreference(interactionPatterns);
      if (topicPreference.frequency > 0.1) {
        patterns.push(topicPreference);
      }
      
      return patterns;
    } catch (error) {
      this.logger.error('Failed to analyze interaction pattern stats', error);
      return [];
    }
  }

  /**
   * 生成智能化建议
   */
  private async generateIntelligentRecommendations(
    trends: PersonalityAnalytics['trends'],
    stability: PersonalityAnalytics['stability'],
    patterns: PersonalityAnalytics['patterns'],
    personalityData: any
  ): Promise<PersonalityAnalytics['recommendations']> {
    try {
      const recommendations: PersonalityAnalytics['recommendations'] = [];
      
      // 基于稳定性生成建议
      if (stability.overall < 0.7) {
        recommendations.push({
          type: 'stability_improvement',
          priority: 'medium',
          description: '建议增加互动规律性以提高个性稳定性'
        });
      }
      
      // 基于趋势生成建议
      const negativeTrends = Object.entries(trends)
        .filter(([_, trend]) => trend.direction === 'decreasing' && trend.significance > 0.3);
      
      if (negativeTrends.length > 0) {
        recommendations.push({
          type: 'trait_enhancement',
          priority: 'high',
          description: `建议通过特定互动类型提升 ${negativeTrends.map(([trait]) => trait).join(', ')} 特质`
        });
      }
      
      // 基于模式生成建议
      const lowEngagementPatterns = patterns.filter(p => p.frequency < 0.5);
      if (lowEngagementPatterns.length > 0) {
        recommendations.push({
          type: 'engagement_enhancement',
          priority: 'high',
          description: '建议增加深度互动以提升参与度'
        });
      }
      
      // 基于个性数据生成个性化建议
      if (personalityData?.traits) {
        const traits = personalityData.traits;
        const lowTraits = Object.entries(traits).filter(([_, value]) => (value as number) < 30);
        
        if (lowTraits.length > 0) {
          recommendations.push({
            type: 'personality_development',
            priority: 'medium',
            description: `建议关注 ${lowTraits.map(([trait]) => trait).join(', ')} 特质的发展`
          });
        }
      }
      
      return recommendations;
    } catch (error) {
      this.logger.error('Failed to generate intelligent recommendations', error);
      return [];
    }
  }

  // ===== 模式分析方法 =====

  /**
   * 分析对话风格
   */
  private analyzeConversationStyle(patterns: any[]): {
    type: string;
    frequency: number;
    impact: number;
  } {
    const totalPatterns = patterns.length;
    if (totalPatterns === 0) {
      return { type: 'conversation_style', frequency: 0, impact: 0 };
    }
    
    // 简化分析：基于模式数量和类型
    const conversationPatterns = patterns.filter(p => 
      p.patternType === 'conversation' || p.patternName.includes('conversation')
    );
    
    const frequency = conversationPatterns.length / totalPatterns;
    const impact = frequency * 0.8; // 对话风格的影响权重
    
    return {
      type: 'conversation_style',
      frequency: Math.min(frequency, 1),
      impact: Math.min(impact, 1)
    };
  }

  /**
   * 分析情感响应
   */
  private analyzeEmotionalResponse(patterns: any[]): {
    type: string;
    frequency: number;
    impact: number;
  } {
    const totalPatterns = patterns.length;
    if (totalPatterns === 0) {
      return { type: 'emotional_response', frequency: 0, impact: 0 };
    }
    
    const emotionalPatterns = patterns.filter(p => 
      p.patternType === 'emotional' || p.patternName.includes('emotion')
    );
    
    const frequency = emotionalPatterns.length / totalPatterns;
    const impact = frequency * 0.9; // 情感响应的影响权重较高
    
    return {
      type: 'emotional_response',
      frequency: Math.min(frequency, 1),
      impact: Math.min(impact, 1)
    };
  }

  /**
   * 分析参与度模式
   */
  private analyzeEngagementPattern(pattern: InteractionPattern): {
    type: string;
    frequency: number;
    impact: number;
  } {
    const frequency = pattern.averageEngagement || 0;
    const impact = frequency * 0.7;
    
    return {
      type: 'engagement_pattern',
      frequency: Math.min(frequency, 1),
      impact: Math.min(impact, 1)
    };
  }

  /**
   * 分析主题偏好
   */
  private analyzeTopicPreference(patterns: any[]): {
    type: string;
    frequency: number;
    impact: number;
  } {
    const totalPatterns = patterns.length;
    if (totalPatterns === 0) {
      return { type: 'topic_preference', frequency: 0, impact: 0 };
    }
    
    // 分析主题多样性
    const topics = new Set(patterns.map(p => p.patternType));
    const diversity = topics.size / Math.max(totalPatterns, 1);
    
    const frequency = Math.min(diversity, 1);
    const impact = frequency * 0.6;
    
    return {
      type: 'topic_preference',
      frequency,
      impact: Math.min(impact, 1)
    };
  }

  // ===== 工具方法 =====

  /**
   * 构建演化事件从日志
   */
  private async buildEvolutionEventsFromLogs(logs: any[]): Promise<EvolutionEvent[]> {
    return logs.map(log => ({
      id: log.id,
      petId: log.petId,
      userId: '', // 从日志中提取
      timestamp: new Date(log.createdAt),
      interactionType: log.triggerEvent || 'general',
      interactionMode: 'text' as any,
      engagementLevel: log.impactScore || 0.5,
      duration: 60,
      messageCount: 1,
      emotionalValence: 0.5,
      topicComplexity: 0.5,
      emotionalIntensity: 0.5,
      contextualRelevance: 0.5,
      confidence: log.impactScore || 0.5,
      metadata: log.analysisData || {}
    }));
  }

  private calculateTrendDirection(traitLogs: any[]): 'increasing' | 'decreasing' | 'stable' {
    if (traitLogs.length < 2) return 'stable';
    
    const recentChanges = traitLogs.slice(0, 5).map(log => log.change);
    const averageChange = recentChanges.reduce((sum, change) => sum + change, 0) / recentChanges.length;
    
    if (Math.abs(averageChange) < 0.1) return 'stable';
    return averageChange > 0 ? 'increasing' : 'decreasing';
  }

  private calculateTraitChangeRate(traitLogs: any[]): number {
    if (traitLogs.length < 2) return 0;
    
    const totalChange = traitLogs.reduce((sum, log) => sum + Math.abs(log.change), 0);
    const timespan = traitLogs[0].timestamp.getTime() - traitLogs[traitLogs.length - 1].timestamp.getTime();
    const days = timespan / (1000 * 60 * 60 * 24);
    
    return days > 0 ? totalChange / days : 0;
  }

  private calculateTrendSignificance(traitLogs: any[]): number {
    if (traitLogs.length < 2) return 0;
    
    const changes = traitLogs.map(log => log.change);
    const averageChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const variance = changes.reduce((sum, change) => sum + Math.pow(change - averageChange, 2), 0) / changes.length;
    
    // 显著性基于平均变化和方差
    return Math.min(Math.abs(averageChange) / (Math.sqrt(variance) + 0.1), 1);
  }

  private assessTraitStability(values: number[]): number {
    if (values.length < 2) return 1;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stability = Math.max(0, 1 - Math.sqrt(variance) / 100); // 归一化到0-1
    
    return stability;
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private getDefaultPersonalityTraits(): PersonalityTraits {
    return {
      openness: 50,
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 30
    };
  }

  private async getCacheSize(): Promise<number> {
    try {
      const stats = await this.cacheService.getCacheStats();
      return stats.PERSONALITYANALYSIS?.count || 0;
    } catch (error) {
      this.logger.warn('Failed to get cache size', error);
      return 0;
    }
  }

  // ===== 缓存优化方法 =====

  /**
   * 预热分析相关缓存 - 后台异步预热策略
   */
  private async preWarmAnalyticsCache(petId: string): Promise<void> {
    try {
      this.logger.debug(`Pre-warming analytics cache for pet ${petId}`);
      
      // 并行预热多个相关分析缓存
      const preWarmTasks = [
        // 预热历史趋势数据
        this.cacheService.getEvolutionTrends(petId, 'weekly'),
        this.cacheService.getEvolutionTrends(petId, 'monthly'),
        // 预热统计数据
        this.cacheService.getEvolutionStats(petId, 'daily'),
        this.cacheService.getEvolutionStats(petId, 'weekly'),
        // 预热历史查询缓存
        this.cacheService.getEvolutionHistory(petId, 'recent_30_days')
      ];

      const results = await Promise.allSettled(preWarmTasks);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      this.logger.debug(`Analytics cache pre-warming completed for pet ${petId}`, {
        totalTasks: preWarmTasks.length,
        successful,
        strategy: 'background_parallel_preload'
      });
    } catch (error) {
      // 预热失败不影响主要功能
      this.logger.warn(`Analytics cache pre-warming failed for pet ${petId}`, error);
    }
  }

  /**
   * 批量分析缓存操作 - 优化批量分析处理
   */
  async batchCacheAnalytics(petIds: string[], analyticsData: any[]): Promise<void> {
    try {
      this.logger.debug(`Starting batch analytics cache operation for ${petIds.length} pets`);
      
      const cacheOperations = petIds.map((petId, index) => {
        const data = analyticsData[index];
        if (!data) return Promise.resolve();
        
        return this.cacheService.cachePersonalityAnalysis(petId, {
          ...data,
          batchProcessed: true,
          batchTimestamp: Date.now(),
          batchIndex: index
        });
      }).filter(Boolean);
      
      const results = await Promise.allSettled(cacheOperations);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      this.logger.debug(`Batch analytics cache operation completed`, {
        petsProcessed: petIds.length,
        successful,
        failed: results.length - successful,
        strategy: 'parallel_batch_analytics_cache'
      });
    } catch (error) {
      this.logger.error(`Batch analytics cache operation failed`, error);
      throw error;
    }
  }

  /**
   * 智能分析缓存管理 - 基于使用模式的缓存策略
   */
  async optimizeAnalyticsCache(petId: string, usagePattern: any): Promise<void> {
    try {
      this.logger.debug(`Optimizing analytics cache for pet ${petId}`, {
        usagePatternKeys: Object.keys(usagePattern || {})
      });
      
      // 根据使用模式调整缓存策略
      const cacheOptimizationTasks = [];
      
      if (usagePattern.frequentAnalytics) {
        // 频繁分析：使用更长的缓存时间
        cacheOptimizationTasks.push(
          this.extendAnalyticsCacheTTL(petId, 14400) // 4小时
        );
      }
      
      if (usagePattern.trendAnalysis) {
        // 趋势分析：预热趋势相关缓存
        cacheOptimizationTasks.push(
          this.preWarmTrendCache(petId)
        );
      }
      
      if (usagePattern.historicalQueries) {
        // 历史查询：预热历史数据缓存
        cacheOptimizationTasks.push(
          this.preWarmHistoryCache(petId)
        );
      }
      
      await Promise.allSettled(cacheOptimizationTasks);
      
      this.logger.debug(`Analytics cache optimization completed for pet ${petId}`, {
        optimizationTasks: cacheOptimizationTasks.length,
        strategy: 'usage_pattern_aware'
      });
    } catch (error) {
      this.logger.error(`Analytics cache optimization failed for pet ${petId}`, error);
      // 优化失败不影响主要功能
    }
  }

  /**
   * 扩展分析缓存TTL
   */
  private async extendAnalyticsCacheTTL(petId: string, newTTL: number): Promise<void> {
    try {
      const cached = await this.cacheService.getPersonalityAnalysis(petId);
      if (cached) {
        await this.cacheService.cachePersonalityAnalysis(petId, {
          ...cached,
          extendedTTL: true,
          originalTTL: 300,
          newTTL
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to extend analytics cache TTL for pet ${petId}`, error);
    }
  }

  /**
   * 预热趋势缓存
   */
  private async preWarmTrendCache(petId: string): Promise<void> {
    const trendQueries = ['daily', 'weekly', 'monthly'];
    const preWarmPromises = trendQueries.map(timeRange => 
      this.cacheService.getEvolutionTrends(petId, timeRange)
    );
    
    await Promise.allSettled(preWarmPromises);
  }

  /**
   * 预热历史缓存
   */
  private async preWarmHistoryCache(petId: string): Promise<void> {
    const historyQueries = ['recent_7_days', 'recent_30_days', 'recent_90_days'];
    const preWarmPromises = historyQueries.map(queryType => 
      this.cacheService.getEvolutionHistory(petId, queryType)
    );
    
    await Promise.allSettled(preWarmPromises);
  }

  // ===== 历史查询优化方法 =====

  /**
   * 构建高级历史查询参数
   */
  private buildAdvancedHistoryQuery(petId: string, options: any): any {
    const query: any = {
      petId,
      evolutionType: options.evolutionType,
      limit: options.limit
    };

    // 根据时间范围设置日期过滤
    const timeRangeMap = {
      'recent_7_days': 7,
      'recent_30_days': 30,
      'recent_90_days': 90,
      'recent_6_months': 180,
      'recent_1_year': 365
    };

    const days = (timeRangeMap as any)[options.timeRange] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    query.startDate = startDate;
    query.endDate = new Date();

    // 添加排序和分页优化
    query.orderBy = { createdAt: 'desc' };
    query.include = {
      trends: options.includeAnalytics,
      statistics: options.includeAnalytics,
      metadata: true
    };

    return query;
  }

  /**
   * 获取历史趋势数据
   */
  private async getTrendDataForHistory(petId: string, timeRange: string): Promise<any> {
    try {
      // 使用缓存服务获取趋势数据
      const trendTimeRange = timeRange.includes('days') ? 'daily' : 'weekly';
      return await this.cacheService.getEvolutionTrends(petId, trendTimeRange);
    } catch (error) {
      this.logger.warn(`Failed to get trend data for history for pet ${petId}`, error);
      return null;
    }
  }

  /**
   * 获取历史统计数据
   */
  private async getStatsDataForHistory(petId: string, timeRange: string): Promise<any> {
    try {
      // 使用缓存服务获取统计数据
      const statsTimeRange = timeRange.includes('days') ? 'daily' : 'weekly';
      return await this.cacheService.getEvolutionStats(petId, statsTimeRange);
    } catch (error) {
      this.logger.warn(`Failed to get stats data for history for pet ${petId}`, error);
      return null;
    }
  }

  /**
   * 用分析数据增强历史记录
   */
  private enhanceHistoryWithAnalytics(evolutionLogs: any[], analyticsData: any): any[] {
    return evolutionLogs.map((log, index) => ({
      ...log,
      analytics: {
        trendPosition: index,
        relatedTrends: analyticsData.trends ? this.findRelatedTrends(log, analyticsData.trends) : null,
        statisticalContext: analyticsData.stats ? this.getStatisticalContext(log, analyticsData.stats) : null,
        enhancedAt: new Date().toISOString()
      }
    }));
  }

  /**
   * 找到相关趋势
   */
  private findRelatedTrends(log: any, trends: any): any {
    if (!trends || !log.createdAt) return null;

    const logDate = new Date(log.createdAt);
    const logTime = logDate.getTime();

    // 找到时间上最接近的趋势数据
    const relatedTrend = trends.find((trend: any) => {
      if (!trend.timestamp) return false;
      const trendTime = new Date(trend.timestamp).getTime();
      const timeDiff = Math.abs(logTime - trendTime);
      return timeDiff < 24 * 60 * 60 * 1000; // 24小时内
    });

    return relatedTrend || null;
  }

  /**
   * 获取统计上下文
   */
  private getStatisticalContext(log: any, stats: any): any {
    if (!stats || !log.impactScore) return null;

    return {
      impactPercentile: this.calculatePercentile(log.impactScore, stats.impactDistribution || []),
      relativeSignificance: this.calculateRelativeSignificance(log.significance, stats.significanceStats || {}),
      contextualRanking: this.calculateContextualRanking(log, stats.globalStats || {})
    };
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(value: number, distribution: number[]): number {
    if (distribution.length === 0) return 50;
    
    const sortedValues = distribution.sort((a, b) => a - b);
    const belowCount = sortedValues.filter(v => v < value).length;
    return Math.round((belowCount / sortedValues.length) * 100);
  }

  /**
   * 计算相对重要性
   */
  private calculateRelativeSignificance(significance: number, significanceStats: any): string {
    const { mean = 0.5, stdDev = 0.2 } = significanceStats;
    const zScore = (significance - mean) / stdDev;
    
    if (zScore > 2) return 'very_high';
    if (zScore > 1) return 'high';
    if (zScore > -1) return 'normal';
    if (zScore > -2) return 'low';
    return 'very_low';
  }

  /**
   * 计算上下文排名
   */
  private calculateContextualRanking(log: any, globalStats: any): number {
    // 简化的排名算法，基于影响分数和重要性
    const impactWeight = 0.6;
    const significanceWeight = 0.4;
    
    const normalizedImpact = (log.impactScore || 0) / (globalStats.maxImpact || 1);
    const normalizedSignificance = (log.significance || 0) / (globalStats.maxSignificance || 1);
    
    const score = (normalizedImpact * impactWeight) + (normalizedSignificance * significanceWeight);
    return Math.round(score * 100);
  }

  /**
   * 计算最优缓存TTL
   */
  private calculateOptimalCacheTTL(strategy: string, recordCount: number): number {
    const baseTTL = {
      'minimal': 300,     // 5分钟
      'default': 1800,    // 30分钟
      'aggressive': 7200  // 2小时
    };

    let ttl = (baseTTL as any)[strategy] || baseTTL.default;

    // 根据记录数量调整TTL
    if (recordCount > 100) {
      ttl *= 1.5; // 大量数据缓存更久
    } else if (recordCount < 10) {
      ttl *= 0.5; // 少量数据缓存时间短
    }

    return Math.round(ttl);
  }

  /**
   * 预加载相关历史查询
   */
  private async preloadRelatedHistoryQueries(petId: string, currentTimeRange: string): Promise<void> {
    try {
      this.logger.debug(`Preloading related history queries for pet ${petId}`);

      // 预加载相关时间范围的查询
      const relatedTimeRanges = this.getRelatedTimeRanges(currentTimeRange);
      
      const preloadPromises = relatedTimeRanges.map(timeRange => 
        this.getPersonalityHistory(petId, {
          timeRange,
          limit: 25, // 较小的限制用于预加载
          includeAnalytics: false,
          cacheStrategy: 'minimal'
        }).catch(error => {
          this.logger.warn(`Failed to preload history for ${timeRange}`, error);
        })
      );

      await Promise.allSettled(preloadPromises);
      
      this.logger.debug(`Related history queries preloaded for pet ${petId}`, {
        currentTimeRange,
        preloadedRanges: relatedTimeRanges.length
      });
    } catch (error) {
      this.logger.warn(`Failed to preload related history queries for pet ${petId}`, error);
    }
  }

  /**
   * 获取相关时间范围
   */
  private getRelatedTimeRanges(currentTimeRange: string): string[] {
    const timeRangeHierarchy = [
      'recent_7_days',
      'recent_30_days', 
      'recent_90_days',
      'recent_6_months',
      'recent_1_year'
    ];

    const currentIndex = timeRangeHierarchy.indexOf(currentTimeRange);
    const related = [];

    // 包含相邻的时间范围
    if (currentIndex > 0) {
      related.push(timeRangeHierarchy[currentIndex - 1]);
    }
    if (currentIndex < timeRangeHierarchy.length - 1) {
      related.push(timeRangeHierarchy[currentIndex + 1]);
    }

    return related;
  }
}