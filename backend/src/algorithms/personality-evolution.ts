/**
 * 个性演化引擎 - 流水线架构实现
 * 基于五阶段流水线的个性特质动态调整和演化计算
 */

import {
  PersonalityTrait,
  InteractionType,
  InteractionMode,
  EngagementLevel,
  EvolutionEvent,
  InteractionPattern,
  EvolutionLimits,
  PersonalityAdjustment,
  EvolutionResult,
  EvolutionContext,
  BaselineAnchoringConfig,
  TimeWindow,
  DEFAULT_PERSONALITY_TRAITS,
  MINIMUM_TRAIT_CHANGE,
  PERSONALITY_ALGORITHM_VERSION,
} from './types/personality.types';

import {
  INTERACTION_WEIGHTS,
  MODE_WEIGHT_MULTIPLIERS,
  ENGAGEMENT_WEIGHT_MULTIPLIERS,
  EVOLUTION_LIMITS,
  BASELINE_ANCHORING_CONFIG,
  TIME_DECAY_PARAMETERS,
  PERFORMANCE_CONFIG,
  DEBUG_CONFIG,
} from '../config/personality-evolution.config';

/**
 * 个性演化引擎主类
 * 实现基于流水线架构的个性特质演化算法
 */
export class PersonalityEvolutionEngine {
  private readonly config: {
    interactionWeights: typeof INTERACTION_WEIGHTS;
    modeMultipliers: typeof MODE_WEIGHT_MULTIPLIERS;
    engagementMultipliers: typeof ENGAGEMENT_WEIGHT_MULTIPLIERS;
    evolutionLimits: EvolutionLimits;
    baselineAnchoring: BaselineAnchoringConfig;
    timeDecay: typeof TIME_DECAY_PARAMETERS;
    performance: typeof PERFORMANCE_CONFIG;
    debug: typeof DEBUG_CONFIG;
  };

  private readonly algorithmVersion: string;
  private readonly cache: Map<string, any>;
  private readonly processingStats: {
    totalProcessed: number;
    averageProcessingTime: number;
    cacheHitRate: number;
    errorCount: number;
  };

  constructor(customConfig?: Partial<typeof this.config>) {
    this.config = {
      interactionWeights: INTERACTION_WEIGHTS,
      modeMultipliers: MODE_WEIGHT_MULTIPLIERS,
      engagementMultipliers: ENGAGEMENT_WEIGHT_MULTIPLIERS,
      evolutionLimits: EVOLUTION_LIMITS,
      baselineAnchoring: BASELINE_ANCHORING_CONFIG,
      timeDecay: TIME_DECAY_PARAMETERS,
      performance: PERFORMANCE_CONFIG,
      debug: DEBUG_CONFIG,
      ...customConfig,
    };

    this.algorithmVersion = PERSONALITY_ALGORITHM_VERSION;
    this.cache = new Map();
    this.processingStats = {
      totalProcessed: 0,
      averageProcessingTime: 0,
      cacheHitRate: 0,
      errorCount: 0,
    };

    this.log('info', '个性演化引擎初始化完成', {
      algorithmVersion: this.algorithmVersion,
      cacheEnabled: this.config.performance.caching.enabled,
    });
  }

  /**
   * 阶段1: 分析互动模式并计算统计指标
   * 根据历史互动数据分析用户行为模式和参与度
   */
  public analyzeInteractionPatterns(
    events: EvolutionEvent[],
    timeWindow: TimeWindow = TimeWindow.WEEKLY,
  ): InteractionPattern {
    const startTime = Date.now();
    const cacheKey = `pattern_${events.map(e => e.id).join('_')}_${timeWindow}`;

    // 检查缓存
    if (this.config.performance.caching.enabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        this.updateCacheStats(true);
        return cached.data;
      }
    }

    this.log('debug', '开始分析互动模式', {
      eventCount: events.length,
      timeWindow,
    });

    // 基础统计
    const totalInteractions = events.length;
    const totalDuration = events.reduce((sum, event) => sum + event.duration, 0);
    const averageSessionLength = totalInteractions > 0 ? totalDuration / totalInteractions : 0;

    // 计算互动频率 (基于时间窗口)
    const timeWindowDays = this.getTimeWindowDays(timeWindow);
    const interactionFrequency = totalInteractions / timeWindowDays;

    // 类型分布统计
    const typeDistribution = this.calculateTypeDistribution(events);
    const modeDistribution = this.calculateModeDistribution(events);
    const engagementDistribution = this.calculateEngagementDistribution(events);

    // 参与度指标
    const averageEngagement = this.calculateAverageEngagement(events);
    const responseTimeVariance = this.calculateResponseTimeVariance(events);
    const topicDiversity = this.calculateTopicDiversity(events);

    // 趋势分析
    const engagementTrend = this.calculateEngagementTrend(events);
    const complexityTrend = this.calculateComplexityTrend(events);
    const satisfactionTrend = this.calculateSatisfactionTrend(events);

