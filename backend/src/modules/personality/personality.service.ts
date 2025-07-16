import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PersonalityEvolutionEngine } from '../../algorithms/personality-evolution';
import { InteractionClassifier } from '../../algorithms/interaction-classifier';
import { PersonalityTraits, PersonalityEvolutionLog, PersonalityAnalytics, EvolutionSettings } from './interfaces/personality.interface';

@Injectable()
export class PersonalityService {
  private readonly logger = new Logger(PersonalityService.name);
  private readonly evolutionEngine: PersonalityEvolutionEngine;
  private readonly interactionClassifier: InteractionClassifier;

  constructor(private readonly prisma: PrismaService) {
    this.evolutionEngine = new PersonalityEvolutionEngine();
    this.interactionClassifier = new InteractionClassifier();
  }

  async getPersonalityDetails(petId: string): Promise<PersonalityTraits> {
    try {
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
        include: {
          personality: true,
          evolutionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!pet) {
        throw new Error('Pet not found');
      }

      return pet.personality || this.getDefaultPersonalityTraits();
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
          personality: true,
          evolutionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 100
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 500
          }
        }
      });

      if (!pet) {
        throw new Error('Pet not found');
      }

      const analytics = await this.evolutionEngine.analyzePersonalityTrends(
        pet.personality,
        pet.evolutionLogs,
        pet.messages
      );

      return analytics;
    } catch (error) {
      this.logger.error(`Failed to trigger personality analysis for pet ${petId}`, error);
      throw error;
    }
  }

  async updatePersonalityTraits(petId: string, traits: Partial<PersonalityTraits>): Promise<PersonalityTraits> {
    try {
      const updatedPersonality = await this.prisma.pet.update({
        where: { id: petId },
        data: {
          personality: {
            update: traits
          }
        },
        include: {
          personality: true
        }
      });

      await this.recordEvolutionLog(petId, {
        type: 'manual_update',
        oldTraits: null,
        newTraits: updatedPersonality.personality,
        trigger: 'manual_adjustment',
        metadata: {
          updatedFields: Object.keys(traits)
        }
      });

      return updatedPersonality.personality;
    } catch (error) {
      this.logger.error(`Failed to update personality traits for pet ${petId}`, error);
      throw error;
    }
  }

  async getPersonalityHistory(petId: string): Promise<PersonalityEvolutionLog[]> {
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

  async processEvolutionIncrement(petId: string, interactionData: any): Promise<void> {
    try {
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
        include: {
          personality: true,
          evolutionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!pet) {
        throw new Error('Pet not found');
      }

      const classifiedInteraction = await this.interactionClassifier.classifyInteraction(interactionData);
      
      const evolutionResult = await this.evolutionEngine.processEvolutionIncrement(
        pet.personality,
        classifiedInteraction,
        pet.evolutionLogs
      );

      if (evolutionResult.shouldEvolve) {
        await this.prisma.pet.update({
          where: { id: petId },
          data: {
            personality: {
              update: evolutionResult.newTraits
            }
          }
        });

        await this.recordEvolutionLog(petId, {
          type: 'incremental_evolution',
          oldTraits: pet.personality,
          newTraits: evolutionResult.newTraits,
          trigger: evolutionResult.trigger,
          metadata: {
            interactionType: classifiedInteraction.type,
            intensity: classifiedInteraction.intensity,
            confidence: evolutionResult.confidence
          }
        });
      }
    } catch (error) {
      this.logger.error(`Failed to process evolution increment for pet ${petId}`, error);
      throw error;
    }
  }

  async recordInteractionEvent(petId: string, interactionData: any): Promise<void> {
    try {
      const classifiedInteraction = await this.interactionClassifier.classifyInteraction(interactionData);
      
      await this.prisma.interactionPattern.create({
        data: {
          petId,
          type: classifiedInteraction.type,
          intensity: classifiedInteraction.intensity,
          context: classifiedInteraction.context,
          metadata: {
            rawData: interactionData,
            classification: classifiedInteraction,
            timestamp: new Date()
          }
        }
      });

      await this.processEvolutionIncrement(petId, interactionData);
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
          personality: true,
          evolutionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 100
          },
          interactionPatterns: {
            orderBy: { createdAt: 'desc' },
            take: 500
          }
        }
      });

      if (!pet) {
        throw new Error('Pet not found');
      }

      const analytics = await this.evolutionEngine.generatePersonalityAnalytics(
        pet.personality,
        pet.evolutionLogs,
        pet.interactionPatterns
      );

      return analytics;
    } catch (error) {
      this.logger.error(`Failed to get personality analytics for pet ${petId}`, error);
      throw error;
    }
  }

  async updateEvolutionSettings(petId: string, settings: Partial<EvolutionSettings>): Promise<EvolutionSettings> {
    try {
      const updatedSettings = await this.prisma.pet.update({
        where: { id: petId },
        data: {
          evolutionSettings: {
            update: settings
          }
        },
        include: {
          evolutionSettings: true
        }
      });

      this.evolutionEngine.updateSettings(updatedSettings.evolutionSettings);

      await this.recordEvolutionLog(petId, {
        type: 'settings_update',
        oldTraits: null,
        newTraits: null,
        trigger: 'settings_change',
        metadata: {
          updatedSettings: settings
        }
      });

      return updatedSettings.evolutionSettings;
    } catch (error) {
      this.logger.error(`Failed to update evolution settings for pet ${petId}`, error);
      throw error;
    }
  }

  private async recordEvolutionLog(petId: string, logData: any): Promise<void> {
    try {
      await this.prisma.petEvolutionLog.create({
        data: {
          petId,
          ...logData,
          createdAt: new Date()
        }
      });
    } catch (error) {
      this.logger.error(`Failed to record evolution log for pet ${petId}`, error);
    }
  }

  private getDefaultPersonalityTraits(): PersonalityTraits {
    return {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
      curiosity: 0.5,
      playfulness: 0.5,
      independence: 0.5,
      loyalty: 0.5,
      creativity: 0.5
    };
  }
}

export interface PersonalityEvolutionResult {
  shouldEvolve: boolean;
  newTraits: PersonalityTraits;
  trigger: string;
  confidence: number;
}