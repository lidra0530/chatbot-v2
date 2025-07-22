// 个性系统完整类型定义

// 个性特质类型
export interface PersonalityTraits {
  openness: number;          // 开放性 0-100
  conscientiousness: number; // 尽责性 0-100
  extraversion: number;      // 外向性 0-100
  agreeableness: number;     // 宜人性 0-100
  neuroticism: number;       // 神经质 0-100
}

// 个性特质标签
export type PersonalityTrait = keyof PersonalityTraits;

// 个性特质描述
export interface PersonalityTraitDescription {
  name: string;
  description: string;
  lowDescription: string;   // 低分特征描述
  highDescription: string;  // 高分特征描述
  color: string;           // 可视化颜色
  icon: string;            // 图标
}

// 个性演化事件
export interface PersonalityEvolution {
  id: string;
  petId: string;
  oldTraits: PersonalityTraits;
  newTraits: PersonalityTraits;
  changes: PersonalityAdjustment;
  trigger: EvolutionTrigger;
  confidence: number;      // 演化置信度 0-1
  metadata?: EvolutionMetadata;
  createdAt: string;
}

// 个性调整量
export interface PersonalityAdjustment {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

// 演化触发器类型
export type EvolutionTrigger = 
  | 'chat_interaction'
  | 'skill_unlock'
  | 'state_milestone'
  | 'time_decay'
  | 'manual_trigger';

// 演化元数据
export interface EvolutionMetadata {
  interactionCount?: number;
  interactionTypes?: string[];
  emotionalTone?: 'positive' | 'neutral' | 'negative';
  conversationLength?: number;
  userEngagement?: number;
  contextFactors?: Record<string, any>;
}

// 互动模式分析
export interface InteractionPattern {
  type: string;
  frequency: number;       // 频率
  intensity: number;       // 强度 0-1
  duration: number;        // 持续时间(分钟)
  emotionalImpact: number; // 情感影响 -1到1
  traits: Partial<PersonalityTraits>; // 相关特质影响
}

// 个性分析结果
export interface PersonalityAnalysis {
  currentTraits: PersonalityTraits;
  dominantTraits: PersonalityTrait[];
  weakTraits: PersonalityTrait[];
  balance: number;         // 特质平衡度 0-1
  stability: number;       // 稳定性 0-1
  evolutionPotential: PersonalityEvolutionPotential;
  insights: PersonalityInsight[];
}

// 演化潜力分析
export interface PersonalityEvolutionPotential {
  traits: {
    [K in PersonalityTrait]: {
      changeRate: number;    // 变化速率
      direction: 'increasing' | 'decreasing' | 'stable';
      confidence: number;    // 预测置信度
      factors: string[];     // 影响因素
    }
  };
  overallChangeRate: number;
  nextEvolution?: {
    estimatedTime: string;
    probableChanges: PersonalityAdjustment;
    confidence: number;
  };
}

// 个性洞察
export interface PersonalityInsight {
  type: 'strength' | 'weakness' | 'opportunity' | 'trend';
  title: string;
  description: string;
  relatedTraits: PersonalityTrait[];
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendations?: string[];
}

// 个性演化历史
export interface PersonalityEvolutionHistory {
  evolutions: PersonalityEvolution[];
  timespan: {
    start: string;
    end: string;
  };
  totalChanges: PersonalityAdjustment;
  majorMilestones: PersonalityMilestone[];
  trends: PersonalityTrend[];
}

// 个性里程碑
export interface PersonalityMilestone {
  id: string;
  petId: string;
  type: 'trait_breakthrough' | 'balance_achieved' | 'major_shift';
  description: string;
  traits: PersonalityTraits;
  significance: number;    // 重要性 0-1
  achievedAt: string;
  metadata?: Record<string, any>;
}

// 个性趋势
export interface PersonalityTrend {
  trait: PersonalityTrait;
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number;           // 变化率 每天
  confidence: number;     // 趋势置信度 0-1
  startDate: string;
  endDate: string;
  factors: string[];      // 影响因素
}

// 个性比较结果
export interface PersonalityComparison {
  baseline: PersonalityTraits;
  current: PersonalityTraits;
  differences: PersonalityAdjustment;
  significantChanges: {
    trait: PersonalityTrait;
    change: number;
    significance: 'major' | 'moderate' | 'minor';
    description: string;
  }[];
  summary: string;
}

// 个性预测
export interface PersonalityPrediction {
  timeframe: '1day' | '1week' | '1month' | '3months';
  predictedTraits: PersonalityTraits;
  confidence: number;
  factors: {
    factor: string;
    influence: number;   // 影响权重 0-1
    description: string;
  }[];
  scenarios: {
    name: string;
    probability: number;
    predictedTraits: PersonalityTraits;
    description: string;
  }[];
}

// 个性推荐
export interface PersonalityRecommendation {
  type: 'interaction' | 'activity' | 'environment';
  title: string;
  description: string;
  targetTraits: PersonalityTrait[];
  expectedImpact: PersonalityAdjustment;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
  success_rate: number;
}

// 个性可视化数据
export interface PersonalityVisualizationData {
  radarData: {
    trait: PersonalityTrait;
    value: number;
    label: string;
    color: string;
  }[];
  timelineData: {
    date: string;
    traits: PersonalityTraits;
    events: PersonalityEvolution[];
  }[];
  heatmapData: {
    trait: PersonalityTrait;
    day: string;
    value: number;
  }[];
  distributionData: {
    trait: PersonalityTrait;
    distribution: number[];
    mean: number;
    stdDev: number;
  }[];
}

// 个性配置
export interface PersonalityConfig {
  evolutionEnabled: boolean;
  evolutionSensitivity: number;  // 0-1
  traitBounds: {
    [K in PersonalityTrait]: {
      min: number;
      max: number;
      defaultValue: number;
    }
  };
  evolutionLimits: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  interactionWeights: Record<string, number>;
}

// 个性状态
export interface PersonalityState {
  traits: PersonalityTraits;
  lastUpdate: string;
  isEvolving: boolean;
  pendingEvolutions: PersonalityEvolution[];
  config: PersonalityConfig;
  analytics: PersonalityAnalysis | null;
  history: PersonalityEvolutionHistory | null;
  loading: boolean;
  error: string | null;
}