import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import * as cron from 'node-cron';

export interface CleanupResult {
  deletedCount: number;
  duration: number;
  timestamp: Date;
}

export interface CleanupStats {
  totalRecords: number;
  expiredRecords: number;
  oldestRecord: Date | null;
  newestRecord: Date | null;
  sizeByType: Record<string, number>;
}

@Injectable()
export class EvolutionCleanupService {
  private readonly logger = new Logger(EvolutionCleanupService.name);
  private cleanupHistory: CleanupResult[] = [];
  private isRunning = false;

  constructor(private prisma: PrismaService) {
    this.scheduleCleanupTasks();
  }

  /**
   * 步骤117: 添加数据清理任务处理过期的演化历史
   */
  private scheduleCleanupTasks(): void {
    // 每天凌晨2点执行清理任务
    cron.schedule('0 2 * * *', async () => {
      this.logger.log('Starting scheduled cleanup task');
      await this.cleanupExpiredEvolutions();
    }, {
      timezone: 'Asia/Shanghai',
    });

    // 每周日凌晨3点执行深度清理
    cron.schedule('0 3 * * 0', async () => {
      this.logger.log('Starting weekly deep cleanup task');
      await this.deepCleanupEvolutions();
    }, {
      timezone: 'Asia/Shanghai',
    });

    // 每月1号凌晨4点执行统计和优化
    cron.schedule('0 4 1 * *', async () => {
      this.logger.log('Starting monthly optimization task');
      await this.optimizeEvolutionStorage();
    }, {
      timezone: 'Asia/Shanghai',
    });

    this.logger.log('Cleanup tasks scheduled successfully');
  }

