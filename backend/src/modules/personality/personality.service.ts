import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
// import { PersonalityEvolutionEngine } from '../../algorithms/personality-evolution';
// import { InteractionClassifier } from '../../algorithms/interaction-classifier';
import { PersonalityTraits, PersonalityAnalytics, EvolutionSettings } from './interfaces/personality.interface';

@Injectable()
export class PersonalityService {
  private readonly logger = new Logger(PersonalityService.name);
  // private readonly evolutionEngine: PersonalityEvolutionEngine;
  // private readonly interactionClassifier: InteractionClassifier;

  constructor(private readonly prisma: PrismaService) {
    // this.evolutionEngine = new PersonalityEvolutionEngine();
    // this.interactionClassifier = new InteractionClassifier();
  }

  async getPersonalityDetails(petId: string): Promise<PersonalityTraits> {
    try {
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
        include: {
          evolutionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!pet) {
        throw new Error('Pet not found');
      }

      // 从pet.personality JSON字段解析个性特质
      const personality = pet.personality as any;
      return personality?.traits || this.getDefaultPersonalityTraits();
    } catch (error) {
      this.logger.error(`Failed to get personality details for pet ${petId}`, error);
      throw error;
    }
  }

  async triggerPersonalityAnalysis(petId: string): Promise<PersonalityAnalytics> {
    try {
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
        include: {
          evolutionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 100
          }
        }
      });

      if (!pet) {
        throw new Error('Pet not found');
      }

      // 模拟分析结果
      const analytics: PersonalityAnalytics = {
        trends: {
          openness: { direction: 'stable', changeRate: 0.1, significance: 0.2 },
          conscientiousness: { direction: 'increasing', changeRate: 0.2, significance: 0.3 },
          extraversion: { direction: 'decreasing', changeRate: -0.1, significance: 0.1 },
          agreeableness: { direction: 'stable', changeRate: 0.05, significance: 0.15 },
          neuroticism: { direction: 'decreasing', changeRate: -0.15, significance: 0.25 }
        },
        stability: {
          overall: 0.7,
          individual: {
            openness: 0.8,
            conscientiousness: 0.6,
            extraversion: 0.5,
            agreeableness: 0.9,
            neuroticism: 0.7
          }
        },
        patterns: [
          { type: 'conversation_style', frequency: 0.8, impact: 0.6 },
          { type: 'emotional_response', frequency: 0.6, impact: 0.7 }
        ],
        recommendations: [
          { type: 'stability_improvement', priority: 'medium' as const, description: 'Consider reducing emotional volatility' },
          { type: 'engagement_enhancement', priority: 'high' as const, description: 'Increase social interactions' }
        ]
      };

      return analytics;
    } catch (error) {
      this.logger.error(`Failed to trigger personality analysis for pet ${petId}`, error);
      throw error;
    }
  }

  async processEvolutionIncrement(petId: string, interactionData: any): Promise<void> {
    try {
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
        include: {
          evolutionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });

      if (!pet) {
        throw new Error('Pet not found');
      }

      // 记录演化事件
      await this.prisma.petEvolutionLog.create({
        data: {
          petId,
          evolutionType: 'personality',
          changeDescription: 'Incremental personality evolution based on interaction',
          triggerEvent: 'interaction_increment',
          beforeSnapshot: pet.personality || {},
          afterSnapshot: pet.personality || {}, // 简化版本，实际应该是更新后的个性
          impactScore: 0.1,
          significance: 'minor',
          analysisData: interactionData
        }
      });

      this.logger.debug(`Processed evolution increment for pet ${petId}`);
    } catch (error) {
      this.logger.error(`Failed to process evolution increment for pet ${petId}`, error);
      throw error;
    }
  }

  async recordInteractionEvent(petId: string, interactionData: any): Promise<void> {
    try {
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId }
      });

      if (!pet) {
        throw new Error('Pet not found');
      }

      // 记录交互模式
      await this.prisma.interactionPattern.create({
        data: {
          petId,
          patternType: interactionData.type || 'general',
          patternName: `${interactionData.type}_pattern`,
          description: 'Recorded interaction pattern',
          patternData: interactionData,
          frequency: 1,
          confidence: 0.5
        }
      });

      this.logger.debug(`Recorded interaction event for pet ${petId}`);
    } catch (error) {
      this.logger.error(`Failed to record interaction event for pet ${petId}`, error);
      throw error;
    }
  }

  async getPersonalityAnalytics(petId: string): Promise<PersonalityAnalytics> {
    try {
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
        include: {
          evolutionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 50
          }
        }
      });

      if (!pet) {
        throw new Error('Pet not found');
      }

      // 返回简化的分析结果
      return {
        trends: {
          openness: { direction: 'stable', changeRate: 0.1, significance: 0.2 },
          conscientiousness: { direction: 'increasing', changeRate: 0.2, significance: 0.3 },
          extraversion: { direction: 'decreasing', changeRate: -0.1, significance: 0.1 },
          agreeableness: { direction: 'stable', changeRate: 0.05, significance: 0.15 },
          neuroticism: { direction: 'decreasing', changeRate: -0.15, significance: 0.25 }
        },
        stability: {
          overall: 0.7,
          individual: {
            openness: 0.8,
            conscientiousness: 0.6,
            extraversion: 0.5,
            agreeableness: 0.9,
            neuroticism: 0.7
          }
        },
        patterns: [
          { type: 'conversation_style', frequency: 0.8, impact: 0.6 },
          { type: 'emotional_response', frequency: 0.6, impact: 0.7 }
        ],
        recommendations: [
          { type: 'stability_improvement', priority: 'medium' as const, description: 'Consider reducing emotional volatility' },
          { type: 'engagement_enhancement', priority: 'high' as const, description: 'Increase social interactions' }
        ]
      };
    } catch (error) {
      this.logger.error(`Failed to get personality analytics for pet ${petId}`, error);
      throw error;
    }
  }

  async updateEvolutionSettings(petId: string, settings: EvolutionSettings): Promise<EvolutionSettings> {
    try {
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId }
      });

      if (!pet) {
        throw new Error('Pet not found');
      }

      // 更新宠物的个性配置（存储在personality JSON字段中）
      const currentPersonality = pet.personality as any;
      const updatedPersonality = {
        ...currentPersonality,
        evolutionSettings: settings
      };

      await this.prisma.pet.update({
        where: { id: petId },
        data: {
          personality: updatedPersonality
        }
      });

      return settings;
    } catch (error) {
      this.logger.error(`Failed to update evolution settings for pet ${petId}`, error);
      throw error;
    }
  }

  async getEvolutionSettings(petId: string): Promise<EvolutionSettings> {
    try {
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId }
      });

      if (!pet) {
        throw new Error('Pet not found');
      }

      const personality = pet.personality as any;
      return personality?.evolutionSettings || this.getDefaultEvolutionSettings();
    } catch (error) {
      this.logger.error(`Failed to get evolution settings for pet ${petId}`, error);
      throw error;
    }
  }

  async getPersonalityHistory(petId: string): Promise<any[]> {
    try {
      const evolutionLogs = await this.prisma.petEvolutionLog.findMany({
        where: { petId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return evolutionLogs;
    } catch (error) {
      this.logger.error(`Failed to get personality history for pet ${petId}`, error);
      throw error;
    }
  }

  async updatePersonalityTraits(petId: string, traits: PersonalityTraits): Promise<PersonalityTraits> {
    try {
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId }
      });

      if (!pet) {
        throw new Error('Pet not found');
      }

      const currentPersonality = pet.personality as any;
      const updatedPersonality = {
        ...currentPersonality,
        traits
      };

      await this.prisma.pet.update({
        where: { id: petId },
        data: {
          personality: updatedPersonality
        }
      });

      return traits;
    } catch (error) {
      this.logger.error(`Failed to update personality traits for pet ${petId}`, error);
      throw error;
    }
  }

  private getDefaultPersonalityTraits(): PersonalityTraits {
    return {
      openness: 50,
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 30
    };
  }

  private getDefaultEvolutionSettings(): EvolutionSettings {
    return {
      enabled: true,
      evolutionRate: 1.0,
      stabilityThreshold: 0.8,
      maxDailyChange: 5.0,
      maxWeeklyChange: 15.0,
      maxMonthlyChange: 30.0,
      traitLimits: {
        openness: { min: 0, max: 100 },
        conscientiousness: { min: 0, max: 100 },
        extraversion: { min: 0, max: 100 },
        agreeableness: { min: 0, max: 100 },
        neuroticism: { min: 0, max: 100 }
      },
      triggers: {
        conversation: { enabled: true, weight: 1.0 },
        interaction: { enabled: true, weight: 0.8 },
        time_decay: { enabled: true, weight: 0.3 }
      }
    };
  }
}