    // 时间模式分析
    const preferredTimeSlots = this.analyzeTimePreferences(events);
    const weekdayPattern = this.analyzeWeekdayPattern(events);
    const seasonalPattern = this.analyzeSeasonalPattern(events);

    const pattern: InteractionPattern = {
      userId: events[0]?.userId || '',
      petId: events[0]?.petId || '',
      timeWindow,
      totalInteractions,
      averageSessionLength,
      interactionFrequency,
      typeDistribution,
      modeDistribution,
      engagementDistribution,
      averageEngagement,
      responseTimeVariance,
      topicDiversity,
      engagementTrend,
      complexityTrend,
      satisfactionTrend,
      preferredTimeSlots,
      weekdayPattern,
      seasonalPattern,
    };

    // 缓存结果
    if (this.config.performance.caching.enabled) {
      this.cache.set(cacheKey, {
        data: pattern,
        timestamp: Date.now(),
      });
      this.updateCacheStats(false);
    }

    const processingTime = Date.now() - startTime;
    this.log('debug', '互动模式分析完成', {
      processingTime,
      totalInteractions,
      averageEngagement: pattern.averageEngagement.toFixed(3),
    });

    return pattern;
  }

  /**
   * 阶段2: 基于权重表计算原始调整值
   * 根据互动类型、模式和参与度计算每个特质的原始变化量
   */
  public calculateRawAdjustment(
    events: EvolutionEvent[],
    pattern: InteractionPattern,
  ): Record<PersonalityTrait, number> {
    const startTime = Date.now();
    
    this.log('debug', '开始计算原始调整值', {
      eventCount: events.length,
      averageEngagement: pattern.averageEngagement,
    });

    const rawAdjustments: Record<PersonalityTrait, number> = {
      ...DEFAULT_PERSONALITY_TRAITS,
    };

    // 重置所有特质调整值为0
    Object.keys(rawAdjustments).forEach(trait => {
      rawAdjustments[trait as PersonalityTrait] = 0;
    });

    // 处理每个事件
    for (const event of events) {
      const eventWeight = this.calculateEventWeight(event, pattern);
      const baseWeights = this.config.interactionWeights[event.interactionType];
      
      if (!baseWeights) {
        this.log('warn', '未找到互动类型权重配置', {
          interactionType: event.interactionType,
          eventId: event.id,
        });
        continue;
      }

      // 应用模式和参与度修正器
      const modeMultiplier = this.config.modeMultipliers[event.interactionMode] || 1.0;
      const engagementMultiplier = this.config.engagementMultipliers[event.engagementLevel] || 1.0;
      
      // 计算时间衰减权重
      const timeDecayWeight = this.calculateTimeDecayWeight(event.timestamp);
      
      // 计算最终权重
      const finalMultiplier = eventWeight * modeMultiplier * engagementMultiplier * timeDecayWeight;

      // 应用到每个特质
      Object.entries(baseWeights).forEach(([trait, weight]) => {
        const traitKey = trait as PersonalityTrait;
        const adjustedWeight = weight * finalMultiplier;
        
        // 考虑情感强度和话题复杂度的影响
        const emotionalBoost = event.emotionalIntensity * 0.2;
        const complexityBoost = event.topicComplexity * 0.15;
        const totalBoost = 1 + emotionalBoost + complexityBoost;
        
        rawAdjustments[traitKey] += adjustedWeight * totalBoost;
      });
    }

    // 应用互动频率调整
    const frequencyAdjustment = this.calculateFrequencyAdjustment(pattern.interactionFrequency);
    Object.keys(rawAdjustments).forEach(trait => {
      rawAdjustments[trait as PersonalityTrait] *= frequencyAdjustment;
    });

    // 标准化调整值 (确保在合理范围内)
    this.normalizeAdjustments(rawAdjustments);

    const processingTime = Date.now() - startTime;
    this.log('debug', '原始调整值计算完成', {
      processingTime,
      maxAdjustment: Math.max(...Object.values(rawAdjustments)),
      minAdjustment: Math.min(...Object.values(rawAdjustments)),
    });

    return rawAdjustments;
  }

  /**
   * 阶段3: 应用基线锚定拉力机制
   * 根据基线配置对调整值应用锚定拉力，保持个性稳定性
   */
  public applyBaselineAnchoring(
    rawAdjustments: Record<PersonalityTrait, number>,
    currentTraits: Record<PersonalityTrait, number>,
    petAge: number, // 天数
  ): Record<PersonalityTrait, number> {
    const startTime = Date.now();
    
    this.log('debug', '开始应用基线锚定', {
      petAge,
      anchoringStrength: this.config.baselineAnchoring.anchoringStrength,
    });

    const anchoredAdjustments: Record<PersonalityTrait, number> = { ...rawAdjustments };
    const config = this.config.baselineAnchoring;

    Object.entries(anchoredAdjustments).forEach(([trait, adjustment]) => {
      const traitKey = trait as PersonalityTrait;
      const currentValue = currentTraits[traitKey];
      const baselineValue = config.personalityBaseline[traitKey];
      
      // 计算与基线的距离
      const distanceFromBaseline = currentValue - baselineValue;
      
      // 计算年龄相关的锚定强度 (新宠物更容易变化)
      const ageAdjustedStrength = this.calculateAgeAdjustedAnchoringStrength(petAge);
      
      // 计算时间衰减影响
      const timeDecayInfluence = this.calculateTimeDecayInfluence(petAge);
      
      // 计算锚定拉力 (向基线拉回的力量)
      const anchoringPull = -distanceFromBaseline * ageAdjustedStrength * timeDecayInfluence;
      
      // 应用自适应调整
      const adaptiveAdjustment = this.calculateAdaptiveAdjustment(
        traitKey,
        currentValue,
        baselineValue,
        petAge,
      );
      
      // 计算最终调整值
      const finalAdjustment = adjustment + anchoringPull + adaptiveAdjustment;
      
      anchoredAdjustments[traitKey] = finalAdjustment;
      
      this.log('debug', `特质 ${trait} 锚定调整`, {
        original: adjustment.toFixed(4),
        anchoringPull: anchoringPull.toFixed(4),
        adaptive: adaptiveAdjustment.toFixed(4),
        final: finalAdjustment.toFixed(4),
      });
    });

    const processingTime = Date.now() - startTime;
    this.log('debug', '基线锚定应用完成', {
      processingTime,
      averageAnchoringEffect: this.calculateAverageAnchoringEffect(rawAdjustments, anchoredAdjustments),
    });

    return anchoredAdjustments;
  }

  /**
   * 阶段4: 应用阶梯式边界限制
   * 根据日度、周度、月度限制对调整值进行边界约束
   */
  public applyEvolutionLimits(
    anchoredAdjustments: Record<PersonalityTrait, number>,
    currentTraits: Record<PersonalityTrait, number>,
    recentChanges: {
      daily: Record<PersonalityTrait, number>;
      weekly: Record<PersonalityTrait, number>;
      monthly: Record<PersonalityTrait, number>;
    },
  ): { limitedAdjustments: Record<PersonalityTrait, number>; appliedLimits: string[] } {
    const startTime = Date.now();
    
    this.log('debug', '开始应用演化限制', {
      dailyLimits: this.config.evolutionLimits.dailyLimits,
      weeklyLimits: this.config.evolutionLimits.weeklyLimits,
    });

    const limitedAdjustments: Record<PersonalityTrait, number> = { ...anchoredAdjustments };
    const appliedLimits: string[] = [];
    const limits = this.config.evolutionLimits;

    // 检查全局约束
    const simultaneousChanges = Object.values(limitedAdjustments).filter(
      adj => Math.abs(adj) > MINIMUM_TRAIT_CHANGE,
    ).length;

    if (simultaneousChanges > limits.globalConstraints.maxSimultaneousChanges) {
      // 只保留影响最大的特质变化
      const sortedTraits = Object.entries(limitedAdjustments)
        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
        .slice(0, limits.globalConstraints.maxSimultaneousChanges);

      Object.keys(limitedAdjustments).forEach(trait => {
        const traitKey = trait as PersonalityTrait;
        if (!sortedTraits.find(([t]) => t === trait)) {
          limitedAdjustments[traitKey] = 0;
        }
      });

      appliedLimits.push('同时变化特质数量限制');
    }

    // 应用特质特定限制
    Object.entries(limitedAdjustments).forEach(([trait, adjustment]) => {
      const traitKey = trait as PersonalityTrait;
      const currentValue = currentTraits[traitKey];
      const traitLimits = limits.traitLimits[traitKey];
      
      if (!traitLimits) return;

      let finalAdjustment = adjustment;

      // 应用变化阻力
      finalAdjustment *= (1 - traitLimits.changeResistance);

      // 应用易变性调整
      finalAdjustment *= traitLimits.volatility;

      // 检查值边界
      const newValue = currentValue + finalAdjustment;
      if (newValue < traitLimits.minValue) {
        finalAdjustment = traitLimits.minValue - currentValue;
        appliedLimits.push(`${trait}: 最小值限制`);
      } else if (newValue > traitLimits.maxValue) {
        finalAdjustment = traitLimits.maxValue - currentValue;
        appliedLimits.push(`${trait}: 最大值限制`);
      }

      // 检查日度变化限制
      const dailyChange = Math.abs(recentChanges.daily[traitKey] || 0);
      const proposedDailyChange = dailyChange + Math.abs(finalAdjustment);
      
      if (proposedDailyChange > limits.dailyLimits.maxChange) {
        const availableChange = limits.dailyLimits.maxChange - dailyChange;
        finalAdjustment = Math.sign(finalAdjustment) * Math.min(Math.abs(finalAdjustment), availableChange);
        appliedLimits.push(`${trait}: 日度变化限制`);
      }

      // 检查周度变化限制
      const weeklyChange = Math.abs(recentChanges.weekly[traitKey] || 0);
      const proposedWeeklyChange = weeklyChange + Math.abs(finalAdjustment);
      
      if (proposedWeeklyChange > limits.weeklyLimits.maxChange) {
        const availableChange = limits.weeklyLimits.maxChange - weeklyChange;
        finalAdjustment = Math.sign(finalAdjustment) * Math.min(Math.abs(finalAdjustment), availableChange);
        appliedLimits.push(`${trait}: 周度变化限制`);
      }

      // 检查月度变化限制
      const monthlyChange = Math.abs(recentChanges.monthly[traitKey] || 0);
      const proposedMonthlyChange = monthlyChange + Math.abs(finalAdjustment);
      
      if (proposedMonthlyChange > limits.monthlyLimits.maxChange) {
        const availableChange = limits.monthlyLimits.maxChange - monthlyChange;
        finalAdjustment = Math.sign(finalAdjustment) * Math.min(Math.abs(finalAdjustment), availableChange);
        appliedLimits.push(`${trait}: 月度变化限制`);
      }

      // 应用紧急制动
      if (Math.abs(finalAdjustment) > limits.globalConstraints.emergencyBrake) {
        finalAdjustment = Math.sign(finalAdjustment) * limits.globalConstraints.emergencyBrake;
        appliedLimits.push(`${trait}: 紧急制动`);
      }

      limitedAdjustments[traitKey] = finalAdjustment;
    });

    // 确保调整值满足最小变化阈值
    Object.keys(limitedAdjustments).forEach(trait => {
      const traitKey = trait as PersonalityTrait;
      if (Math.abs(limitedAdjustments[traitKey]) < MINIMUM_TRAIT_CHANGE) {
        limitedAdjustments[traitKey] = 0;
      }
    });

    const processingTime = Date.now() - startTime;
    this.log('debug', '演化限制应用完成', {
      processingTime,
      appliedLimitsCount: appliedLimits.length,
      finalNonZeroChanges: Object.values(limitedAdjustments).filter(adj => adj !== 0).length,
    });

    return { limitedAdjustments, appliedLimits };
  }

  /**
   * 阶段5: 主控制器方法 - 增量计算模式
   * 协调整个演化流程，实现增量计算优化
   */
  public async processPersonalityEvolution(
    petId: string,
    userId: string,
    events: EvolutionEvent[],
    currentTraits: Record<PersonalityTrait, number>,
    context: EvolutionContext,
  ): Promise<EvolutionResult> {
    const startTime = Date.now();
    const evolutionId = `evolution_${petId}_${Date.now()}`;
    
    this.log('info', '开始个性演化处理', {
      evolutionId,
      petId,
      eventCount: events.length,
    });

    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // 验证输入数据
      this.validateInputData(events, currentTraits, context);

      // 过滤和预处理事件
      const processedEvents = this.preprocessEvents(events);
      
      if (processedEvents.length === 0) {
        return this.createEmptyEvolutionResult(evolutionId, petId, startTime);
      }

      // 阶段1: 分析互动模式
      const interactionPattern = this.analyzeInteractionPatterns(processedEvents, TimeWindow.WEEKLY);

      // 阶段2: 计算原始调整值
      const rawAdjustments = this.calculateRawAdjustment(processedEvents, interactionPattern);

      // 计算宠物年龄 (天数)
      const petAge = Math.floor((Date.now() - context.pet.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // 阶段3: 应用基线锚定
      const anchoredAdjustments = this.applyBaselineAnchoring(rawAdjustments, currentTraits, petAge);

      // 获取近期变化数据 (需要从数据库获取)
      const recentChanges = await this.getRecentChanges(petId);

      // 阶段4: 应用演化限制
      const { limitedAdjustments, appliedLimits } = this.applyEvolutionLimits(
        anchoredAdjustments,
        currentTraits,
        recentChanges,
      );

      // 计算新的个性特质值
      const newPersonalityTraits: Record<PersonalityTrait, number> = { ...currentTraits };
      Object.entries(limitedAdjustments).forEach(([trait, adjustment]) => {
        const traitKey = trait as PersonalityTrait;
        newPersonalityTraits[traitKey] = Math.max(0, Math.min(1, currentTraits[traitKey] + adjustment));
      });

      // 计算置信度
      const confidence = this.calculateConfidence(processedEvents, interactionPattern, appliedLimits);

      // 创建个性调整结果
      const personalityAdjustment: PersonalityAdjustment = {
        traitChanges: limitedAdjustments,
        confidence,
        reason: this.generateAdjustmentReason(processedEvents, interactionPattern),
        appliedLimits,
        metadata: {
          originalValues: currentTraits,
          rawChanges: rawAdjustments,
          limitedChanges: limitedAdjustments,
          stabilityScore: this.calculateStabilityScore(limitedAdjustments),
        },
      };

      const processingTime = Date.now() - startTime;

      // 更新统计信息
      this.updateProcessingStats(processingTime);

      // 创建演化结果
      const result: EvolutionResult = {
        success: true,
        petId,
        evolutionId,
        personalityAdjustment,
        newPersonalityTraits,
        processedEvents,
        interactionPattern,
        processingTime,
        eventsProcessed: processedEvents.length,
        timestamp: new Date(),
        algorithmVersion: this.algorithmVersion,
        configSnapshot: JSON.stringify(this.config),
        warnings,
        errors,
      };

      this.log('info', '个性演化处理完成', {
        evolutionId,
        processingTime,
        eventsProcessed: result.eventsProcessed,
        confidence: confidence.toFixed(3),
        appliedLimitsCount: appliedLimits.length,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      errors.push(errorMessage);
      
      this.log('error', '个性演化处理失败', {
        evolutionId,
        error: errorMessage,
        petId,
      });

      this.processingStats.errorCount++;

      return {
        success: false,
        petId,
        evolutionId,
        personalityAdjustment: {
          traitChanges: { ...DEFAULT_PERSONALITY_TRAITS },
          confidence: 0,
          reason: '处理失败',
          appliedLimits: [],
          metadata: {
            originalValues: currentTraits,
            rawChanges: { ...DEFAULT_PERSONALITY_TRAITS },
            limitedChanges: { ...DEFAULT_PERSONALITY_TRAITS },
            stabilityScore: 0,
          },
        },
        newPersonalityTraits: currentTraits,
        processedEvents: [],
        interactionPattern: this.createEmptyInteractionPattern(userId, petId),
        processingTime: Date.now() - startTime,
        eventsProcessed: 0,
        timestamp: new Date(),
        algorithmVersion: this.algorithmVersion,
        configSnapshot: JSON.stringify(this.config),
        warnings,
        errors,
      };
    }
  }

  // 私有辅助方法会在下一部分实现...
  
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (this.shouldLog(level)) {
      console.log(`[PersonalityEvolution:${level.toUpperCase()}] ${message}`, data || '');
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = this.config.debug.logLevel;
    return levels.indexOf(level) >= levels.indexOf(configLevel);
  }

  // 私有辅助方法实现

  private calculateEventWeight(event: EvolutionEvent, _pattern: InteractionPattern): number {
    // 基于事件质量和模式一致性计算权重
    let weight = 1.0;
    
    // 基于消息数量的权重调整
    const messageCountWeight = Math.min(event.messageCount / 10, 1.5); // 最多1.5倍权重
    weight *= messageCountWeight;
    
    // 基于互动持续时间的权重调整
    const durationWeight = Math.min(event.duration / 1800, 1.2); // 30分钟为标准，最多1.2倍权重
    weight *= durationWeight;
    
    // 基于用户满意度的权重调整
    if (event.userSatisfaction !== undefined) {
      weight *= (0.5 + event.userSatisfaction); // 0.5-1.5倍权重
    }
    
    return Math.max(0.1, Math.min(weight, 2.0)); // 限制在0.1-2.0之间
  }

  private calculateTimeDecayWeight(timestamp: Date): number {
    const hoursSinceEvent = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
    const daysSinceEvent = hoursSinceEvent / 24;
    const halfLife = this.config.timeDecay.eventDecay.halfLife;
    
    return Math.max(
      this.config.timeDecay.eventDecay.minimumWeight,
      Math.pow(0.5, daysSinceEvent / halfLife),
    );
  }

  private getTimeWindowDays(timeWindow: TimeWindow): number {
    switch (timeWindow) {
      case TimeWindow.DAILY: return 1;
      case TimeWindow.WEEKLY: return 7;
      case TimeWindow.MONTHLY: return 30;
      case TimeWindow.QUARTERLY: return 90;
      default: return 7;
    }
  }

  private calculateTypeDistribution(events: EvolutionEvent[]): Record<InteractionType, number> {
    const total = events.length;
    if (total === 0) return {} as Record<InteractionType, number>;
    
    const distribution = {} as Record<InteractionType, number>;
    
    // 初始化所有类型为0
    Object.values(InteractionType).forEach(type => {
      distribution[type] = 0;
    });
    
    // 计算分布
    events.forEach(event => {
      distribution[event.interactionType] = (distribution[event.interactionType] || 0) + 1;
    });
    
    // 转换为比例
    Object.keys(distribution).forEach(type => {
      distribution[type as InteractionType] = distribution[type as InteractionType] / total;
    });
    
    return distribution;
  }

  private calculateModeDistribution(events: EvolutionEvent[]): Record<InteractionMode, number> {
    const total = events.length;
    if (total === 0) return {} as Record<InteractionMode, number>;
    
    const distribution = {} as Record<InteractionMode, number>;
    
    Object.values(InteractionMode).forEach(mode => {
      distribution[mode] = 0;
    });
    
    events.forEach(event => {
      distribution[event.interactionMode] = (distribution[event.interactionMode] || 0) + 1;
    });
    
    Object.keys(distribution).forEach(mode => {
      distribution[mode as InteractionMode] = distribution[mode as InteractionMode] / total;
    });
    
    return distribution;
  }

  private calculateEngagementDistribution(events: EvolutionEvent[]): Record<EngagementLevel, number> {
    const total = events.length;
    if (total === 0) return {} as Record<EngagementLevel, number>;
    
    const distribution = {} as Record<EngagementLevel, number>;
    
    Object.values(EngagementLevel).forEach(level => {
      distribution[level] = 0;
    });
    
    events.forEach(event => {
      distribution[event.engagementLevel] = (distribution[event.engagementLevel] || 0) + 1;
    });
    
    Object.keys(distribution).forEach(level => {
      distribution[level as EngagementLevel] = distribution[level as EngagementLevel] / total;
    });
    
    return distribution;
  }

  private calculateAverageEngagement(events: EvolutionEvent[]): number {
    if (events.length === 0) return 0;
    
    const engagementValues = {
      [EngagementLevel.LOW]: 0.25,
      [EngagementLevel.MEDIUM]: 0.5,
      [EngagementLevel.HIGH]: 0.75,
      [EngagementLevel.INTENSE]: 1.0,
    };
    
    const totalEngagement = events.reduce((sum, event) => {
      return sum + engagementValues[event.engagementLevel];
    }, 0);
    
    return totalEngagement / events.length;
  }

  private calculateResponseTimeVariance(events: EvolutionEvent[]): number {
    if (events.length === 0) return 0;
    
    const responseTimes = events.map(event => event.metadata.responseTime);
    const mean = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    
    const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / responseTimes.length;
    
    return Math.sqrt(variance);
  }

  private calculateTopicDiversity(events: EvolutionEvent[]): number {
    if (events.length === 0) return 0;
    
    const allTopics = new Set<string>();
    events.forEach(event => {
      event.metadata.topicTags.forEach(tag => allTopics.add(tag));
    });
    
    // 基于独特话题数量计算多样性
    const uniqueTopics = allTopics.size;
    const maxExpectedTopics = Math.min(events.length, 20); // 假设最多20个不同话题
    
    return Math.min(uniqueTopics / maxExpectedTopics, 1.0);
  }

  private calculateEngagementTrend(events: EvolutionEvent[]): number {
    if (events.length < 2) return 0;
    
    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const engagementValues = {
      [EngagementLevel.LOW]: 0.25,
      [EngagementLevel.MEDIUM]: 0.5,
      [EngagementLevel.HIGH]: 0.75,
      [EngagementLevel.INTENSE]: 1.0,
    };
    
    const firstHalf = sortedEvents.slice(0, Math.floor(sortedEvents.length / 2));
    const secondHalf = sortedEvents.slice(Math.floor(sortedEvents.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, event) => sum + engagementValues[event.engagementLevel], 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, event) => sum + engagementValues[event.engagementLevel], 0) / secondHalf.length;
    
    return secondHalfAvg - firstHalfAvg; // -1 to 1
  }

  private calculateComplexityTrend(events: EvolutionEvent[]): number {
    if (events.length < 2) return 0;
    
    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstHalf = sortedEvents.slice(0, Math.floor(sortedEvents.length / 2));
    const secondHalf = sortedEvents.slice(Math.floor(sortedEvents.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, event) => sum + event.topicComplexity, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, event) => sum + event.topicComplexity, 0) / secondHalf.length;
    
    return secondHalfAvg - firstHalfAvg; // -1 to 1
  }

  private calculateSatisfactionTrend(events: EvolutionEvent[]): number {
    const eventsWithSatisfaction = events.filter(event => event.userSatisfaction !== undefined);
    
    if (eventsWithSatisfaction.length < 2) return 0;
    
    const sortedEvents = eventsWithSatisfaction.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstHalf = sortedEvents.slice(0, Math.floor(sortedEvents.length / 2));
    const secondHalf = sortedEvents.slice(Math.floor(sortedEvents.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, event) => sum + (event.userSatisfaction || 0), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, event) => sum + (event.userSatisfaction || 0), 0) / secondHalf.length;
    
    return secondHalfAvg - firstHalfAvg; // -1 to 1
  }

  private analyzeTimePreferences(events: EvolutionEvent[]): number[] {
    const hourCounts = new Array(24).fill(0);
    
    events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourCounts[hour]++;
    });
    
    const total = events.length;
    return hourCounts.map(count => count / total);
  }

  private analyzeWeekdayPattern(events: EvolutionEvent[]): number[] {
    const weekdayCounts = new Array(7).fill(0);
    
    events.forEach(event => {
      const weekday = event.timestamp.getDay();
      weekdayCounts[weekday]++;
    });
    
    const total = events.length;
    return weekdayCounts.map(count => count / total);
  }

  private analyzeSeasonalPattern(events: EvolutionEvent[]): Record<string, number> {
    const seasonCounts = { spring: 0, summer: 0, autumn: 0, winter: 0 };
    
    events.forEach(event => {
      const month = event.timestamp.getMonth() + 1;
      if (month >= 3 && month <= 5) seasonCounts.spring++;
      else if (month >= 6 && month <= 8) seasonCounts.summer++;
      else if (month >= 9 && month <= 11) seasonCounts.autumn++;
      else seasonCounts.winter++;
    });
    
    const total = events.length;
    return {
      spring: seasonCounts.spring / total,
      summer: seasonCounts.summer / total,
      autumn: seasonCounts.autumn / total,
      winter: seasonCounts.winter / total,
    };
  }

  private calculateFrequencyAdjustment(frequency: number): number {
    // 基于互动频率调整权重，频率越高影响越大
    const optimalFrequency = 5; // 每天5次互动为最优
    const ratio = frequency / optimalFrequency;
    
    if (ratio <= 1) {
      return 0.5 + 0.5 * ratio; // 0.5 to 1.0
    } else {
      return Math.min(1.0 + 0.2 * Math.log(ratio), 1.5); // 最多1.5倍
    }
  }

  private normalizeAdjustments(adjustments: Record<PersonalityTrait, number>): void {
    const maxAdjustment = Math.max(...Object.values(adjustments).map(Math.abs));
    
    if (maxAdjustment > 0.3) { // 单次调整不应超过30%
      const scale = 0.3 / maxAdjustment;
      Object.keys(adjustments).forEach(trait => {
        adjustments[trait as PersonalityTrait] *= scale;
      });
    }
  }

  private calculateAgeAdjustedAnchoringStrength(petAge: number): number {
    const baseStrength = this.config.baselineAnchoring.anchoringStrength;
    
    // 新宠物(< 7天)锚定强度较低，老宠物(> 30天)锚定强度较高
    if (petAge < 7) {
      return baseStrength * 0.6; // 60%强度
    } else if (petAge < 30) {
      return baseStrength * (0.6 + 0.4 * (petAge - 7) / 23); // 60%-100%渐变
    } else {
      return baseStrength * 1.2; // 120%强度
    }
  }

  private calculateTimeDecayInfluence(petAge: number): number {
    const decayConfig = this.config.baselineAnchoring.timeDecayConfig;
    const decayRate = decayConfig.decayRate;
    
    switch (decayConfig.decayFunction) {
      case 'linear':
        return Math.max(decayConfig.minimumInfluence, 1 - decayRate * petAge);
      case 'exponential':
        return Math.max(decayConfig.minimumInfluence, Math.exp(-decayRate * petAge));
      case 'logarithmic':
        return Math.max(decayConfig.minimumInfluence, 1 - decayRate * Math.log(petAge + 1));
      default:
        return 1.0;
    }
  }

  private calculateAdaptiveAdjustment(
    _trait: PersonalityTrait,
    currentValue: number,
    baselineValue: number,
    petAge: number,
  ): number {
    const adaptiveConfig = this.config.baselineAnchoring.adaptiveConfig;
    
    // 如果宠物年龄小于稳定化周期，不应用自适应调整
    if (petAge < adaptiveConfig.stabilizationPeriod) {
      return 0;
    }
    
    const distanceFromBaseline = Math.abs(currentValue - baselineValue);
    
    // 如果距离基线超过适应阈值，考虑调整基线
    if (distanceFromBaseline > adaptiveConfig.adaptationThreshold) {
      const adjustmentDirection = currentValue > baselineValue ? 1 : -1;
      const adjustmentMagnitude = Math.min(
        adaptiveConfig.learningRate * distanceFromBaseline,
        adaptiveConfig.maxBaslineShift,
      );
      
      return adjustmentDirection * adjustmentMagnitude;
    }
    
    return 0;
  }

  private calculateAverageAnchoringEffect(
    rawAdjustments: Record<PersonalityTrait, number>,
    anchoredAdjustments: Record<PersonalityTrait, number>,
  ): number {
    const effects = Object.keys(rawAdjustments).map(trait => {
      const traitKey = trait as PersonalityTrait;
      const raw = rawAdjustments[traitKey];
      const anchored = anchoredAdjustments[traitKey];
      return raw !== 0 ? Math.abs(anchored - raw) / Math.abs(raw) : 0;
    });
    
    return effects.reduce((sum, effect) => sum + effect, 0) / effects.length;
  }

  private async getRecentChanges(_petId: string): Promise<{
    daily: Record<PersonalityTrait, number>;
    weekly: Record<PersonalityTrait, number>;
    monthly: Record<PersonalityTrait, number>;
  }> {
    // 这里应该从数据库获取近期变化数据
    // 目前返回空数据作为占位符
    const emptyChanges = {} as Record<PersonalityTrait, number>;
    Object.values(PersonalityTrait).forEach(trait => {
      emptyChanges[trait] = 0;
    });
    
    return {
      daily: { ...emptyChanges },
      weekly: { ...emptyChanges },
      monthly: { ...emptyChanges },
    };
  }

  private isCacheValid(timestamp: number): boolean {
    const cacheExpiry = this.config.timeDecay.cacheExpiry.interactionPatterns * 1000;
    return (Date.now() - timestamp) < cacheExpiry;
  }

  private updateCacheStats(isHit: boolean): void {
    // 更新缓存统计
    if (isHit) {
      this.processingStats.cacheHitRate = (this.processingStats.cacheHitRate * 0.9) + (1 * 0.1);
    } else {
      this.processingStats.cacheHitRate = (this.processingStats.cacheHitRate * 0.9) + (0 * 0.1);
    }
  }

  private validateInputData(
    events: EvolutionEvent[],
    currentTraits: Record<PersonalityTrait, number>,
    context: EvolutionContext,
  ): void {
    if (!events || events.length === 0) {
      throw new Error('演化事件不能为空');
    }
    
    if (!currentTraits) {
      throw new Error('当前个性特质不能为空');
    }
    
    // 验证特质值范围
    Object.entries(currentTraits).forEach(([trait, value]) => {
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new Error(`特质 ${trait} 的值必须在0-1之间，当前值: ${value}`);
      }
    });
    
    if (!context || !context.pet) {
      throw new Error('演化上下文不能为空');
    }
  }

  private preprocessEvents(events: EvolutionEvent[]): EvolutionEvent[] {
    const maxEvents = this.config.performance.computationLimits.maxEventsPerCalculation;
    
    // 按时间戳排序，取最近的事件
    const sortedEvents = events
      .filter(event => event && event.timestamp instanceof Date)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxEvents);
    
    return sortedEvents;
  }

  private createEmptyEvolutionResult(evolutionId: string, petId: string, startTime: number): EvolutionResult {
    return {
      success: true,
      petId,
      evolutionId,
      personalityAdjustment: {
        traitChanges: { ...DEFAULT_PERSONALITY_TRAITS },
        confidence: 0,
        reason: '无有效互动事件',
        appliedLimits: [],
        metadata: {
          originalValues: { ...DEFAULT_PERSONALITY_TRAITS },
          rawChanges: { ...DEFAULT_PERSONALITY_TRAITS },
          limitedChanges: { ...DEFAULT_PERSONALITY_TRAITS },
          stabilityScore: 1.0,
        },
      },
      newPersonalityTraits: { ...DEFAULT_PERSONALITY_TRAITS },
      processedEvents: [],
      interactionPattern: this.createEmptyInteractionPattern('', petId),
      processingTime: Date.now() - startTime,
      eventsProcessed: 0,
      timestamp: new Date(),
      algorithmVersion: this.algorithmVersion,
      configSnapshot: JSON.stringify(this.config),
      warnings: ['无有效互动事件进行处理'],
      errors: [],
    };
  }

  private createEmptyInteractionPattern(userId: string, petId: string): InteractionPattern {
    return {
      userId,
      petId,
      timeWindow: TimeWindow.WEEKLY,
      totalInteractions: 0,
      averageSessionLength: 0,
      interactionFrequency: 0,
      typeDistribution: {} as Record<InteractionType, number>,
      modeDistribution: {} as Record<InteractionMode, number>,
      engagementDistribution: {} as Record<EngagementLevel, number>,
      averageEngagement: 0,
      responseTimeVariance: 0,
      topicDiversity: 0,
      engagementTrend: 0,
      complexityTrend: 0,
      satisfactionTrend: 0,
      preferredTimeSlots: new Array(24).fill(0),
      weekdayPattern: new Array(7).fill(0),
      seasonalPattern: { spring: 0, summer: 0, autumn: 0, winter: 0 },
    };
  }

  private calculateConfidence(
    events: EvolutionEvent[],
    pattern: InteractionPattern,
    appliedLimits: string[],
  ): number {
    let confidence = 0.5; // 基础置信度
    
    // 基于事件数量的置信度
    const eventCountFactor = Math.min(events.length / 10, 1); // 10个事件为满分
    confidence += eventCountFactor * 0.2;
    
    // 基于平均参与度的置信度
    confidence += pattern.averageEngagement * 0.2;
    
    // 基于话题多样性的置信度
    confidence += pattern.topicDiversity * 0.1;
    
    // 应用的限制越多，置信度越低
    const limitPenalty = appliedLimits.length * 0.05;
    confidence -= limitPenalty;
    
    return Math.max(0, Math.min(1, confidence));
  }

  private generateAdjustmentReason(
    events: EvolutionEvent[],
    pattern: InteractionPattern,
  ): string {
    const primaryType = Object.entries(pattern.typeDistribution)
      .sort(([, a], [, b]) => b - a)[0];
    
    const engagementLevel = pattern.averageEngagement > 0.7 ? '高' : 
                           pattern.averageEngagement > 0.4 ? '中' : '低';
    
    return `基于${events.length}个互动事件，主要互动类型为${primaryType?.[0] || '未知'}，用户参与度${engagementLevel}`;
  }

  private calculateStabilityScore(adjustments: Record<PersonalityTrait, number>): number {
    const totalChange = Object.values(adjustments).reduce((sum, change) => sum + Math.abs(change), 0);
    return Math.max(0, 1 - totalChange / Object.keys(adjustments).length);
  }

  private updateProcessingStats(processingTime: number): void {
    this.processingStats.totalProcessed++;
    this.processingStats.averageProcessingTime = (
      this.processingStats.averageProcessingTime * 0.9 + processingTime * 0.1
    );
  }

  // 公共方法：获取处理统计信息
  public getProcessingStats() {
    return { ...this.processingStats };
  }

  // 公共方法：清理缓存
  public clearCache(): void {
    this.cache.clear();
    this.log('info', '缓存已清理');
  }

  // 公共方法：获取配置信息
  public getConfig() {
    return JSON.parse(JSON.stringify(this.config));
  }
}