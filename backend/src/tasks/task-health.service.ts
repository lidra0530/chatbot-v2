import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { PersonalityEvolutionTask } from './personality-evolution.task';

@Injectable()
export class TaskHealthService {
  private readonly logger = new Logger(TaskHealthService.name);
  private healthHistory: Array<{
    timestamp: Date;
    status: 'healthy' | 'degraded' | 'critical';
    details: any;
  }> = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly personalityEvolutionTask: PersonalityEvolutionTask,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async performHealthCheck() {
    try {
      this.logger.debug('Performing system health check...');
      
      const healthStatus = await this.checkSystemHealth();
      
      // 保存健康状态历史
      this.healthHistory.push({
        timestamp: new Date(),
        status: healthStatus.status,
        details: healthStatus.details,
      });

      // 保留最近100次健康检查记录
      if (this.healthHistory.length > 100) {
        this.healthHistory = this.healthHistory.slice(-100);
      }

      // 记录健康状态变化
      if (healthStatus.status !== 'healthy') {
        this.logger.warn('System health check detected issues', healthStatus);
      }

      // 检查是否需要触发告警
      await this.checkForAlerts(healthStatus);

    } catch (error) {
      this.logger.error('Health check failed', error);
    }
  }

  private async checkSystemHealth() {
    const checks = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkTaskHealth(),
      this.checkMemoryUsage(),
    ]);

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const details: any = {};

    // 数据库健康检查
    if (checks[0].status === 'fulfilled') {
      details.database = checks[0].value;
      if (!checks[0].value.healthy) {
        overallStatus = 'critical';
      }
    } else {
      details.database = { healthy: false, error: checks[0].reason };
      overallStatus = 'critical';
    }

    // 任务健康检查
    if (checks[1].status === 'fulfilled') {
      details.tasks = checks[1].value;
      if (!checks[1].value.healthy && overallStatus !== 'critical') {
        overallStatus = 'degraded';
      }
    } else {
      details.tasks = { healthy: false, error: checks[1].reason };
      if (overallStatus !== 'critical') {
        overallStatus = 'degraded';
      }
    }

    // 内存使用检查
    if (checks[2].status === 'fulfilled') {
      details.memory = checks[2].value;
      if (!checks[2].value.healthy && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    } else {
      details.memory = { healthy: false, error: checks[2].reason };
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      details,
    };
  }

  private async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      await this.prisma.user.findFirst();
      const responseTime = Date.now() - startTime;

      const isHealthy = responseTime < 1000; // 1秒内响应视为健康

      return {
        healthy: isHealthy,
        responseTime,
        status: isHealthy ? 'connected' : 'slow',
      };
    } catch (error) {
      return {
        healthy: false,
        error: (error as Error).message,
        status: 'disconnected',
      };
    }
  }

  private async checkTaskHealth() {
    try {
      const evolutionStats = this.personalityEvolutionTask.getProcessingStats();
      const isProcessing = this.personalityEvolutionTask.isCurrentlyProcessing();

      // 检查错误率
      const errorRate = evolutionStats.totalProcessed > 0 
        ? (evolutionStats.errors / evolutionStats.totalProcessed) * 100 
        : 0;

      // 检查最后运行时间
      const lastRunTime = evolutionStats.lastRunTime;
      const timeSinceLastRun = lastRunTime 
        ? Date.now() - lastRunTime.getTime() 
        : null;

      const isHealthy = errorRate < 10 && (timeSinceLastRun === null || timeSinceLastRun < 4 * 60 * 60 * 1000); // 4小时内

      return {
        healthy: isHealthy,
        errorRate,
        timeSinceLastRun,
        isProcessing,
        stats: evolutionStats,
      };
    } catch (error) {
      return {
        healthy: false,
        error: (error as Error).message,
      };
    }
  }

  private checkMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    const isHealthy = memoryUsagePercent < 85; // 85%以下视为健康

    return {
      healthy: isHealthy,
      memoryUsagePercent,
      heapUsed: usedMemory,
      heapTotal: totalMemory,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
    };
  }

  private async checkForAlerts(healthStatus: any) {
    // 检查是否有连续的不健康状态
    const recentHistory = this.healthHistory.slice(-5);
    const consecutiveUnhealthyCount = recentHistory.filter(h => h.status !== 'healthy').length;

    if (consecutiveUnhealthyCount >= 3) {
      this.logger.error('System has been unhealthy for consecutive checks', {
        consecutiveCount: consecutiveUnhealthyCount,
        currentStatus: healthStatus,
      });
    }

    // 检查关键系统故障
    if (healthStatus.status === 'critical') {
      this.logger.error('Critical system health issue detected', healthStatus);
    }
  }

  getHealthHistory() {
    return this.healthHistory;
  }

  getCurrentHealth() {
    return this.healthHistory[this.healthHistory.length - 1] || null;
  }

  async getDetailedHealthReport() {
    const currentHealth = await this.checkSystemHealth();
    const history = this.healthHistory.slice(-24); // 最近24次检查

    return {
      current: currentHealth,
      history,
      summary: {
        totalChecks: this.healthHistory.length,
        healthyChecks: this.healthHistory.filter(h => h.status === 'healthy').length,
        degradedChecks: this.healthHistory.filter(h => h.status === 'degraded').length,
        criticalChecks: this.healthHistory.filter(h => h.status === 'critical').length,
      },
    };
  }
}