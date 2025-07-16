/**
 * 个性演化系统配置文件
 * 定义互动权重、演化限制、基线锚定等核心参数
 */

import {
  PersonalityTrait,
  InteractionType,
  InteractionMode,
  EngagementLevel,
  EvolutionLimits,
  BaselineAnchoringConfig,
  TimeWindow,
  ConfigValidationResult,
  ConfigValidationError,
  DEFAULT_PERSONALITY_TRAITS,
} from '../algorithms/types/personality.types';

/**
 * 互动权重配置 - 定义不同互动类型对各个性特质的影响权重
 * 权重值范围: -1.0 到 1.0
 * 正值表示增强该特质，负值表示减弱该特质
 */
export const INTERACTION_WEIGHTS: Record<InteractionType, Record<PersonalityTrait, number>> = {
  [InteractionType.CASUAL_CHAT]: {
    [PersonalityTrait.OPENNESS]: 0.1,
    [PersonalityTrait.CONSCIENTIOUSNESS]: 0.0,
    [PersonalityTrait.EXTRAVERSION]: 0.2,
    [PersonalityTrait.AGREEABLENESS]: 0.15,
    [PersonalityTrait.NEUROTICISM]: -0.1,
    [PersonalityTrait.CREATIVITY]: 0.05,
    [PersonalityTrait.EMPATHY]: 0.1,
    [PersonalityTrait.CURIOSITY]: 0.1,
    [PersonalityTrait.PLAYFULNESS]: 0.2,
    [PersonalityTrait.INTELLIGENCE]: 0.05,
  },
  
  [InteractionType.EMOTIONAL_SUPPORT]: {
    [PersonalityTrait.OPENNESS]: 0.15,
    [PersonalityTrait.CONSCIENTIOUSNESS]: 0.2,
    [PersonalityTrait.EXTRAVERSION]: 0.0,
    [PersonalityTrait.AGREEABLENESS]: 0.3,
    [PersonalityTrait.NEUROTICISM]: -0.2,
    [PersonalityTrait.CREATIVITY]: 0.1,
    [PersonalityTrait.EMPATHY]: 0.4,
    [PersonalityTrait.CURIOSITY]: 0.05,
    [PersonalityTrait.PLAYFULNESS]: -0.1,
    [PersonalityTrait.INTELLIGENCE]: 0.1,
  },
  
  [InteractionType.LEARNING]: {
    [PersonalityTrait.OPENNESS]: 0.3,
    [PersonalityTrait.CONSCIENTIOUSNESS]: 0.3,
    [PersonalityTrait.EXTRAVERSION]: 0.05,
    [PersonalityTrait.AGREEABLENESS]: 0.1,
    [PersonalityTrait.NEUROTICISM]: 0.0,
    [PersonalityTrait.CREATIVITY]: 0.2,
    [PersonalityTrait.EMPATHY]: 0.1,
    [PersonalityTrait.CURIOSITY]: 0.4,
    [PersonalityTrait.PLAYFULNESS]: 0.1,
    [PersonalityTrait.INTELLIGENCE]: 0.35,
  },
  
  [InteractionType.CREATIVE_WORK]: {
    [PersonalityTrait.OPENNESS]: 0.4,
    [PersonalityTrait.CONSCIENTIOUSNESS]: 0.2,
    [PersonalityTrait.EXTRAVERSION]: 0.1,
    [PersonalityTrait.AGREEABLENESS]: 0.05,
    [PersonalityTrait.NEUROTICISM]: 0.1,
    [PersonalityTrait.CREATIVITY]: 0.5,
    [PersonalityTrait.EMPATHY]: 0.15,
    [PersonalityTrait.CURIOSITY]: 0.3,
    [PersonalityTrait.PLAYFULNESS]: 0.25,
    [PersonalityTrait.INTELLIGENCE]: 0.2,
  },
  
  [InteractionType.PROBLEM_SOLVING]: {
    [PersonalityTrait.OPENNESS]: 0.2,
    [PersonalityTrait.CONSCIENTIOUSNESS]: 0.35,
    [PersonalityTrait.EXTRAVERSION]: 0.0,
    [PersonalityTrait.AGREEABLENESS]: 0.05,
    [PersonalityTrait.NEUROTICISM]: -0.15,
    [PersonalityTrait.CREATIVITY]: 0.25,
    [PersonalityTrait.EMPATHY]: 0.05,
    [PersonalityTrait.CURIOSITY]: 0.3,
    [PersonalityTrait.PLAYFULNESS]: 0.0,
    [PersonalityTrait.INTELLIGENCE]: 0.4,
  },
  
  [InteractionType.ENTERTAINMENT]: {
    [PersonalityTrait.OPENNESS]: 0.15,
    [PersonalityTrait.CONSCIENTIOUSNESS]: -0.1,
    [PersonalityTrait.EXTRAVERSION]: 0.3,
    [PersonalityTrait.AGREEABLENESS]: 0.2,
    [PersonalityTrait.NEUROTICISM]: -0.2,
    [PersonalityTrait.CREATIVITY]: 0.2,
    [PersonalityTrait.EMPATHY]: 0.1,
    [PersonalityTrait.CURIOSITY]: 0.15,
    [PersonalityTrait.PLAYFULNESS]: 0.4,
    [PersonalityTrait.INTELLIGENCE]: 0.05,
  },
  
  [InteractionType.DEEP_CONVERSATION]: {
    [PersonalityTrait.OPENNESS]: 0.35,
    [PersonalityTrait.CONSCIENTIOUSNESS]: 0.2,
    [PersonalityTrait.EXTRAVERSION]: 0.1,
    [PersonalityTrait.AGREEABLENESS]: 0.2,
    [PersonalityTrait.NEUROTICISM]: 0.0,
    [PersonalityTrait.CREATIVITY]: 0.25,
    [PersonalityTrait.EMPATHY]: 0.3,
    [PersonalityTrait.CURIOSITY]: 0.4,
    [PersonalityTrait.PLAYFULNESS]: 0.05,
    [PersonalityTrait.INTELLIGENCE]: 0.3,
  },
  
  [InteractionType.SKILL_PRACTICE]: {
    [PersonalityTrait.OPENNESS]: 0.2,
    [PersonalityTrait.CONSCIENTIOUSNESS]: 0.4,
    [PersonalityTrait.EXTRAVERSION]: 0.0,
    [PersonalityTrait.AGREEABLENESS]: 0.1,
    [PersonalityTrait.NEUROTICISM]: -0.1,
    [PersonalityTrait.CREATIVITY]: 0.15,
    [PersonalityTrait.EMPATHY]: 0.05,
    [PersonalityTrait.CURIOSITY]: 0.25,
    [PersonalityTrait.PLAYFULNESS]: 0.1,
    [PersonalityTrait.INTELLIGENCE]: 0.3,
  },
  
  [InteractionType.STORYTELLING]: {
    [PersonalityTrait.OPENNESS]: 0.25,
    [PersonalityTrait.CONSCIENTIOUSNESS]: 0.1,
    [PersonalityTrait.EXTRAVERSION]: 0.2,
    [PersonalityTrait.AGREEABLENESS]: 0.15,
    [PersonalityTrait.NEUROTICISM]: 0.0,
    [PersonalityTrait.CREATIVITY]: 0.4,
    [PersonalityTrait.EMPATHY]: 0.25,
    [PersonalityTrait.CURIOSITY]: 0.2,
    [PersonalityTrait.PLAYFULNESS]: 0.3,
    [PersonalityTrait.INTELLIGENCE]: 0.15,
  },
  
  [InteractionType.ROUTINE_CHECK]: {
    [PersonalityTrait.OPENNESS]: 0.0,
    [PersonalityTrait.CONSCIENTIOUSNESS]: 0.15,
    [PersonalityTrait.EXTRAVERSION]: 0.05,
    [PersonalityTrait.AGREEABLENESS]: 0.1,
    [PersonalityTrait.NEUROTICISM]: -0.05,
    [PersonalityTrait.CREATIVITY]: 0.0,
    [PersonalityTrait.EMPATHY]: 0.05,
    [PersonalityTrait.CURIOSITY]: 0.0,
    [PersonalityTrait.PLAYFULNESS]: 0.0,
    [PersonalityTrait.INTELLIGENCE]: 0.05,
  },
};

