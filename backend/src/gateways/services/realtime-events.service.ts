import { Injectable, Logger } from '@nestjs/common';
import { PetGateway } from '../pet.gateway';
import {
  RealtimeEvent,
  PersonalityEvolutionEvent,
  SkillUnlockedEvent,
  StateMilestoneEvent,
  EvolutionOpportunityEvent,
  SerializedEvent,
  EventPushResponse,
} from '../interfaces/realtime-events.interface';
import { PersonalityTrait } from '../../algorithms/types/personality.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RealtimeEventsService {
  private readonly logger = new Logger(RealtimeEventsService.name);

  constructor(private readonly petGateway: PetGateway) {}

  /**
   * 步骤233: 实现 personality_evolution 事件推送
   */
  async pushPersonalityEvolution(
    petId: string,
    userId: string,
    trait: PersonalityTrait,
    oldValue: number,
    newValue: number,
    trigger: string
  ): Promise<EventPushResponse> {
    const change = newValue - oldValue;
    const evolutionLevel = this.determineEvolutionLevel(Math.abs(change));
    
    const event: PersonalityEvolutionEvent = {
      eventType: 'personality_evolution',
      petId,
      userId,
      timestamp: new Date(),
      eventId: uuidv4(),
      data: {
        trait,
        oldValue,
        newValue,
        change,
        trigger,
        description: this.generatePersonalityDescription(trait, change, trigger),
        evolutionLevel,
        impactedBehaviors: this.getImpactedBehaviors(trait),
      },
    };

    return this.pushEvent(event);
  }

  /**
   * 步骤234: 实现 skill_unlocked 事件推送
   */
  async pushSkillUnlocked(
    petId: string,
    userId: string,
    skillData: {
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
    }
  ): Promise<EventPushResponse> {
    const event: SkillUnlockedEvent = {
      eventType: 'skill_unlocked',
      petId,
      userId,
      timestamp: new Date(),
      eventId: uuidv4(),
      data: skillData,
    };

    return this.pushEvent(event);
  }

  /**
   * 步骤235: 实现 state_milestone 事件推送
   */
  async pushStateMilestone(
    petId: string,
    userId: string,
    milestoneData: {
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
    }
  ): Promise<EventPushResponse> {
    const event: StateMilestoneEvent = {
      eventType: 'state_milestone',
      petId,
      userId,
      timestamp: new Date(),
      eventId: uuidv4(),
      data: milestoneData,
    };

    return this.pushEvent(event);
  }

  /**
   * 步骤236: 实现 evolution_opportunity 事件推送
   */
  async pushEvolutionOpportunity(
    petId: string,
    userId: string,
    opportunityData: {
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
      timeLimit?: number;
      difficulty: 'easy' | 'medium' | 'hard';
      interactionHint: string;
    }
  ): Promise<EventPushResponse> {
    const event: EvolutionOpportunityEvent = {
      eventType: 'evolution_opportunity',
      petId,
      userId,
      timestamp: new Date(),
      eventId: uuidv4(),
      data: opportunityData,
    };

    return this.pushEvent(event);
  }

  /**
   * 步骤237: 实现实时消息的序列化和反序列化
   */
  serializeEvent(event: RealtimeEvent): SerializedEvent {
    return {
      eventType: event.eventType,
      petId: event.petId,
      userId: event.userId,
      timestamp: event.timestamp.toISOString(),
      eventId: event.eventId,
      data: event.data,
    };
  }

  deserializeEvent(serialized: SerializedEvent): RealtimeEvent {
    const baseEvent = {
      eventType: serialized.eventType,
      petId: serialized.petId,
      userId: serialized.userId,
      timestamp: new Date(serialized.timestamp),
      eventId: serialized.eventId,
    };

    switch (serialized.eventType) {
      case 'personality_evolution':
        return { ...baseEvent, data: serialized.data } as PersonalityEvolutionEvent;
      case 'skill_unlocked':
        return { ...baseEvent, data: serialized.data } as SkillUnlockedEvent;
      case 'state_milestone':
        return { ...baseEvent, data: serialized.data } as StateMilestoneEvent;
      case 'evolution_opportunity':
        return { ...baseEvent, data: serialized.data } as EvolutionOpportunityEvent;
      default:
        throw new Error(`Unknown event type: ${serialized.eventType}`);
    }
  }

  /**
   * 通用事件推送方法
   */
  private async pushEvent(event: RealtimeEvent): Promise<EventPushResponse> {
    try {
      const serializedEvent = this.serializeEvent(event);
      
      // 推送到宠物房间
      this.petGateway.broadcastToPetRoom(event.petId, 'realtime_event', {
        event: serializedEvent,
        metadata: {
          priority: this.getEventPriority(event.eventType),
          category: this.getEventCategory(event.eventType),
          displayType: this.getDisplayType(event.eventType),
        },
      });

      // 直接发送给用户（如果有多个连接）
      this.petGateway.sendToUser(event.userId, 'realtime_event', {
        event: serializedEvent,
        metadata: {
          priority: this.getEventPriority(event.eventType),
          category: this.getEventCategory(event.eventType),
          displayType: this.getDisplayType(event.eventType),
        },
      });

      this.logger.log(`Successfully pushed ${event.eventType} event for pet ${event.petId}`);

      return {
        success: true,
        eventId: event.eventId,
        timestamp: event.timestamp,
        deliveredTo: [event.userId],
      };

    } catch (error) {
      this.logger.error(`Failed to push ${event.eventType} event for pet ${event.petId}:`, error);
      
      return {
        success: false,
        eventId: event.eventId,
        timestamp: event.timestamp,
        deliveredTo: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 辅助方法：确定演化程度
   */
  private determineEvolutionLevel(change: number): 'minor' | 'moderate' | 'significant' {
    if (change >= 10) return 'significant';
    if (change >= 5) return 'moderate';
    return 'minor';
  }

  /**
   * 辅助方法：生成个性演化描述
   */
  private generatePersonalityDescription(trait: PersonalityTrait, change: number, trigger: string): string {
    const direction = change > 0 ? '增强' : '减弱';
    const intensity = Math.abs(change) >= 10 ? '显著' : Math.abs(change) >= 5 ? '明显' : '轻微';
    
    const traitNames: Record<PersonalityTrait, string> = {
      [PersonalityTrait.OPENNESS]: '开放性',
      [PersonalityTrait.CONSCIENTIOUSNESS]: '责任心',
      [PersonalityTrait.EXTRAVERSION]: '外向性',
      [PersonalityTrait.AGREEABLENESS]: '宜人性',
      [PersonalityTrait.NEUROTICISM]: '神经质',
      [PersonalityTrait.CREATIVITY]: '创造力',
      [PersonalityTrait.EMPATHY]: '共情能力',
      [PersonalityTrait.CURIOSITY]: '好奇心',
      [PersonalityTrait.PLAYFULNESS]: '玩性',
      [PersonalityTrait.INTELLIGENCE]: '智能性',
    };

    return `通过${trigger}，宠物的${traitNames[trait]}${intensity}${direction}了${Math.abs(change)}点`;
  }

  /**
   * 辅助方法：获取受影响的行为
   */
  private getImpactedBehaviors(trait: PersonalityTrait): string[] {
    const behaviors: Record<PersonalityTrait, string[]> = {
      [PersonalityTrait.OPENNESS]: ['探索欲望', '学习能力', '创造性思维'],
      [PersonalityTrait.CONSCIENTIOUSNESS]: ['任务完成度', '时间管理', '目标导向'],
      [PersonalityTrait.EXTRAVERSION]: ['社交活跃度', '表达欲望', '能量水平'],
      [PersonalityTrait.AGREEABLENESS]: ['合作意愿', '同理心', '友善程度'],
      [PersonalityTrait.NEUROTICISM]: ['情绪稳定性', '压力反应', '焦虑水平'],
      [PersonalityTrait.CREATIVITY]: ['创意表达', '想象力', '艺术感知'],
      [PersonalityTrait.EMPATHY]: ['情感理解', '关怀行为', '同情心'],
      [PersonalityTrait.CURIOSITY]: ['求知欲', '探索行为', '问题意识'],
      [PersonalityTrait.PLAYFULNESS]: ['游戏态度', '幽默感', '轻松互动'],
      [PersonalityTrait.INTELLIGENCE]: ['认知能力', '分析思维', '学习效率'],
    };

    return behaviors[trait] || [];
  }

  /**
   * 辅助方法：获取事件优先级
   */
  private getEventPriority(eventType: string): 'high' | 'medium' | 'low' {
    switch (eventType) {
      case 'evolution_opportunity':
        return 'high';
      case 'skill_unlocked':
      case 'personality_evolution':
        return 'medium';
      case 'state_milestone':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * 辅助方法：获取事件分类
   */
  private getEventCategory(eventType: string): string {
    switch (eventType) {
      case 'personality_evolution':
        return 'personality';
      case 'skill_unlocked':
        return 'skills';
      case 'state_milestone':
        return 'state';
      case 'evolution_opportunity':
        return 'opportunity';
      default:
        return 'general';
    }
  }

  /**
   * 辅助方法：获取显示类型
   */
  private getDisplayType(eventType: string): 'notification' | 'popup' | 'toast' | 'inline' {
    switch (eventType) {
      case 'evolution_opportunity':
        return 'popup';
      case 'skill_unlocked':
        return 'notification';
      case 'personality_evolution':
        return 'toast';
      case 'state_milestone':
        return 'inline';
      default:
        return 'notification';
    }
  }
}