import { PersonalityTrait } from '../../algorithms/types/personality.types';

/**
 * 实时事件的基础接口
 */
export interface BaseRealtimeEvent {
  eventType: string;
  petId: string;
  userId: string;
  timestamp: Date;
  eventId: string;
}

/**
 * 个性演化事件
 */
export interface PersonalityEvolutionEvent extends BaseRealtimeEvent {
  eventType: 'personality_evolution';
  data: {
    trait: PersonalityTrait;
    oldValue: number;
    newValue: number;
    change: number;
    trigger: string;
    description: string;
    evolutionLevel: 'minor' | 'moderate' | 'significant';
    impactedBehaviors: string[];
  };
}

/**
 * 技能解锁事件
 */
export interface SkillUnlockedEvent extends BaseRealtimeEvent {
  eventType: 'skill_unlocked';
  data: {
    skillId: string;
    skillName: string;
    category: string;
    level: number;
    unlockCondition: string;
    description: string;
    requiredExperience: number;
    currentExperience: number;
    abilities: string[];
    prerequisites: string[];
  };
}

/**
 * 状态里程碑事件
 */
export interface StateMilestoneEvent extends BaseRealtimeEvent {
  eventType: 'state_milestone';
  data: {
    milestoneType: 'energy' | 'mood' | 'health' | 'social' | 'activity';
    milestone: string;
    currentValue: number;
    previousValue: number;
    achievement: string;
    description: string;
    reward?: {
      type: 'experience' | 'unlock' | 'bonus';
      value: string | number;
    };
    nextMilestone?: string;
  };
}

/**
 * 演化机会事件
 */
export interface EvolutionOpportunityEvent extends BaseRealtimeEvent {
  eventType: 'evolution_opportunity';
  data: {
    opportunityType: 'personality_growth' | 'skill_development' | 'state_improvement';
    title: string;
    description: string;
    requirements: {
      trait?: PersonalityTrait;
      value?: number;
      skill?: string;
      state?: string;
    }[];
    reward: {
      type: string;
      description: string;
      impact: string;
    };
    timeLimit?: number; // 秒数，如果有时间限制
    difficulty: 'easy' | 'medium' | 'hard';
    interactionHint: string;
  };
}

/**
 * 实时事件联合类型
 */
export type RealtimeEvent = 
  | PersonalityEvolutionEvent 
  | SkillUnlockedEvent 
  | StateMilestoneEvent 
  | EvolutionOpportunityEvent;

/**
 * 事件序列化数据
 */
export interface SerializedEvent {
  eventType: string;
  petId: string;
  userId: string;
  timestamp: string;
  eventId: string;
  data: Record<string, any>;
}

/**
 * 事件推送响应
 */
export interface EventPushResponse {
  success: boolean;
  eventId: string;
  timestamp: Date;
  deliveredTo: string[];
  error?: string;
}