// 宠物完整数据模型类型定义

import type { PersonalityTraits, PersonalityEvolution, PersonalityAnalysis } from './personality.types';
import type { SkillProgress, SkillAbility, SkillAchievement, SkillStatistics } from './skills.types';
import type { PetState, StateHistory, StateAnalysis, StateMilestone } from './state.types';

// 宠物基础信息
export interface Pet {
  id: string;
  name: string;
  species: string;
  userId: string;
  personality: PersonalityTraits;
  state: PetState;
  skills: SkillProgress[];
  evolutionLevel: number;
  totalExperience: number;
  createdAt: string;
  lastInteraction: string;
  metadata?: PetMetadata;
}

// 宠物元数据
export interface PetMetadata {
  avatar?: string;           // 头像URL
  theme?: string;            // 主题风格
  customization?: PetCustomization;
  achievements?: string[];   // 成就ID列表
  milestones?: string[];     // 里程碑ID列表
  tags?: string[];           // 自定义标签
  notes?: string;            // 用户备注
  isArchived?: boolean;      // 是否归档
}

// 宠物自定义设置
export interface PetCustomization {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  appearance: {
    style: string;
    accessories: string[];
    animations: string[];
  };
  personality_display: {
    show_traits: boolean;
    show_evolution: boolean;
    trait_visualization: 'radar' | 'bars' | 'gradient';
  };
}

// 完整宠物数据（包含分析数据）
export interface CompletePetData extends Pet {
  personalityAnalysis: PersonalityAnalysis;
  personalityHistory: PersonalityEvolution[];
  stateAnalysis: StateAnalysis;
  stateHistory: StateHistory;
  skillStatistics: SkillStatistics;
  abilities: SkillAbility[];
  achievements: PetAchievement[];
  milestones: PetMilestone[];
  relationships: PetRelationship[];
  timeline: PetTimelineEvent[];
}

// 宠物成就
export interface PetAchievement {
  id: string;
  petId: string;
  type: PetAchievementType;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  progress: {
    current: number;
    target: number;
    isCompleted: boolean;
  };
  reward?: {
    type: 'experience' | 'skill_points' | 'cosmetic' | 'feature_unlock';
    value: number | string;
    description: string;
  };
  unlockedAt?: string;
  category: string;
}

// 宠物成就类型
export type PetAchievementType = 
  | 'first_chat'
  | 'personality_evolution'
  | 'skill_master'
  | 'social_butterfly'
  | 'creative_genius'
  | 'long_term_companion'
  | 'perfect_balance'
  | 'rapid_learner'
  | 'mood_master'
  | 'interaction_streak'
  | 'explorer'
  | 'collector';

// 宠物里程碑
export interface PetMilestone {
  id: string;
  petId: string;
  type: PetMilestoneType;
  name: string;
  description: string;
  achievedAt: string;
  significance: number;      // 重要性 0-1
  snapshot: {
    personality: PersonalityTraits;
    state: PetState;
    level: number;
    experience: number;
  };
  commemorative: {
    message: string;
    image?: string;
    special_effect?: string;
  };
}

// 宠物里程碑类型
export type PetMilestoneType = 
  | 'birth'
  | 'first_week'
  | 'personality_breakthrough'
  | 'skill_mastery'
  | 'level_milestone'
  | 'perfect_day'
  | 'anniversary'
  | 'special_event';

// 宠物关系
export interface PetRelationship {
  id: string;
  petId: string;
  targetType: 'user' | 'pet' | 'character';
  targetId: string;
  relationshipType: PetRelationshipType;
  strength: number;          // 关系强度 0-100
  interactions: number;      // 互动次数
  lastInteraction: string;
  metadata?: {
    notes?: string;
    tags?: string[];
    memories?: string[];     // 重要回忆
  };
}

// 宠物关系类型
export type PetRelationshipType = 
  | 'owner'
  | 'friend'
  | 'mentor'
  | 'rival'
  | 'companion'
  | 'family';