/**
 * 互动模式权重修正器 - 根据互动模式调整基础权重
 */
export const MODE_WEIGHT_MULTIPLIERS: Record<InteractionMode, number> = {
  [InteractionMode.QUICK]: 0.3,      // 快速互动影响较小
  [InteractionMode.NORMAL]: 1.0,     // 正常互动标准影响
  [InteractionMode.EXTENDED]: 1.5,   // 延长互动影响较大
  [InteractionMode.DEEP]: 2.0,       // 深度互动影响最大
};

/**
 * 用户参与度权重修正器 - 根据用户参与度调整基础权重
 */
export const ENGAGEMENT_WEIGHT_MULTIPLIERS: Record<EngagementLevel, number> = {
  [EngagementLevel.LOW]: 0.4,        // 低参与度影响很小
  [EngagementLevel.MEDIUM]: 1.0,     // 中等参与度标准影响
  [EngagementLevel.HIGH]: 1.6,       // 高参与度影响较大
  [EngagementLevel.INTENSE]: 2.2,    // 高强度参与影响最大
};

/**
 * 演化限制配置 - 定义个性特质变化的边界约束
 */
export const EVOLUTION_LIMITS: EvolutionLimits = {
  // 日度限制
  dailyLimits: {
    maxChange: 0.15,                  // 单日最大变化15%
    maxEvents: 20,                    // 单日最多处理20个事件
    coolingPeriod: 2,                 // 2小时冷却期
  },
  
  // 周度限制
  weeklyLimits: {
    maxChange: 0.4,                   // 单周最大变化40%
    maxCumulativeChange: 0.5,         // 单周累积最大变化50%
  },
  
  // 月度限制
  monthlyLimits: {
    maxChange: 0.7,                   // 单月最大变化70%
    maxCumulativeChange: 0.8,         // 单月累积最大变化80%
  },
  
  // 特质特定限制
  traitLimits: {
    [PersonalityTrait.OPENNESS]: {
      minValue: 0.1,
      maxValue: 0.9,
      changeResistance: 0.3,          // 中等变化阻力
      volatility: 0.6,                // 中等易变性
    },
    [PersonalityTrait.CONSCIENTIOUSNESS]: {
      minValue: 0.15,
      maxValue: 0.95,
      changeResistance: 0.5,          // 较高变化阻力
      volatility: 0.4,                // 较低易变性
    },
    [PersonalityTrait.EXTRAVERSION]: {
      minValue: 0.05,
      maxValue: 0.95,
      changeResistance: 0.2,          // 较低变化阻力
      volatility: 0.7,                // 较高易变性
    },
    [PersonalityTrait.AGREEABLENESS]: {
      minValue: 0.2,
      maxValue: 0.9,
      changeResistance: 0.4,          // 中等变化阻力
      volatility: 0.5,                // 中等易变性
    },
    [PersonalityTrait.NEUROTICISM]: {
      minValue: 0.1,
      maxValue: 0.8,
      changeResistance: 0.6,          // 高变化阻力
      volatility: 0.3,                // 低易变性
    },
    [PersonalityTrait.CREATIVITY]: {
      minValue: 0.1,
      maxValue: 0.95,
      changeResistance: 0.2,          // 较低变化阻力
      volatility: 0.8,                // 高易变性
    },
    [PersonalityTrait.EMPATHY]: {
      minValue: 0.15,
      maxValue: 0.9,
      changeResistance: 0.4,          // 中等变化阻力
      volatility: 0.5,                // 中等易变性
    },
    [PersonalityTrait.CURIOSITY]: {
      minValue: 0.1,
      maxValue: 0.95,
      changeResistance: 0.25,         // 较低变化阻力
      volatility: 0.75,               // 较高易变性
    },
    [PersonalityTrait.PLAYFULNESS]: {
      minValue: 0.05,
      maxValue: 0.95,
      changeResistance: 0.15,         // 低变化阻力
      volatility: 0.85,               // 高易变性
    },
    [PersonalityTrait.INTELLIGENCE]: {
      minValue: 0.2,
      maxValue: 0.95,
      changeResistance: 0.7,          // 高变化阻力
      volatility: 0.25,               // 低易变性
    },
  },
  
  // 全局约束
  globalConstraints: {
    maxSimultaneousChanges: 5,        // 最多5个特质同时变化
    stabilityThreshold: 0.02,         // 2%的稳定性阈值
    emergencyBrake: 0.3,              // 30%的紧急制动阈值
  },
};

