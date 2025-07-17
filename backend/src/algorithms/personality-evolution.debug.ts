/**
 * 个性演化可视化调试工具
 * 提供详细的演化过程监控、分析和可视化功能
 */

import { PersonalityEvolutionEngine } from './personality-evolution';
import {
  PersonalityTrait,
  InteractionType,
  EngagementLevel,
  EvolutionEvent,
  EvolutionResult,
  PersonalityAdjustment,
  InteractionPattern,
} from './types/personality.types';

/**
 * 调试信息接口
 */
export interface DebugInfo {
  timestamp: Date;
  stage: string;
  details: Record<string, any>;
  duration: number;
}

/**
 * 演化步骤追踪接口
 */
export interface EvolutionStepTrace {
  stepName: string;
  input: any;
  output: any;
  duration: number;
  timestamp: Date;
  intermediateValues: Record<string, any>;
}

/**
 * 可视化数据接口
 */
export interface VisualizationData {
  traitChanges: {
    trait: PersonalityTrait;
    before: number;
    after: number;
    change: number;
    percentage: number;
  }[];
  interactionDistribution: {
    type: InteractionType;
    count: number;
    percentage: number;
    influence: number;
  }[];
  evolutionTimeline: {
    timestamp: Date;
    traits: Record<PersonalityTrait, number>;
    event: string;
  }[];
  limitApplications: {
    limit: string;
    reason: string;
    beforeValue: number;
    afterValue: number;
  }[];
}

/**
 * 性能监控数据接口
 */
export interface PerformanceMetrics {
  totalProcessingTime: number;
  stageTimings: Record<string, number>;
  memoryUsage: {
    before: number;
    after: number;
    peak: number;
  };
  cacheStatistics: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
  eventProcessingRate: number;
}

/**
 * 个性演化调试器类
 */