  /**
   * 清理过期的演化历史
   */
  async cleanupExpiredEvolutions(): Promise<CleanupResult> {
    if (this.isRunning) {
      this.logger.warn('Cleanup task is already running, skipping');
      return { deletedCount: 0, duration: 0, timestamp: new Date() };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // 查找过期记录
      const expiredRecords = await this.prisma.petEvolutionLog.findMany({
        where: {
          expiresAt: {
            lte: new Date(),
          },
        },
        select: { id: true },
      });

      if (expiredRecords.length === 0) {
        this.logger.log('No expired records found for cleanup');
        return { deletedCount: 0, duration: Date.now() - startTime, timestamp: new Date() };
      }

      // 分批删除避免长时间锁定
      const batchSize = 1000;
      let totalDeleted = 0;

      for (let i = 0; i < expiredRecords.length; i += batchSize) {
        const batch = expiredRecords.slice(i, i + batchSize);
        const ids = batch.map(record => record.id);

        const result = await this.prisma.petEvolutionLog.deleteMany({
          where: {
            id: { in: ids },
          },
        });

        totalDeleted += result.count;
        this.logger.debug(`Deleted batch of ${result.count} expired records`);
      }

      const duration = Date.now() - startTime;
      const result: CleanupResult = {
        deletedCount: totalDeleted,
        duration,
        timestamp: new Date(),
      };

      this.cleanupHistory.push(result);
      // 只保留最近100次清理历史
      if (this.cleanupHistory.length > 100) {
        this.cleanupHistory = this.cleanupHistory.slice(-100);
      }

      this.logger.log(`Cleanup completed: deleted ${totalDeleted} records in ${duration}ms`);
      return result;

    } catch (error) {
      this.logger.error(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 深度清理：清理长时间未处理的记录
   */
  async deepCleanupEvolutions(): Promise<CleanupResult> {
    const startTime = Date.now();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      // 删除30天前未处理的记录
      const result = await this.prisma.petEvolutionLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
          isProcessed: false,
        },
      });

      const duration = Date.now() - startTime;
      const cleanupResult: CleanupResult = {
        deletedCount: result.count,
        duration,
        timestamp: new Date(),
      };

      this.logger.log(`Deep cleanup completed: deleted ${result.count} unprocessed records older than 30 days`);
      return cleanupResult;

    } catch (error) {
      this.logger.error(`Deep cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * 优化存储：压缩老旧数据
   */
  async optimizeEvolutionStorage(): Promise<void> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // 查找需要压缩的记录
      const oldRecords = await this.prisma.petEvolutionLog.findMany({
        where: {
          createdAt: {
            lt: sixMonthsAgo,
          },
        },
        select: {
          id: true,
          beforeSnapshot: true,
          afterSnapshot: true,
          analysisData: true,
        },
      });

      // 压缩快照数据（只保留关键信息）
      const batchSize = 100;
      for (let i = 0; i < oldRecords.length; i += batchSize) {
        const batch = oldRecords.slice(i, i + batchSize);
        
        const updatePromises = batch.map(record => {
          const compressedBefore = this.compressSnapshot(record.beforeSnapshot);
          const compressedAfter = this.compressSnapshot(record.afterSnapshot);
          const compressedAnalysis = this.compressAnalysisData(record.analysisData);

          return this.prisma.petEvolutionLog.update({
            where: { id: record.id },
            data: {
              beforeSnapshot: compressedBefore,
              afterSnapshot: compressedAfter,
              analysisData: compressedAnalysis,
            },
          });
        });

        await Promise.all(updatePromises);
        this.logger.debug(`Optimized batch of ${batch.length} records`);
      }

      this.logger.log(`Storage optimization completed for ${oldRecords.length} records`);

    } catch (error) {
      this.logger.error(`Storage optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * 获取清理统计信息
   */
  async getCleanupStats(): Promise<CleanupStats> {
    const [
      totalRecords,
      expiredRecords,
      oldestRecord,
      newestRecord,
      typeStats,
    ] = await Promise.all([
      this.prisma.petEvolutionLog.count(),
      
      this.prisma.petEvolutionLog.count({
        where: {
          expiresAt: {
            lte: new Date(),
          },
        },
      }),
      
      this.prisma.petEvolutionLog.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      
      this.prisma.petEvolutionLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      
      this.prisma.petEvolutionLog.groupBy({
        by: ['evolutionType'],
        _count: { evolutionType: true },
      }),
    ]);

    const sizeByType = typeStats.reduce((acc, stat) => {
      acc[stat.evolutionType] = stat._count.evolutionType;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRecords,
      expiredRecords,
      oldestRecord: oldestRecord?.createdAt || null,
      newestRecord: newestRecord?.createdAt || null,
      sizeByType,
    };
  }

  /**
   * 手动触发清理
   */
  async manualCleanup(): Promise<CleanupResult> {
    this.logger.log('Manual cleanup triggered');
    return await this.cleanupExpiredEvolutions();
  }

  /**
   * 设置记录过期时间
   */
  async setExpiryForRecords(days: number, evolutionType?: string): Promise<number> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const where: any = {
      expiresAt: null,
    };

    if (evolutionType) {
      where.evolutionType = evolutionType;
    }

    const result = await this.prisma.petEvolutionLog.updateMany({
      where,
      data: {
        expiresAt: expiryDate,
      },
    });

    this.logger.log(`Set expiry for ${result.count} records (${days} days from now)`);
    return result.count;
  }

  /**
   * 获取清理历史
   */
  getCleanupHistory(): CleanupResult[] {
    return [...this.cleanupHistory];
  }

  /**
   * 压缩快照数据
   */
  private compressSnapshot(snapshot: any): any {
    if (!snapshot || typeof snapshot !== 'object') {
      return snapshot;
    }

    // 只保留关键信息
    const compressed: any = {};
    
    // 保留个性特质的主要信息
    if (snapshot.traits) {
      compressed.traits = snapshot.traits;
    }

    // 保留状态的主要信息
    if (snapshot.basic) {
      compressed.basic = snapshot.basic;
    }

    // 保留技能的主要信息
    if (snapshot.categories) {
      compressed.categories = {};
      Object.keys(snapshot.categories).forEach(category => {
        compressed.categories[category] = {
          level: snapshot.categories[category].level,
          experience: snapshot.categories[category].experience,
        };
      });
    }

    return compressed;
  }

  /**
   * 压缩分析数据
   */
  private compressAnalysisData(analysisData: any): any {
    if (!analysisData || typeof analysisData !== 'object') {
      return analysisData;
    }

    // 只保留关键分析结果
    const compressed: any = {};
    
    if (analysisData.pattern) {
      compressed.pattern = analysisData.pattern;
    }

    if (analysisData.impact) {
      compressed.impact = analysisData.impact;
    }

    if (analysisData.confidence) {
      compressed.confidence = analysisData.confidence;
    }

    return compressed;
  }

  /**
   * 获取存储使用情况
   */
  async getStorageUsage(): Promise<any> {
    const stats = await this.getCleanupStats();
    
    // 估算存储大小（基于记录数量）
    const estimatedSizePerRecord = 2048; // 2KB per record (估算)
    const totalEstimatedSize = stats.totalRecords * estimatedSizePerRecord;

    return {
      totalRecords: stats.totalRecords,
      estimatedSizeBytes: totalEstimatedSize,
      estimatedSizeMB: Math.round(totalEstimatedSize / (1024 * 1024)),
      expiredRecords: stats.expiredRecords,
      canFreeBytes: stats.expiredRecords * estimatedSizePerRecord,
      canFreeMB: Math.round((stats.expiredRecords * estimatedSizePerRecord) / (1024 * 1024)),
      typeDistribution: stats.sizeByType,
    };
  }
}