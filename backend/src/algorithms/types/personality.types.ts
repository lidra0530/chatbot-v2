/**
 * 个性演化系统核心类型定义
 * 基于流水线架构的个性特质动态调整和演化追踪
 */

/**
 * 个性特质枚举 - 对应Prisma模型中的personalityTraits字段
 */
export enum PersonalityTrait {
  OPENNESS = 'openness',                    // 开放性
  CONSCIENTIOUSNESS = 'conscientiousness', // 尽责性
  EXTRAVERSION = 'extraversion',           // 外向性
  AGREEABLENESS = 'agreeableness',         // 宜人性
  NEUROTICISM = 'neuroticism',             // 神经质性
  CREATIVITY = 'creativity',               // 创造力
  EMPATHY = 'empathy',                     // 共情能力
  CURIOSITY = 'curiosity',                 // 好奇心
  PLAYFULNESS = 'playfulness',             // 玩性
  INTELLIGENCE = 'intelligence'            // 智能性
}

/**
 * 互动类型枚举 - 定义用户与宠物的互动方式
 */
export enum InteractionType {
  CASUAL_CHAT = 'casual_chat',             // 日常聊天
  EMOTIONAL_SUPPORT = 'emotional_support', // 情感支持
  LEARNING = 'learning',                   // 学习互动
  CREATIVE_WORK = 'creative_work',         // 创意工作
  PROBLEM_SOLVING = 'problem_solving',     // 问题解决
  ENTERTAINMENT = 'entertainment',         // 娱乐互动
  DEEP_CONVERSATION = 'deep_conversation', // 深度对话
  SKILL_PRACTICE = 'skill_practice',       // 技能练习
  STORYTELLING = 'storytelling',           // 故事讲述
  ROUTINE_CHECK = 'routine_check'          // 例行检查
}

/**
 * 互动模式枚举 - 定义互动的深度和类型
 */
export enum InteractionMode {
  QUICK = 'quick',                         // 快速互动 (< 2分钟)
  NORMAL = 'normal',                       // 正常互动 (2-10分钟)
  EXTENDED = 'extended',                   // 延长互动 (10-30分钟)
  DEEP = 'deep'                           // 深度互动 (> 30分钟)
}

/**
 * 用户参与度级别枚举
 */
export enum EngagementLevel {
  LOW = 'low',                            // 低参与度 (简短回复, 长响应时间)
  MEDIUM = 'medium',                      // 中等参与度 (正常回复)
  HIGH = 'high',                          // 高参与度 (详细回复, 快速响应)
  INTENSE = 'intense'                     // 高强度参与 (连续互动, 复杂对话)
}

/**
 * 演化事件接口 - 描述单次互动对个性的影响
 */
export interface EvolutionEvent {
  id: string;                             // 事件唯一标识
  petId: string;                          // 宠物ID
  userId: string;                         // 用户ID
  interactionType: InteractionType;       // 互动类型
  interactionMode: InteractionMode;       // 互动模式
  engagementLevel: EngagementLevel;       // 用户参与度
  duration: number;                       // 互动持续时间 (秒)
  messageCount: number;                   // 消息数量
  topicComplexity: number;                // 话题复杂度 (0-1)
  emotionalIntensity: number;             // 情感强度 (0-1)
  userSatisfaction?: number;              // 用户满意度 (0-1, 可选)
  metadata: InteractionMetadata;          // 扩展元数据
  timestamp: Date;                        // 事件时间戳
}

/**
 * 互动元数据接口 - 存储额外的上下文信息
 */
export interface InteractionMetadata {
  messageLength: number;                  // 平均消息长度
  responseTime: number;                   // 平均响应时间 (毫秒)
  topicTags: string[];                   // 话题标签
  moodIndicators: string[];              // 情绪指标
  skillsUsed: string[];                  // 使用的技能
  contextSwitches: number;               // 上下文切换次数
  userInitiated: boolean;                // 是否用户主动发起
  feedbackGiven: boolean;                // 是否给出反馈
  specialEvents: string[];               // 特殊事件 (如笑话、哭泣等)
}

/**
 * 互动模式统计接口 - 分析用户的互动习惯
 */
export interface InteractionPattern {
  userId: string;                         // 用户ID
  petId: string;                          // 宠物ID
  timeWindow: TimeWindow;                 // 时间窗口
  
  // 频率统计
  totalInteractions: number;              // 总互动次数
  averageSessionLength: number;           // 平均会话长度 (秒)
  interactionFrequency: number;           // 互动频率 (次/天)
  
  // 类型分布
  typeDistribution: Record<InteractionType, number>; // 各类型互动占比
  modeDistribution: Record<InteractionMode, number>; // 各模式互动占比
  engagementDistribution: Record<EngagementLevel, number>; // 参与度分布
  