// 宠物时间线事件
export interface PetTimelineEvent {
  id: string;
  petId: string;
  type: PetEventType;
  title: string;
  description: string;
  timestamp: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  data?: Record<string, any>;
  relatedEntities?: {
    type: 'skill' | 'achievement' | 'milestone' | 'evolution';
    id: string;
  }[];
}

// 宠物事件类型
export type PetEventType = 
  | 'creation'
  | 'interaction'
  | 'skill_unlock'
  | 'personality_change'
  | 'state_milestone'
  | 'achievement_earned'
  | 'level_up'
  | 'special_moment'
  | 'user_action'
  | 'system_event';

// 宠物统计信息
export interface PetStatistics {
  basic: {
    age: string;               // 年龄（自创建起）
    totalInteractions: number;
    averageDailyInteractions: number;
    longestStreak: number;     // 最长连续互动天数
    currentStreak: number;     // 当前连续互动天数
  };
  personality: {
    totalEvolutions: number;
    majorChanges: number;
    stabilityScore: number;    // 稳定性评分 0-100
    dominantTraits: string[];
  };
  skills: {
    totalSkills: number;
    unlockedSkills: number;
    masterSkills: number;      // 满级技能数
    totalExperience: number;
    averageSkillLevel: number;
  };
  state: {
    averageHealthScore: number;
    bestMoodStreak: string;    // 最长好心情持续时间
    totalMilestones: number;
    balanceAchievements: number;
  };
  social: {
    chatMessages: number;
    averageResponseTime: number; // 平均响应时间(秒)
    topTopics: string[];       // 最常聊的话题
    emotionalTone: 'positive' | 'neutral' | 'mixed';
  };
}

// 宠物创建请求
export interface CreatePetRequest {
  name: string;
  species: string;
  initialPersonality?: Partial<PersonalityTraits>;
  customization?: PetCustomization;
  preferences?: PetPreferences;
}

// 宠物偏好设置
export interface PetPreferences {
  interactionStyle: 'casual' | 'structured' | 'adaptive';
  evolutionSpeed: 'slow' | 'normal' | 'fast';
  focusAreas: ('personality' | 'skills' | 'state' | 'social')[];
  notificationLevel: 'minimal' | 'normal' | 'detailed';
  privacyLevel: 'private' | 'friends' | 'public';
}

// 宠物更新请求
export interface UpdatePetRequest {
  name?: string;
  customization?: Partial<PetCustomization>;
  preferences?: Partial<PetPreferences>;
  metadata?: Partial<PetMetadata>;
}

// 宠物列表项
export interface PetListItem {
  id: string;
  name: string;
  species: string;
  evolutionLevel: number;
  lastInteraction: string;
  avatar?: string;
  isActive: boolean;
  quickStats: {
    healthScore: number;
    skillsUnlocked: number;
    recentEvolutions: number;
    interactionStreak: number;
  };
}

// 宠物搜索筛选器
export interface PetFilter {
  species?: string[];
  evolutionLevel?: {
    min: number;
    max: number;
  };
  activity?: 'active' | 'inactive' | 'all';
  dateRange?: {
    start: string;
    end: string;
  };
  achievements?: string[];
  sortBy?: 'name' | 'created' | 'lastInteraction' | 'level' | 'experience';
  sortOrder?: 'asc' | 'desc';
}

// 宠物比较结果
export interface PetComparison {
  pets: Pet[];
  comparison: {
    personality: {
      traits: Record<string, number[]>;
      similarities: number;     // 相似度 0-1
      differences: string[];
    };
    skills: {
      overlap: string[];        // 共同技能
      unique: Record<string, string[]>; // 各自独有技能
      averageLevels: Record<string, number>;
    };
    development: {
      ageComparison: string;
      experienceComparison: string;
      milestoneComparison: string;
    };
  };
  insights: string[];
}

// 宠物导出数据
export interface PetExportData {
  pet: Pet;
  statistics: PetStatistics;
  timeline: PetTimelineEvent[];
  achievements: PetAchievement[];
  milestones: PetMilestone[];
  exportedAt: string;
  version: string;
  checksum: string;
}