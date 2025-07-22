// 状态系统类型定义

// 宠物状态
export interface PetState {
  health: number;        // 健康值 0-100
  happiness: number;     // 快乐度 0-100
  energy: number;        // 精力值 0-100
  hunger: number;        // 饥饿度 0-100 (值越高越饿)
  social: number;        // 社交需求 0-100
  mood: PetMood;         // 当前心情
  curiosity: number;     // 好奇心 0-100
  creativity: number;    // 创造力 0-100
  independence: number;  // 独立性 0-100
  lastUpdated: string;
}

// 宠物心情类型
export type PetMood = 
  | 'happy'
  | 'sad' 
  | 'excited'
  | 'calm'
  | 'angry'
  | 'bored'
  | 'curious'
  | 'tired'
  | 'anxious'
  | 'playful'
  | 'content'
  | 'frustrated';

// 心情描述
export interface MoodDescription {
  mood: PetMood;
  name: string;
  description: string;
  emoji: string;
  color: string;
  effects: string[];
  triggers: string[];
}

// 状态变化记录
export interface StateChange {
  id: string;
  petId: string;
  oldState: PetState;
  newState: PetState;
  changes: Partial<PetState>;
  trigger: StateChangeTrigger;
  magnitude: number;       // 变化幅度 0-1
  reason: string;
  createdAt: string;
  metadata?: StateChangeMetadata;
}

// 状态变化触发器
export type StateChangeTrigger = 
  | 'interaction'
  | 'time_decay'
  | 'skill_usage'
  | 'achievement'
  | 'external_event'
  | 'manual_adjustment'
  | 'mood_shift';

// 状态变化元数据
export interface StateChangeMetadata {
  interactionType?: string;
  skillId?: string;
  achievementId?: string;
  externalEventType?: string;
  userAction?: string;
  contextFactors?: Record<string, any>;
}

// 状态历史
export interface StateHistory {
  petId: string;
  timespan: {
    start: string;
    end: string;
  };
  changes: StateChange[];
  patterns: StatePattern[];
  milestones: StateMilestone[];
  statistics: StateStatistics;
}

// 状态模式
export interface StatePattern {
  type: 'daily_cycle' | 'weekly_pattern' | 'interaction_response' | 'decay_pattern';
  description: string;
  states: (keyof PetState)[];
  pattern: {
    time: string;
    values: Record<keyof PetState, number>;
  }[];
  confidence: number;      // 模式置信度 0-1
  significance: number;    // 重要性 0-1
}

// 状态里程碑
export interface StateMilestone {
  id: string;
  petId: string;
  type: StateMilestoneType;
  description: string;
  state: PetState;
  achievedAt: string;
  significance: number;    // 重要性 0-1
  metadata?: Record<string, any>;
}

// 状态里程碑类型
export type StateMilestoneType = 
  | 'perfect_balance'      // 完美平衡
  | 'peak_happiness'       // 快乐峰值
  | 'energy_master'        // 精力充沛
  | 'social_butterfly'     // 社交达人
  | 'creative_genius'      // 创意天才
  | 'independent_spirit'   // 独立精神
  | 'mood_stability'       // 情绪稳定
  | 'recovery_champion'    // 恢复冠军
  | 'curiosity_peaked';    // 好奇心爆棚

// 状态统计
export interface StateStatistics {
  averages: PetState;
  ranges: {
    [K in keyof PetState]: {
      min: number;
      max: number;
      variance: number;
    }
  };
  totalChanges: number;
  changeFrequency: number;  // 每天变化次数
  stabilityScore: number;   // 稳定性评分 0-1
  moodDistribution: Record<PetMood, number>;
  dominantMoods: PetMood[];
}

// 状态分析
export interface StateAnalysis {
  current: PetState;
  trends: StateTrend[];
  alerts: StateAlert[];
  recommendations: StateRecommendation[];
  healthScore: number;      // 整体健康评分 0-100
  balanceScore: number;     // 平衡性评分 0-100
  predictions: StatePrediction[];
}

// 状态趋势
export interface StateTrend {
  state: keyof PetState;
  direction: 'increasing' | 'decreasing' | 'stable' | 'oscillating';
  rate: number;            // 变化率/小时
  confidence: number;      // 趋势置信度 0-1
  timeframe: string;       // 分析时间范围
  factors: string[];       // 影响因素
}

// 状态警报
export interface StateAlert {
  type: 'critical' | 'warning' | 'info';
  state: keyof PetState;
  message: string;
  severity: number;        // 严重程度 0-1
  recommendations: string[];
  triggered: string;
  autoResolve: boolean;
}

// 状态推荐
export interface StateRecommendation {
  type: 'immediate' | 'short_term' | 'long_term';
  title: string;
  description: string;
  targetStates: (keyof PetState)[];
  expectedImpact: Partial<PetState>;
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  priority: number;        // 优先级 0-10
}

// 状态预测
export interface StatePrediction {
  timeframe: '1hour' | '6hours' | '1day' | '3days' | '1week';
  predictedState: PetState;
  confidence: number;
  factors: {
    name: string;
    influence: number;     // 影响权重 0-1
    description: string;
  }[];
  scenarios: {
    name: string;
    probability: number;
    outcome: PetState;
    description: string;
  }[];
}

// 状态干预
export interface StateIntervention {
  id: string;
  type: 'feeding' | 'play' | 'rest' | 'social' | 'exercise' | 'creative_activity';
  name: string;
  description: string;
  effects: Partial<PetState>;
  duration: number;        // 效果持续时间(分钟)
  cooldown: number;        // 冷却时间(分钟)
  energyCost: number;      // 精力消耗
  requirements?: {
    state: keyof PetState;
    operator: '>=' | '>' | '<=' | '<';
    value: number;
  }[];
  isAvailable: boolean;
  lastUsed?: string;
}

// 状态可视化数据
export interface StateVisualizationData {
  gaugeData: {
    state: keyof PetState;
    value: number;
    max: number;
    label: string;
    color: string;
    threshold: {
      low: number;
      medium: number;
      high: number;
    };
  }[];
  timelineData: {
    timestamp: string;
    state: PetState;
    events: StateChange[];
  }[];
  heatmapData: {
    date: string;
    hour: number;
    state: keyof PetState;
    value: number;
  }[];
  radarData: {
    state: keyof PetState;
    value: number;
    average: number;
    label: string;
  }[];
  moodHistory: {
    timestamp: string;
    mood: PetMood;
    duration: number;       // 持续时间(分钟)
  }[];
}

// 状态配置
export interface StateConfig {
  updateInterval: number;   // 更新间隔(秒)
  decayRates: {
    [K in keyof PetState]: number; // 每小时衰减率
  };
  alertThresholds: {
    [K in keyof PetState]: {
      critical: number;
      warning: number;
      good: number;
    };
  };
  moodTransitionRules: {
    from: PetMood;
    to: PetMood;
    probability: number;
    conditions: Record<keyof PetState, { min?: number; max?: number }>;
  }[];
  autoInterventions: boolean;
  interventionThreshold: number;
}

// 状态管理状态
export interface StateManagementState {
  current: PetState | null;
  history: StateHistory | null;
  analysis: StateAnalysis | null;
  interventions: StateIntervention[];
  milestones: StateMilestone[];
  alerts: StateAlert[];
  config: StateConfig;
  recentChanges: StateChange[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  realTimeUpdates: boolean;
}