  // 参与度指标
  averageEngagement: number;              // 平均参与度 (0-1)
  responseTimeVariance: number;           // 响应时间方差
  topicDiversity: number;                 // 话题多样性 (0-1)
  
  // 趋势指标
  engagementTrend: number;                // 参与度趋势 (-1 to 1)
  complexityTrend: number;                // 复杂度趋势 (-1 to 1)
  satisfactionTrend: number;              // 满意度趋势 (-1 to 1)
  
  // 时间模式
  preferredTimeSlots: number[];           // 偏好时间段 (小时)
  weekdayPattern: number[];               // 工作日模式 (0-6)
  seasonalPattern: Record<string, number>; // 季节性模式
}

/**
 * 时间窗口枚举
 */
export enum TimeWindow {
  DAILY = 'daily',                        // 日度
  WEEKLY = 'weekly',                      // 周度
  MONTHLY = 'monthly',                    // 月度
  QUARTERLY = 'quarterly'                 // 季度
}

/**
 * 演化限制接口 - 定义个性特质变化的边界和约束
 */
export interface EvolutionLimits {
  // 日度限制
  dailyLimits: {
    maxChange: number;                    // 单日最大变化量 (0-1)
    maxEvents: number;                    // 单日最大事件数
    coolingPeriod: number;                // 冷却期 (小时)
  };
  
  // 周度限制
  weeklyLimits: {
    maxChange: number;                    // 单周最大变化量 (0-1)
    maxCumulativeChange: number;          // 单周累积最大变化量
  };
  
  // 月度限制
  monthlyLimits: {
    maxChange: number;                    // 单月最大变化量 (0-1)
    maxCumulativeChange: number;          // 单月累积最大变化量
  };
  
  // 特质特定限制
  traitLimits: Record<PersonalityTrait, {
    minValue: number;                     // 最小值 (0-1)
    maxValue: number;                     // 最大值 (0-1)
    changeResistance: number;             // 变化阻力 (0-1)
    volatility: number;                   // 易变性 (0-1)
  }>;
  
  // 全局约束
  globalConstraints: {
    maxSimultaneousChanges: number;       // 同时变化的特质数量限制
    stabilityThreshold: number;           // 稳定性阈值
    emergencyBrake: number;               // 紧急制动阈值
  };
}

/**
 * 个性调整结果接口 - 描述单次演化计算的结果
 */
export interface PersonalityAdjustment {
  traitChanges: Record<PersonalityTrait, number>; // 各特质的变化量 (-1 to 1)
  confidence: number;                     // 调整置信度 (0-1)
  reason: string;                         // 调整原因
  appliedLimits: string[];               // 应用的限制
  metadata: {
    originalValues: Record<PersonalityTrait, number>; // 原始值
    rawChanges: Record<PersonalityTrait, number>;     // 原始计算变化量
    limitedChanges: Record<PersonalityTrait, number>; // 限制后变化量
    stabilityScore: number;               // 稳定性评分
  };
}

/**
 * 演化结果接口 - 完整的演化计算结果
 */
export interface EvolutionResult {
  success: boolean;                       // 是否成功
  petId: string;                          // 宠物ID
  evolutionId: string;                    // 演化记录ID
  
  // 计算结果
  personalityAdjustment: PersonalityAdjustment; // 个性调整结果
  newPersonalityTraits: Record<PersonalityTrait, number>; // 新的个性特质值
  
  // 元数据
  processedEvents: EvolutionEvent[];      // 处理的事件
  interactionPattern: InteractionPattern; // 分析的互动模式
  
  // 性能指标
  processingTime: number;                 // 处理时间 (毫秒)
  eventsProcessed: number;                // 处理事件数
  
  // 审计信息
  timestamp: Date;                        // 计算时间戳
  algorithmVersion: string;               // 算法版本
  configSnapshot: string;                 // 配置快照 (JSON)
  
  // 警告和错误
  warnings: string[];                     // 警告信息
  errors: string[];                       // 错误信息
}

/**
 * 演化历史记录接口 - 用于追踪演化过程
 */
export interface EvolutionHistoryEntry {
  id: string;                             // 记录ID
  petId: string;                          // 宠物ID
  userId: string;                         // 用户ID
  
  // 变化信息
  beforeTraits: Record<PersonalityTrait, number>; // 变化前特质
  afterTraits: Record<PersonalityTrait, number>;  // 变化后特质
  triggerEvent: EvolutionEvent;           // 触发事件
  
  // 计算详情
  calculationDetails: {
    interactionWeight: number;            // 互动权重
    baselineAnchoring: number;            // 基线锚定强度
    limitApplications: string[];          // 应用的限制
    finalScore: number;                   // 最终评分
  };
  