/**
 * 基线锚定配置 - 定义个性特质的基线行为和时间衰减
 */
export const BASELINE_ANCHORING_CONFIG: BaselineAnchoringConfig = {
  // 基线设定 - 所有特质的中性基线
  personalityBaseline: {
    ...DEFAULT_PERSONALITY_TRAITS,
  },
  
  // 锚定强度 - 控制基线拉力的强度
  anchoringStrength: 0.3,            // 30%的锚定强度
  
  // 时间衰减配置
  timeDecayConfig: {
    decayRate: 0.05,                  // 5%的日衰减率
    decayFunction: 'exponential',     // 指数衰减函数
    minimumInfluence: 0.1,            // 最小10%的影响力保留
  },
  
  // 自适应配置
  adaptiveConfig: {
    learningRate: 0.01,               // 1%的学习率
    adaptationThreshold: 0.1,         // 10%的适应阈值
    maxBaslineShift: 0.2,             // 最大20%的基线偏移
    stabilizationPeriod: 14,          // 14天的稳定化周期
  },
};

/**
 * 时间衰减参数配置 - 定义不同时间窗口的衰减行为
 */
export const TIME_DECAY_PARAMETERS = {
  // 互动事件影响力衰减
  eventDecay: {
    halfLife: 7,                      // 7天半衰期
    minimumWeight: 0.05,              // 最小5%权重保留
    decayFunction: 'exponential' as const,
  },
  
  // 个性状态衰减
  personalityDecay: {
    dailyDecayRate: 0.02,             // 2%日衰减率
    weeklyDecayRate: 0.1,             // 10%周衰减率
    monthlyDecayRate: 0.25,           // 25%月衰减率
  },
  
  // 缓存过期时间
  cacheExpiry: {
    interactionPatterns: 3600,        // 1小时 (秒)
    personalityAnalytics: 1800,       // 30分钟 (秒)
    evolutionResults: 86400,          // 24小时 (秒)
  },
};

