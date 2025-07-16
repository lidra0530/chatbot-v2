import { Injectable, Logger } from '@nestjs/common';
import { PersonalityEvolutionTask } from './personality-evolution.task';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class TaskMonitoringService {
  private readonly logger = new Logger(TaskMonitoringService.name);

  constructor(
    private readonly personalityEvolutionTask: PersonalityEvolutionTask,
    private readonly prisma: PrismaService
  ) {}

  async getTaskHealthStatus() {
    try {
      const evolutionStats = this.personalityEvolutionTask.getProcessingStats();
      const isProcessing = this.personalityEvolutionTask.isCurrentlyProcessing();
      
      const recentErrors = await this.getRecentTaskErrors();
      const systemHealth = this.calculateSystemHealth(evolutionStats, recentErrors);

      return {
        status: systemHealth.status,
        details: {
          personalityEvolution: {
            isProcessing,
            stats: evolutionStats,
            health: systemHealth.evolutionHealth
          },
          recentErrors: recentErrors.length,
          lastHealthCheck: new Date()
        }
      };
    } catch (error) {
      this.logger.error('Failed to get task health status', error);
      return {
        status: 'error',
        details: {
          error: (error as Error).message,
          lastHealthCheck: new Date()
        }
      };
    }
  }

  async getPerformanceMetrics() {
    try {
      const evolutionStats = this.personalityEvolutionTask.getProcessingStats();
      
      const dbMetrics = await this.getDatabaseMetrics();
      const taskMetrics = this.getTaskMetrics(evolutionStats);

      return {
        database: dbMetrics,
        tasks: taskMetrics,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get performance metrics', error);
      throw error;
    }
  }

  private async getRecentTaskErrors(): Promise<any[]> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return await this.prisma.petEvolutionLog.findMany({
      where: {
        triggerEvent: 'task_failure',
        createdAt: {
          gte: oneHourAgo
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  }

  private calculateSystemHealth(evolutionStats: any, recentErrors: any[]) {
    const errorRate = recentErrors.length / Math.max(evolutionStats.totalProcessed, 1);
    const isHealthy = errorRate < 0.1; // Less than 10% error rate
    
    const evolutionHealth = {
      isHealthy,
      errorRate: errorRate * 100,
      lastRunTime: evolutionStats.lastRunTime,
      averageProcessingTime: evolutionStats.averageProcessingTime
    };

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      evolutionHealth
    };
  }

  private async getDatabaseMetrics() {
    const [
      totalPets,
      totalEvolutionLogs,
      totalInteractionPatterns,
      recentActivity
    ] = await Promise.all([
      this.prisma.pet.count(),
      this.prisma.petEvolutionLog.count(),
      this.prisma.interactionPattern.count(),
      this.prisma.message.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return {
      totalPets,
      totalEvolutionLogs,
      totalInteractionPatterns,
      recentActivity
    };
  }

  private getTaskMetrics(evolutionStats: any) {
    return {
      personalityEvolution: {
        totalProcessed: evolutionStats.totalProcessed,
        successfulEvolutions: evolutionStats.successfulEvolutions,
        errors: evolutionStats.errors,
        successRate: evolutionStats.totalProcessed > 0 
          ? (evolutionStats.successfulEvolutions / evolutionStats.totalProcessed) * 100 
          : 0,
        averageProcessingTime: evolutionStats.averageProcessingTime,
        lastRunTime: evolutionStats.lastRunTime
      }
    };
  }

  async logTaskExecution(taskName: string, executionTime: number, status: 'success' | 'failure', details?: any) {
    try {
      this.logger.log(`Task ${taskName} executed in ${executionTime}ms with status: ${status}`);
      
      if (status === 'failure') {
        this.logger.error(`Task ${taskName} failed`, details);
      }
    } catch (error) {
      this.logger.error('Failed to log task execution', error);
    }
  }
}