export class PersonalityEvolutionDebugger {
  private engine: PersonalityEvolutionEngine;
  private debugHistory: DebugInfo[] = [];
  private stepTraces: EvolutionStepTrace[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private isDebugging: boolean = false;

  constructor(engine: PersonalityEvolutionEngine) {
    this.engine = engine;
  }

  /**
   * 开始调试会话
   */
  public startDebugging(): void {
    this.isDebugging = true;
    this.debugHistory = [];
    this.stepTraces = [];
    this.performanceMetrics = [];
    this.log('调试', '开始调试会话', { timestamp: new Date() });
  }

  /**
   * 停止调试会话
   */
  public stopDebugging(): void {
    this.isDebugging = false;
    this.log('调试', '停止调试会话', { 
      totalSteps: this.stepTraces.length,
      totalTime: this.getTotalDebugTime(),
    });
  }

  /**
   * 追踪完整的演化过程
   */
  public async traceEvolution(
    petId: string,
    userId: string,
    events: EvolutionEvent[],
    currentTraits: Record<PersonalityTrait, number>,
    context: any
  ): Promise<{
    result: EvolutionResult;
    debugData: DebugInfo[];
    stepTraces: EvolutionStepTrace[];
    visualization: VisualizationData;
    performance: PerformanceMetrics;
  }> {
    if (!this.isDebugging) {
      this.startDebugging();
    }

    const startTime = Date.now();
    const initialMemory = process.memoryUsage().heapUsed;

    this.log('演化开始', '开始个性演化追踪', {
      petId,
      userId,
      eventCount: events.length,
      currentTraits,
    });

    try {
      // 执行演化过程
      const result = await this.engine.processPersonalityEvolution(
        petId,
        userId,
        events,
        currentTraits,
        context
      );

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;

      // 收集性能指标
      const performance: PerformanceMetrics = {
        totalProcessingTime: endTime - startTime,
        stageTimings: this.calculateStageTimings(),
        memoryUsage: {
          before: initialMemory,
          after: finalMemory,
          peak: this.getPeakMemoryUsage(),
        },
        cacheStatistics: this.getCacheStatistics(),
        eventProcessingRate: events.length / (endTime - startTime) * 1000,
      };

      // 生成可视化数据
      const visualization = this.generateVisualizationData(
        events,
        currentTraits,
        result.newPersonalityTraits,
        result.personalityAdjustment
      );

      this.log('演化完成', '个性演化追踪完成', {
        success: result.success,
        processingTime: endTime - startTime,
        eventsProcessed: result.eventsProcessed,
      });

      return {
        result,
        debugData: [...this.debugHistory],
        stepTraces: [...this.stepTraces],
        visualization,
        performance,
      };

    } catch (error) {
      this.log('演化错误', '个性演化过程中发生错误', {
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * 分析互动模式的详细信息
   */
  public analyzeInteractionPattern(
    events: EvolutionEvent[],
    pattern: InteractionPattern
  ): {
    summary: string;
    insights: string[];
    recommendations: string[];
    anomalies: string[];
  } {
    const insights: string[] = [];
    const recommendations: string[] = [];
    const anomalies: string[] = [];

    // 分析互动频率
    if (pattern.interactionFrequency > 10) {
      insights.push(`用户互动频率很高 (${pattern.interactionFrequency.toFixed(1)}次/天)`);
      recommendations.push('考虑适当降低响应敏感度以避免过度刺激');
    } else if (pattern.interactionFrequency < 1) {
      insights.push(`用户互动频率较低 (${pattern.interactionFrequency.toFixed(1)}次/天)`);
      recommendations.push('考虑提高互动吸引力以增加用户参与度');
    }

    // 分析参与度趋势
    if (pattern.engagementTrend > 0.2) {
      insights.push('用户参与度呈上升趋势');
    } else if (pattern.engagementTrend < -0.2) {
      insights.push('用户参与度呈下降趋势');
      recommendations.push('需要调整互动策略以重新吸引用户');
    }

    // 分析话题多样性
    if (pattern.topicDiversity < 0.3) {
      insights.push('话题多样性较低，用户偏好集中');
      recommendations.push('可以尝试引入更多话题类型');
    } else if (pattern.topicDiversity > 0.8) {
      insights.push('话题多样性很高，用户兴趣广泛');
    }

    // 检测异常模式
    if (pattern.responseTimeVariance > 5000) {
      anomalies.push('响应时间波动异常，可能存在系统性能问题');
    }

    if (pattern.averageSessionLength < 30) {
      anomalies.push('平均会话时长过短，可能表明用户满意度不高');
    }

    // 分析时间偏好
    const peakHour = pattern.preferredTimeSlots.indexOf(Math.max(...pattern.preferredTimeSlots));
    if (peakHour !== -1) {
      insights.push(`用户偏好在 ${peakHour}:00 时段互动`);
    }

    const summary = `分析了 ${events.length} 个互动事件，平均参与度 ${pattern.averageEngagement.toFixed(2)}，话题多样性 ${pattern.topicDiversity.toFixed(2)}`;

    return {
      summary,
      insights,
      recommendations,
      anomalies,
    };
  }

  /**
   * 生成个性特质变化报告
   */
  public generateTraitChangeReport(
    beforeTraits: Record<PersonalityTrait, number>,
    afterTraits: Record<PersonalityTrait, number>,
    adjustment: PersonalityAdjustment
  ): {
    significantChanges: Array<{
      trait: PersonalityTrait;
      change: number;
      percentage: number;
      interpretation: string;
    }>;
    stabilityAnalysis: {
      overallStability: number;
      mostStable: PersonalityTrait;
      mostVolatile: PersonalityTrait;
    };
    recommendations: string[];
  } {
    const significantChanges: Array<{
      trait: PersonalityTrait;
      change: number;
      percentage: number;
      interpretation: string;
    }> = [];

    const recommendations: string[] = [];

    // 分析每个特质的变化
    Object.values(PersonalityTrait).forEach(trait => {
      const beforeValue = beforeTraits[trait];
      const afterValue = afterTraits[trait];
      const change = afterValue - beforeValue;
      const percentage = (change / beforeValue) * 100;

      if (Math.abs(change) > 0.05) { // 5%以上的变化被认为是显著的
        significantChanges.push({
          trait,
          change,
          percentage,
          interpretation: this.interpretTraitChange(trait, change),
        });
      }
    });

    // 稳定性分析
    const changeValues = Object.values(PersonalityTrait).map(trait => 
      Math.abs(afterTraits[trait] - beforeTraits[trait])
    );
    const overallStability = 1 - (changeValues.reduce((sum, change) => sum + change, 0) / changeValues.length);

    const mostStableChange = Math.min(...changeValues);
    const mostVolatileChange = Math.max(...changeValues);

    const mostStable = Object.values(PersonalityTrait).find(trait => 
      Math.abs(afterTraits[trait] - beforeTraits[trait]) === mostStableChange
    )!;

    const mostVolatile = Object.values(PersonalityTrait).find(trait => 
      Math.abs(afterTraits[trait] - beforeTraits[trait]) === mostVolatileChange
    )!;

    // 生成推荐
    if (overallStability < 0.9) {
      recommendations.push('个性变化幅度较大，建议增强锚定机制');
    }

    if (adjustment.appliedLimits.length > 3) {
      recommendations.push('触发了多个演化限制，可能需要调整限制参数');
    }

    if (adjustment.confidence < 0.6) {
      recommendations.push('调整置信度较低，建议收集更多互动数据');
    }

    return {
      significantChanges,
      stabilityAnalysis: {
        overallStability,
        mostStable,
        mostVolatile,
      },
      recommendations,
    };
  }

  /**
   * 生成可视化图表数据
   */
  public generateChartData(
    events: EvolutionEvent[],
    beforeTraits: Record<PersonalityTrait, number>,
    afterTraits: Record<PersonalityTrait, number>
  ): {
    traitRadarChart: Array<{
      trait: string;
      before: number;
      after: number;
    }>;
    interactionTimelineChart: Array<{
      time: string;
      type: string;
      engagement: number;
      duration: number;
    }>;
    traitChangeBarChart: Array<{
      trait: string;
      change: number;
      percentage: number;
    }>;
    engagementTrendChart: Array<{
      time: string;
      engagement: number;
      movingAverage: number;
    }>;
  } {
    // 雷达图数据
    const traitRadarChart = Object.values(PersonalityTrait).map(trait => ({
      trait: this.getTraitDisplayName(trait),
      before: beforeTraits[trait],
      after: afterTraits[trait],
    }));

    // 时间线图数据
    const interactionTimelineChart = events.map(event => ({
      time: event.timestamp.toISOString(),
      type: event.interactionType,
      engagement: this.getEngagementValue(event.engagementLevel),
      duration: event.duration,
    }));

    // 变化条形图数据
    const traitChangeBarChart = Object.values(PersonalityTrait).map(trait => ({
      trait: this.getTraitDisplayName(trait),
      change: afterTraits[trait] - beforeTraits[trait],
      percentage: ((afterTraits[trait] - beforeTraits[trait]) / beforeTraits[trait]) * 100,
    }));

    // 参与度趋势图数据
    const engagementTrendChart = this.calculateEngagementTrend(events);

    return {
      traitRadarChart,
      interactionTimelineChart,
      traitChangeBarChart,
      engagementTrendChart,
    };
  }

  /**
   * 导出调试报告
   */
  public exportDebugReport(): {
    summary: {
      totalDebugSessions: number;
      totalSteps: number;
      totalTime: number;
      averageStepTime: number;
    };
    detailedSteps: EvolutionStepTrace[];
    performanceAnalysis: {
      bottlenecks: string[];
      optimizationSuggestions: string[];
      memoryUsagePattern: string;
    };
    debugLog: DebugInfo[];
  } {
    const totalTime = this.getTotalDebugTime();
    const averageStepTime = this.stepTraces.length > 0 ? totalTime / this.stepTraces.length : 0;

    const bottlenecks = this.identifyBottlenecks();
    const optimizationSuggestions = this.generateOptimizationSuggestions();
    const memoryUsagePattern = this.analyzeMemoryUsage();

    return {
      summary: {
        totalDebugSessions: this.performanceMetrics.length,
        totalSteps: this.stepTraces.length,
        totalTime,
        averageStepTime,
      },
      detailedSteps: this.stepTraces,
      performanceAnalysis: {
        bottlenecks,
        optimizationSuggestions,
        memoryUsagePattern,
      },
      debugLog: this.debugHistory,
    };
  }

  /**
   * 实时监控功能
   */
  public startRealTimeMonitoring(callback: (data: any) => void): void {
    const interval = setInterval(() => {
      const stats = this.engine.getProcessingStats();
      const realtimeData = {
        timestamp: new Date(),
        processingStats: stats,
        memoryUsage: process.memoryUsage(),
        recentSteps: this.stepTraces.slice(-10),
      };
      callback(realtimeData);
    }, 1000);

    // 存储interval ID以便后续清理
    (this as any).monitoringInterval = interval;
  }

  /**
   * 停止实时监控
   */
  public stopRealTimeMonitoring(): void {
    if ((this as any).monitoringInterval) {
      clearInterval((this as any).monitoringInterval);
      delete (this as any).monitoringInterval;
    }
  }

  // 私有辅助方法

  private log(stage: string, message: string, details: Record<string, any>): void {
    const debugInfo: DebugInfo = {
      timestamp: new Date(),
      stage,
      details: { message, ...details },
      duration: 0,
    };
    this.debugHistory.push(debugInfo);
    
    if (this.isDebugging) {
      console.log(`[PersonalityEvolution:${stage}] ${message}`, details);
    }
  }

  private calculateStageTimings(): Record<string, number> {
    const timings: Record<string, number> = {};
    this.stepTraces.forEach(trace => {
      timings[trace.stepName] = (timings[trace.stepName] || 0) + trace.duration;
    });
    return timings;
  }

  private getPeakMemoryUsage(): number {
    // 简化实现，实际应该跟踪整个过程中的内存使用
    return process.memoryUsage().heapUsed;
  }

  private getCacheStatistics(): { hits: number; misses: number; hitRate: number; size: number } {
    const stats = this.engine.getProcessingStats();
    return {
      hits: Math.floor(stats.totalProcessed * stats.cacheHitRate),
      misses: Math.floor(stats.totalProcessed * (1 - stats.cacheHitRate)),
      hitRate: stats.cacheHitRate,
      size: 0, // 需要从引擎获取实际缓存大小
    };
  }

  private generateVisualizationData(
    events: EvolutionEvent[],
    beforeTraits: Record<PersonalityTrait, number>,
    afterTraits: Record<PersonalityTrait, number>,
    adjustment: PersonalityAdjustment
  ): VisualizationData {
    const traitChanges = Object.values(PersonalityTrait).map(trait => ({
      trait,
      before: beforeTraits[trait],
      after: afterTraits[trait],
      change: afterTraits[trait] - beforeTraits[trait],
      percentage: ((afterTraits[trait] - beforeTraits[trait]) / beforeTraits[trait]) * 100,
    }));

    const typeCount = new Map<InteractionType, number>();
    events.forEach(event => {
      typeCount.set(event.interactionType, (typeCount.get(event.interactionType) || 0) + 1);
    });

    const interactionDistribution = Array.from(typeCount.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: (count / events.length) * 100,
      influence: this.calculateTypeInfluence(type, events),
    }));

    const evolutionTimeline = events.map(event => ({
      timestamp: event.timestamp,
      traits: { ...beforeTraits }, // 简化，实际应该计算中间状态
      event: `${event.interactionType}: ${event.engagementLevel}`,
    }));

    const limitApplications = adjustment.appliedLimits.map(limit => ({
      limit,
      reason: '边界限制',
      beforeValue: 0, // 需要从调整详情获取
      afterValue: 0,
    }));

    return {
      traitChanges,
      interactionDistribution,
      evolutionTimeline,
      limitApplications,
    };
  }

  private interpretTraitChange(
    trait: PersonalityTrait,
    change: number
  ): string {
    const direction = change > 0 ? '增加' : '减少';
    const magnitude = Math.abs(change) > 0.1 ? '显著' : '轻微';
    
    return `${trait} ${direction} ${magnitude} (${(change * 100).toFixed(1)}%)`;
  }

  private getTraitDisplayName(trait: PersonalityTrait): string {
    const displayNames: Record<PersonalityTrait, string> = {
      [PersonalityTrait.OPENNESS]: '开放性',
      [PersonalityTrait.CONSCIENTIOUSNESS]: '尽责性',
      [PersonalityTrait.EXTRAVERSION]: '外向性',
      [PersonalityTrait.AGREEABLENESS]: '宜人性',
      [PersonalityTrait.NEUROTICISM]: '神经质',
      [PersonalityTrait.CREATIVITY]: '创造力',
      [PersonalityTrait.EMPATHY]: '共情能力',
      [PersonalityTrait.CURIOSITY]: '好奇心',
      [PersonalityTrait.PLAYFULNESS]: '玩性',
      [PersonalityTrait.INTELLIGENCE]: '智能性',
    };
    return displayNames[trait] || trait;
  }

  private getEngagementValue(level: EngagementLevel): number {
    const values: Record<EngagementLevel, number> = {
      [EngagementLevel.LOW]: 0.25,
      [EngagementLevel.MEDIUM]: 0.5,
      [EngagementLevel.HIGH]: 0.75,
      [EngagementLevel.INTENSE]: 1.0,
    };
    return values[level];
  }

  private calculateEngagementTrend(events: EvolutionEvent[]): Array<{
    time: string;
    engagement: number;
    movingAverage: number;
  }> {
    const windowSize = 5;
    return events.map((event, index) => {
      const start = Math.max(0, index - windowSize + 1);
      const window = events.slice(start, index + 1);
      const movingAverage = window.reduce((sum, e) => sum + this.getEngagementValue(e.engagementLevel), 0) / window.length;
      
      return {
        time: event.timestamp.toISOString(),
        engagement: this.getEngagementValue(event.engagementLevel),
        movingAverage,
      };
    });
  }

  private calculateTypeInfluence(type: InteractionType, events: EvolutionEvent[]): number {
    const typeEvents = events.filter(e => e.interactionType === type);
    const totalInfluence = typeEvents.reduce((sum, event) => {
      return sum + this.getEngagementValue(event.engagementLevel) * (event.duration / 300);
    }, 0);
    return totalInfluence / typeEvents.length;
  }

  private getTotalDebugTime(): number {
    return this.stepTraces.reduce((sum, trace) => sum + trace.duration, 0);
  }

  private identifyBottlenecks(): string[] {
    const bottlenecks: string[] = [];
    const avgTime = this.getTotalDebugTime() / this.stepTraces.length;
    
    this.stepTraces.forEach(trace => {
      if (trace.duration > avgTime * 2) {
        bottlenecks.push(`${trace.stepName}: ${trace.duration}ms`);
      }
    });
    
    return bottlenecks;
  }

  private generateOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const stats = this.engine.getProcessingStats();
    
    if (stats.cacheHitRate < 0.8) {
      suggestions.push('缓存命中率较低，考虑增加缓存大小或调整缓存策略');
    }
    
    if (stats.averageProcessingTime > 1000) {
      suggestions.push('平均处理时间较长，考虑优化计算算法');
    }
    
    return suggestions;
  }

  private analyzeMemoryUsage(): string {
    const current = process.memoryUsage();
    const heapUsedMB = current.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > 100) {
      return '内存使用较高，建议优化内存管理';
    } else if (heapUsedMB > 50) {
      return '内存使用适中，继续监控';
    } else {
      return '内存使用正常';
    }
  }
}