/**
 * 性能优化配置
 */
export const PERFORMANCE_CONFIG = {
  // 批处理设置
  batchProcessing: {
    maxBatchSize: 100,                // 最大批处理大小
    batchTimeout: 5000,               // 5秒批处理超时
    parallelBatches: 3,               // 并行批处理数量
  },
  
  // 缓存设置
  caching: {
    enabled: true,
    maxCacheSize: 1000,               // 最大缓存条目数
    ttl: 3600,                        // 1小时TTL
  },
  
  // 计算限制
  computationLimits: {
    maxEventsPerCalculation: 200,     // 单次计算最大事件数
    timeoutMs: 10000,                 // 10秒计算超时
    maxRetries: 3,                    // 最大重试次数
  },
};

/**
 * 调试和监控配置
 */
export const DEBUG_CONFIG = {
  // 日志级别
  logLevel: 'info' as 'debug' | 'info' | 'warn' | 'error',
  
  // 详细日志选项
  verboseLogging: {
    evolutionSteps: false,            // 演化步骤详细日志
    interactionAnalysis: false,       // 互动分析详细日志
    limitApplications: true,          // 限制应用日志
    performanceMetrics: true,         // 性能指标日志
  },
  
  // 监控选项
  monitoring: {
    trackEvolutionLatency: true,      // 跟踪演化延迟
    trackMemoryUsage: true,           // 跟踪内存使用
    trackCacheHitRate: true,          // 跟踪缓存命中率
    alertThresholds: {
      highLatency: 5000,              // 5秒高延迟阈值
      highMemoryUsage: 0.8,           // 80%高内存使用阈值
      lowCacheHitRate: 0.7,           // 70%低缓存命中率阈值
    },
  },
};

/**
 * 实验功能配置
 */
export const EXPERIMENTAL_CONFIG = {
  // 高级特性开关
  features: {
    adaptiveBaseline: false,          // 自适应基线
    predictiveEvolution: false,       // 预测性演化
    multiUserInfluence: false,        // 多用户影响
    seasonalAdjustments: true,        // 季节性调整
  },
  
  // A/B测试配置
  abTesting: {
    enabled: false,
    experiments: {
      'enhanced-creativity-weights': {
        enabled: false,
        percentage: 0.1,              // 10%用户参与
      },
      'reduced-stability-threshold': {
        enabled: false,
        percentage: 0.05,             // 5%用户参与
      },
    },
  },
};

