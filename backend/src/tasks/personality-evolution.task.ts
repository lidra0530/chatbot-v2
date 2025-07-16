import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { PersonalityService } from '../modules/personality/personality.service';
import { TASK_SCHEDULER_CONFIG } from '../config/task-scheduler.config';

@Injectable()
export class PersonalityEvolutionTask {
  private readonly logger = new Logger(PersonalityEvolutionTask.name);
  private isProcessing = false;
  private processingStats = {
    totalProcessed: 0,
    successfulEvolutions: 0,
    errors: 0,
    lastRunTime: null as Date | null,
    averageProcessingTime: 0
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly personalityService: PersonalityService
  ) {}

  @Cron(CronExpression.EVERY_2_HOURS)
  async handleBatchPersonalityEvolution() {
    if (this.isProcessing) {
      this.logger.warn('Batch personality evolution already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      this.logger.log('Starting batch personality evolution processing...');
      
      const activePets = await this.getActivePetsForEvolution();
      this.logger.log(`Found ${activePets.length} active pets for evolution processing`);

      const batchSize = TASK_SCHEDULER_CONFIG.personalityEvolution.batchSize;
      const batches = this.chunkArray(activePets, batchSize);

      for (const batch of batches) {
        await this.processBatch(batch);
        await this.sleep(TASK_SCHEDULER_CONFIG.personalityEvolution.batchDelay);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      this.updateProcessingStats(processingTime);
      this.logger.log(`Batch personality evolution completed in ${processingTime}ms`);
      
      this.logger.log('Batch personality evolution completed', {
        processedCount: this.processingStats.totalProcessed,
        duration: processingTime,
        stats: this.processingStats
      });

    } catch (error) {
      this.logger.error('Failed to process batch personality evolution', error);
      this.processingStats.errors++;
      
      this.logger.error('Batch personality evolution failed', {
        error: (error as Error).message,
        stats: this.processingStats
      });
    } finally {
      this.isProcessing = false;
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async handlePersonalityAnalyticsUpdate() {
    try {
      this.logger.log('Starting personality analytics update...');
      
      // 获取最近24小时有消息的宠物
      const recentMessages = await this.prisma.message.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        select: { 
          conversation: {
            select: { petId: true }
          }
        }
      });

      const uniquePetIds = [...new Set(recentMessages.map(msg => msg.conversation.petId))];

      for (const petId of uniquePetIds) {
        try {
          await this.personalityService.triggerPersonalityAnalysis(petId);
        } catch (error) {
          this.logger.error(`Failed to update analytics for pet ${petId}`, error);
        }
      }

      this.logger.log(`Analytics updated for ${uniquePetIds.length} pets`);
      
    } catch (error) {
      this.logger.error('Failed to update personality analytics', error);
    }
  }

  async handleRealTimeEvolution(petId: string, interactionData: any): Promise<void> {
    const maxRetries = TASK_SCHEDULER_CONFIG.personalityEvolution.maxRetries;
    let currentRetry = 0;

    while (currentRetry < maxRetries) {
      try {
        this.logger.debug(`Processing real-time evolution for pet ${petId}, attempt ${currentRetry + 1}`);
        
        await this.personalityService.recordInteractionEvent(petId, interactionData);
        
        this.logger.debug('Real-time personality evolution completed', {
          petId,
          interactionData,
          attempt: currentRetry + 1
        });

        return;
        
      } catch (error) {
        currentRetry++;
        this.logger.error(
          `Real-time evolution failed for pet ${petId} (attempt ${currentRetry}/${maxRetries})`,
          error
        );

        if (currentRetry >= maxRetries) {
          this.logger.error('Real-time personality evolution failed after max retries', {
            petId,
            interactionData,
            error: (error as Error).message,
            attempts: currentRetry
          });

          await this.handleEvolutionFailure(petId, interactionData, error);
          throw error;
        }

        if (TASK_SCHEDULER_CONFIG.personalityEvolution.exponentialBackoff) {
          await this.sleep(Math.pow(2, currentRetry) * TASK_SCHEDULER_CONFIG.personalityEvolution.retryDelay);
        } else {
          await this.sleep(TASK_SCHEDULER_CONFIG.personalityEvolution.retryDelay);
        }
      }
    }
  }

  private async getActivePetsForEvolution(): Promise<any[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // 获取最近24小时有消息的宠物
    const recentMessages = await this.prisma.message.findMany({
      where: {
        createdAt: {
          gte: twentyFourHoursAgo
        }
      },
      select: { 
        conversation: {
          select: { petId: true }
        }
      }
    });

    const activePetIds = [...new Set(recentMessages.map(msg => msg.conversation.petId))];

    // 获取这些宠物的详细信息
    const activePets = await Promise.all(
      activePetIds.map(async (petId) => {
        const pet = await this.prisma.pet.findUnique({
          where: { id: petId }
        });

        if (!pet) return null;

        const [evolutionLogs, messages] = await Promise.all([
          this.prisma.petEvolutionLog.findMany({
            where: { petId },
            orderBy: { createdAt: 'desc' },
            take: 5
          }),
          this.prisma.message.findMany({
            where: {
              conversation: {
                petId
              },
              createdAt: {
                gte: twentyFourHoursAgo
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
          })
        ]);

        return {
          ...pet,
          evolutionLogs,
          messages
        };
      })
    );

    return activePets.filter(pet => pet !== null);
  }

  private async processBatch(pets: any[]): Promise<void> {
    const promises = pets.map(async (pet) => {
      try {
        await this.processIndividualPetEvolution(pet);
        this.processingStats.successfulEvolutions++;
      } catch (error) {
        this.logger.error(`Failed to process evolution for pet ${pet.id}`, error);
        this.processingStats.errors++;
      }
      this.processingStats.totalProcessed++;
    });

    await Promise.allSettled(promises);
  }

  private async processIndividualPetEvolution(pet: any): Promise<void> {
    if (!pet.messages || pet.messages.length === 0) {
      return;
    }

    const lastEvolutionTime = pet.evolutionLogs?.[0]?.createdAt || new Date(0);
    const recentMessages = pet.messages.filter(
      (msg: any) => msg.createdAt > lastEvolutionTime
    );

    if (recentMessages.length === 0) {
      return;
    }

    const aggregatedInteractionData = this.aggregateInteractionData(recentMessages);
    
    await this.personalityService.processEvolutionIncrement(
      pet.id,
      aggregatedInteractionData
    );
  }

  private aggregateInteractionData(messages: any[]): any {
    const aggregated = {
      messageCount: messages.length,
      averageLength: messages.reduce((sum, msg) => sum + msg.content.length, 0) / messages.length,
      timeSpan: messages[0].createdAt.getTime() - messages[messages.length - 1].createdAt.getTime(),
      emotionalTone: this.analyzeEmotionalTone(messages),
      interactionFrequency: this.calculateInteractionFrequency(messages)
    };

    return aggregated;
  }

  private analyzeEmotionalTone(messages: any[]): string {
    const positiveKeywords = ['happy', 'good', 'great', 'love', 'awesome', 'excellent'];
    const negativeKeywords = ['sad', 'bad', 'hate', 'terrible', 'awful', 'disappointed'];

    let positiveCount = 0;
    let negativeCount = 0;

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      positiveKeywords.forEach(keyword => {
        if (content.includes(keyword)) positiveCount++;
      });
      negativeKeywords.forEach(keyword => {
        if (content.includes(keyword)) negativeCount++;
      });
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateInteractionFrequency(messages: any[]): number {
    if (messages.length < 2) return 0;
    
    const timeSpan = messages[0].createdAt.getTime() - messages[messages.length - 1].createdAt.getTime();
    const hours = timeSpan / (1000 * 60 * 60);
    
    return messages.length / Math.max(hours, 1);
  }

  private async handleEvolutionFailure(petId: string, interactionData: any, error: any): Promise<void> {
    try {
      await this.prisma.petEvolutionLog.create({
        data: {
          petId,
          evolutionType: 'personality',
          changeDescription: 'Task failure occurred during personality evolution',
          triggerEvent: 'task_failure',
          beforeSnapshot: {},
          afterSnapshot: {},
          impactScore: 0.0,
          significance: 'minor',
          analysisData: {
            error: (error as Error).message,
            interactionData,
            timestamp: new Date(),
            retryCount: 3
          }
        }
      });
    } catch (logError) {
      this.logger.error('Failed to log evolution failure', logError);
    }
  }

  private updateProcessingStats(processingTime: number): void {
    this.processingStats.lastRunTime = new Date();
    this.processingStats.averageProcessingTime = 
      (this.processingStats.averageProcessingTime + processingTime) / 2;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getProcessingStats() {
    return { ...this.processingStats };
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}