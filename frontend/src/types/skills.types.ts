// 技能树系统类型定义

// 技能进度
export interface SkillProgress {
  skillId: string;
  name: string;
  category: string;
  experience: number;
  level: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  maxLevel: number;
}

// 技能定义
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  maxLevel: number;
  prerequisites: string[];       // 前置技能ID
  unlockConditions: SkillUnlockCondition;
  effects: SkillEffect[];
  experienceRequired: number[];  // 每级所需经验
  metadata?: Record<string, any>;
}

// 技能解锁条件
export interface SkillUnlockCondition {
  type: 'level' | 'experience' | 'personality' | 'interaction' | 'composite';
  requirements: SkillRequirement[];
  description: string;
}

// 技能需求
export interface SkillRequirement {
  type: 'pet_level' | 'skill_level' | 'personality_trait' | 'interaction_count' | 'state_value';
  target: string;                // 目标属性或技能ID
  operator: '>=' | '>' | '<=' | '<' | '=' | '!=';
  value: number;
  description: string;
}

// 技能效果
export interface SkillEffect {
  type: 'stat_boost' | 'ability_unlock' | 'interaction_modifier' | 'evolution_rate';
  target: string;
  operation: 'add' | 'multiply' | 'set' | 'unlock';
  value: number | string;
  description: string;
  duration?: 'permanent' | 'temporary';
}

// 技能类别
export interface SkillCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  skills: string[];              // 技能ID列表
  position: {
    x: number;
    y: number;
  };
}

// 技能树结构
export interface SkillTree {
  categories: SkillCategory[];
  skills: Skill[];
  connections: SkillConnection[];  // 技能连接关系
  layout: SkillTreeLayout;
}

// 技能连接
export interface SkillConnection {
  from: string;                  // 源技能ID
  to: string;                    // 目标技能ID
  type: 'prerequisite' | 'synergy' | 'conflict';
  strength: number;              // 连接强度 0-1
}

// 技能树布局
export interface SkillTreeLayout {
  type: 'hierarchical' | 'radial' | 'force_directed';
  bounds: {
    width: number;
    height: number;
  };
  spacing: {
    x: number;
    y: number;
  };
  categorySpacing: number;
}

// 技能解锁事件
export interface SkillUnlockEvent {
  id: string;
  petId: string;
  skillId: string;
  previousLevel: number;
  newLevel: number;
  experienceGained: number;
  trigger: SkillUnlockTrigger;
  unlockedAt: string;
  metadata?: SkillUnlockMetadata;
}

// 技能解锁触发器
export type SkillUnlockTrigger = 
  | 'interaction'
  | 'time_based'
  | 'achievement'
  | 'evolution'
  | 'manual';

// 技能解锁元数据
export interface SkillUnlockMetadata {
  triggerSource?: string;
  interactionType?: string;
  experienceSource?: string;
  bonusExperience?: number;
  contextFactors?: Record<string, any>;
}

// 技能推荐
export interface SkillRecommendation {
  skillId: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedUnlockTime: string;
  benefits: string[];
  requirements: SkillRequirement[];
  difficulty: number;            // 0-1
}

// 技能能力
export interface SkillAbility {
  id: string;
  name: string;
  description: string;
  skillId: string;
  requiredLevel: number;
  type: 'active' | 'passive' | 'toggle';
  cooldown?: number;             // 冷却时间(秒)
  energyCost?: number;
  effects: SkillEffect[];
  isAvailable: boolean;
  lastUsed?: string;
}

// 技能使用记录
export interface SkillUsageRecord {
  id: string;
  petId: string;
  skillId: string;
  abilityId?: string;
  usedAt: string;
  context: string;
  effectiveness: number;         // 0-1
  experienceGained: number;
  metadata?: Record<string, any>;
}

// 技能统计
export interface SkillStatistics {
  totalSkillsUnlocked: number;
  totalExperienceGained: number;
  skillsByCategory: Record<string, number>;
  recentUnlocks: SkillUnlockEvent[];
  topSkills: {
    skillId: string;
    experienceGained: number;
    usageCount: number;
  }[];
  progressRate: number;          // 经验获取速率/天
}

// 技能分析
export interface SkillAnalysis {
  currentProgress: SkillProgress[];
  nextUnlocks: SkillRecommendation[];
  strengths: string[];           // 强项技能类别
  weaknesses: string[];          // 薄弱技能类别
  suggestions: SkillRecommendation[];
  developmentPath: SkillDevelopmentPath[];
}

// 技能发展路径
export interface SkillDevelopmentPath {
  name: string;
  description: string;
  skills: string[];              // 按顺序的技能ID
  estimatedTime: string;
  benefits: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  suitability: number;           // 适合度 0-1
}

// 技能成就
export interface SkillAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'unlock' | 'mastery' | 'speed' | 'collection';
  requirements: {
    description: string;
    progress: number;            // 当前进度
    target: number;              // 目标值
    isCompleted: boolean;
  }[];
  reward?: {
    type: 'experience' | 'skill_boost' | 'cosmetic';
    value: number | string;
    description: string;
  };
  unlockedAt?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// 技能可视化数据
export interface SkillVisualizationData {
  treeData: {
    nodes: {
      id: string;
      name: string;
      level: number;
      maxLevel: number;
      isUnlocked: boolean;
      category: string;
      position: { x: number; y: number };
      color: string;
      size: number;
    }[];
    edges: {
      source: string;
      target: string;
      type: string;
      strength: number;
    }[];
  };
  progressData: {
    category: string;
    unlocked: number;
    total: number;
    experience: number;
    maxExperience: number;
  }[];
  timelineData: {
    date: string;
    events: SkillUnlockEvent[];
    totalExperience: number;
  }[];
}

// 技能配置
export interface SkillConfig {
  experienceMultiplier: number;
  autoLevelUp: boolean;
  showRecommendations: boolean;
  preferredCategories: string[];
  difficultyPreference: 'easy' | 'balanced' | 'challenging';
}

// 技能状态
export interface SkillState {
  tree: SkillTree | null;
  progress: SkillProgress[];
  abilities: SkillAbility[];
  achievements: SkillAchievement[];
  statistics: SkillStatistics | null;
  analysis: SkillAnalysis | null;
  recommendations: SkillRecommendation[];
  recentEvents: SkillUnlockEvent[];
  config: SkillConfig;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}