  // 元数据
  timestamp: Date;                        // 记录时间
  algorithmVersion: string;               // 算法版本
  isManualTrigger: boolean;               // 是否手动触发
  notes?: string;                         // 备注
}

/**
 * 基线锚定配置接口 - 定义个性特质的基线行为
 */
export interface BaselineAnchoringConfig {
  // 基线设定
  personalityBaseline: Record<PersonalityTrait, number>; // 个性基线值
  anchoringStrength: number;              // 锚定强度 (0-1)
  
  // 时间衰减
  timeDecayConfig: {
    decayRate: number;                    // 衰减率 (0-1)
    decayFunction: 'linear' | 'exponential' | 'logarithmic'; // 衰减函数类型
    minimumInfluence: number;             // 最小影响力
  };
  
  // 自适应机制
  adaptiveConfig: {
    learningRate: number;                 // 学习率 (0-1)
    adaptationThreshold: number;          // 适应阈值
    maxBaslineShift: number;              // 最大基线偏移
    stabilizationPeriod: number;          // 稳定化周期 (天)
  };
}

/**
 * 演化计算上下文接口 - 提供演化计算所需的完整上下文
 */
export interface EvolutionContext {
  pet: {
    id: string;
    currentTraits: Record<PersonalityTrait, number>;
    createdAt: Date;
    lastEvolutionAt?: Date;
  };
  
  user: {
    id: string;
    interactionHistory: InteractionPattern[];
    preferences: Record<string, any>;
  };
  
  environment: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: number;                    // 0-6
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    isHoliday: boolean;
  };
  
  systemState: {
    serverLoad: number;                   // 服务器负载 (0-1)
    apiQuotaRemaining: number;            // API配额剩余
    experimentalFeatures: string[];       // 实验功能
  };
}

/**
 * 配置验证错误接口
 */
export interface ConfigValidationError {
  field: string;                          // 错误字段
  message: string;                        // 错误消息
  severity: 'warning' | 'error' | 'critical'; // 严重程度
  suggestion?: string;                    // 修复建议
}

/**
 * 配置验证结果接口
 */
export interface ConfigValidationResult {
  isValid: boolean;                       // 是否有效
  errors: ConfigValidationError[];        // 错误列表
  warnings: ConfigValidationError[];      // 警告列表
  summary: string;                        // 验证摘要
}

/**
 * 类型守卫函数 - 运行时类型检查
 */

export function isPersonalityTrait(value: string): value is PersonalityTrait {
  return Object.values(PersonalityTrait).includes(value as PersonalityTrait);
}

export function isInteractionType(value: string): value is InteractionType {
  return Object.values(InteractionType).includes(value as InteractionType);
}

export function isValidTraitValue(value: number): boolean {
  return typeof value === 'number' && value >= 0 && value <= 1 && !isNaN(value);
}

export function isValidEvolutionEvent(event: any): event is EvolutionEvent {
  return (
    typeof event === 'object' &&
    typeof event.id === 'string' &&
    typeof event.petId === 'string' &&
    typeof event.userId === 'string' &&
    isInteractionType(event.interactionType) &&
    typeof event.duration === 'number' &&
    event.duration >= 0 &&
    typeof event.timestamp === 'object' &&
    event.timestamp instanceof Date
  );
}

/**
 * 常量定义
 */

// 默认个性特质值
export const DEFAULT_PERSONALITY_TRAITS: Record<PersonalityTrait, number> = {
  [PersonalityTrait.OPENNESS]: 0.5,
  [PersonalityTrait.CONSCIENTIOUSNESS]: 0.5,
  [PersonalityTrait.EXTRAVERSION]: 0.5,
  [PersonalityTrait.AGREEABLENESS]: 0.5,
  [PersonalityTrait.NEUROTICISM]: 0.5,
  [PersonalityTrait.CREATIVITY]: 0.5,
  [PersonalityTrait.EMPATHY]: 0.5,
  [PersonalityTrait.CURIOSITY]: 0.5,
  [PersonalityTrait.PLAYFULNESS]: 0.5,
  [PersonalityTrait.INTELLIGENCE]: 0.5,
};

// 最小变化阈值
export const MINIMUM_TRAIT_CHANGE = 0.001;

// 最大同时变化特质数
export const MAX_SIMULTANEOUS_TRAIT_CHANGES = 3;

// 默认时间窗口长度 (天)
export const DEFAULT_TIME_WINDOWS = {
  [TimeWindow.DAILY]: 1,
  [TimeWindow.WEEKLY]: 7,
  [TimeWindow.MONTHLY]: 30,
  [TimeWindow.QUARTERLY]: 90,
};

// 算法版本
export const PERSONALITY_ALGORITHM_VERSION = '2.4.0-pipeline';