/**
 * 配置验证函数
 */
export function validateEvolutionConfig(): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  const warnings: ConfigValidationError[] = [];
  
  // 验证权重配置
  for (const [interactionType, weights] of Object.entries(INTERACTION_WEIGHTS)) {
    for (const [trait, weight] of Object.entries(weights)) {
      if (typeof weight !== 'number' || weight < -1 || weight > 1) {
        errors.push({
          field: `INTERACTION_WEIGHTS.${interactionType}.${trait}`,
          message: `权重值必须在 -1 到 1 之间，当前值: ${weight}`,
          severity: 'error',
          suggestion: '调整权重值到有效范围内',
        });
      }
    }
  }
  
  // 验证演化限制
  const limits = EVOLUTION_LIMITS;
  if (limits.dailyLimits.maxChange <= 0 || limits.dailyLimits.maxChange > 1) {
    errors.push({
      field: 'EVOLUTION_LIMITS.dailyLimits.maxChange',
      message: `日度最大变化量必须在 0 到 1 之间，当前值: ${limits.dailyLimits.maxChange}`,
      severity: 'error',
      suggestion: '调整到 0.01-0.3 范围内',
    });
  }
  
  // 验证基线锚定
  const anchoring = BASELINE_ANCHORING_CONFIG;
  if (anchoring.anchoringStrength < 0 || anchoring.anchoringStrength > 1) {
    errors.push({
      field: 'BASELINE_ANCHORING_CONFIG.anchoringStrength',
      message: `锚定强度必须在 0 到 1 之间，当前值: ${anchoring.anchoringStrength}`,
      severity: 'error',
      suggestion: '调整到 0.1-0.5 范围内',
    });
  }
  
  // 检查性能配置
  const perf = PERFORMANCE_CONFIG;
  if (perf.batchProcessing.maxBatchSize > 500) {
    warnings.push({
      field: 'PERFORMANCE_CONFIG.batchProcessing.maxBatchSize',
      message: `批处理大小过大可能影响性能，当前值: ${perf.batchProcessing.maxBatchSize}`,
      severity: 'warning',
      suggestion: '考虑减小到 100-200 范围内',
    });
  }
  
  const isValid = errors.length === 0;
  const summary = isValid
    ? `配置验证通过，发现 ${warnings.length} 个警告`
    : `配置验证失败，发现 ${errors.length} 个错误和 ${warnings.length} 个警告`;
  
  return {
    isValid,
    errors,
    warnings,
    summary,
  };
}

/**
 * 获取默认配置 - 用于配置缺失时的回退
 */
export function getDefaultConfig() {
  return {
    interactionWeights: INTERACTION_WEIGHTS,
    modeMultipliers: MODE_WEIGHT_MULTIPLIERS,
    engagementMultipliers: ENGAGEMENT_WEIGHT_MULTIPLIERS,
    evolutionLimits: EVOLUTION_LIMITS,
    baselineAnchoring: BASELINE_ANCHORING_CONFIG,
    timeDecay: TIME_DECAY_PARAMETERS,
    performance: PERFORMANCE_CONFIG,
    debug: DEBUG_CONFIG,
    experimental: EXPERIMENTAL_CONFIG,
  };
}

/**
 * 配置合并函数 - 允许部分配置覆盖
 */
export function mergeConfigs(
  baseConfig: ReturnType<typeof getDefaultConfig>,
  overrideConfig: Partial<ReturnType<typeof getDefaultConfig>>,
): ReturnType<typeof getDefaultConfig> {
  return {
    ...baseConfig,
    ...overrideConfig,
    // 深度合并嵌套对象
    evolutionLimits: {
      ...baseConfig.evolutionLimits,
      ...overrideConfig.evolutionLimits,
    },
    baselineAnchoring: {
      ...baseConfig.baselineAnchoring,
      ...overrideConfig.baselineAnchoring,
    },
    performance: {
      ...baseConfig.performance,
      ...overrideConfig.performance,
    },
  };
}

// 导出验证结果
export const CONFIG_VALIDATION_RESULT = validateEvolutionConfig();