import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { PersonalityCacheService } from './personality-cache.service';
import { v4 as uuidv4 } from 'uuid';

export interface BatchEvolutionData {
  petId: string;
  evolutionType: string;
  changeDescription: string;
  triggerEvent?: string;
  beforeSnapshot: any;
  afterSnapshot: any;
  impactScore: number;
  significance: string;
  analysisData: any;
}

export interface BatchWriteResult {
  batchId: string;
  successCount: number;
  failureCount: number;
  errors: any[];
}

export interface BatchReadOptions {
  petIds: string[];
  batchSize?: number;
  parallel?: boolean;
  useCache?: boolean;
}

@Injectable()
export class EvolutionBatchService {
  private readonly logger = new Logger(EvolutionBatchService.name);
  
  constructor(
    private prisma: PrismaService,
    private cacheService: PersonalityCacheService,
  ) {}

  /**
   * 步骤116: 实现演化数据的批量写入优化
   */
  async batchWriteEvolutions(evolutionData: BatchEvolutionData[]): Promise<BatchWriteResult> {
    const batchId = uuidv4();
    const errors: any[] = [];
    let successCount = 0;
    let failureCount = 0;

    this.logger.log(`Starting batch write for ${evolutionData.length} evolution records with batch ID: ${batchId}`);

    // 分批处理以避免内存问题
    const batchSize = 100;
    const batches = this.chunkArray(evolutionData, batchSize);

    for (const batch of batches) {
      try {
        // 准备批量数据
        const preparedData = batch.map(item => {
          const now = new Date();
          return {
            petId: item.petId,
            evolutionType: item.evolutionType,
            changeDescription: item.changeDescription,
            triggerEvent: item.triggerEvent,
            beforeSnapshot: item.beforeSnapshot,
            afterSnapshot: item.afterSnapshot,
            impactScore: item.impactScore,
            significance: item.significance,
            analysisData: item.analysisData,
            
            // 优化字段
            yearMonth: now.toISOString().substring(0, 7), // YYYY-MM
            dayOfWeek: now.getDay() || 7, // 1-7
            hourOfDay: now.getHours(),
            batchId: batchId,
            isProcessed: false,
            expiresAt: this.calculateExpiryDate(now),
            createdAt: now,
          };
        });

        // 使用事务进行批量插入
        await this.prisma.$transaction(async (prisma) => {
          await prisma.petEvolutionLog.createMany({
            data: preparedData,
          });
        });

        successCount += batch.length;
        this.logger.debug(`Successfully processed batch of ${batch.length} records`);

      } catch (error) {
        this.logger.error(`Failed to process batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failureCount += batch.length;
        errors.push({
          batchNumber: batches.indexOf(batch),
          error: error instanceof Error ? error.message : 'Unknown error',
          affectedRecords: batch.length,
        });
      }
    }

    // 批量写入完成后，失效相关缓存
    const petIds = [...new Set(evolutionData.map(item => item.petId))];
    await this.invalidateBatchCache(petIds);

    this.logger.log(`Batch write completed. Success: ${successCount}, Failures: ${failureCount}`);

    return {
      batchId,
      successCount,
      failureCount,
      errors,
    };
  }

  /**
   * 批量读取优化
   */
  async batchReadEvolutions(options: BatchReadOptions): Promise<Record<string, any[]>> {
    const { petIds, batchSize = 50, parallel = true, useCache = true } = options;
    
    this.logger.log(`Starting batch read for ${petIds.length} pets`);

    // 如果启用缓存，先尝试从缓存获取
    if (useCache) {
      const cached = await this.cacheService.getBatchEvolution(petIds);
      if (cached) {
        this.logger.debug('Retrieved batch evolution from cache');
        return cached;
      }
    }

    const result: Record<string, any[]> = {};

    if (parallel) {
      // 并行读取
      const chunks = this.chunkArray(petIds, batchSize);
      const promises = chunks.map(chunk => this.readEvolutionChunk(chunk));
      const chunkResults = await Promise.allSettled(promises);

      // 合并结果
      for (const chunkResult of chunkResults) {
        if (chunkResult.status === 'fulfilled') {
          Object.assign(result, chunkResult.value);
        } else {
          this.logger.error(`Failed to read chunk: ${chunkResult.reason}`);
        }
      }
    } else {
      // 顺序读取
      const chunks = this.chunkArray(petIds, batchSize);
      for (const chunk of chunks) {
        try {
          const chunkResult = await this.readEvolutionChunk(chunk);
          Object.assign(result, chunkResult);
        } catch (error) {
          this.logger.error(`Failed to read chunk: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // 缓存结果
    if (useCache) {
      await this.cacheService.cacheBatchEvolution(petIds, result);
    }

    return result;
  }

  /**
   * 读取单个数据块
   */
  private async readEvolutionChunk(petIds: string[]): Promise<Record<string, any[]>> {
    const data = await this.prisma.petEvolutionLog.findMany({
      where: {
        petId: { in: petIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // 每个宠物最多返回100条记录
      include: {
        pet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 按宠物ID分组
    const grouped = data.reduce((acc, log) => {
      if (!acc[log.petId]) {
        acc[log.petId] = [];
      }
      acc[log.petId].push(log);
      return acc;
    }, {} as Record<string, typeof data>);

    return grouped;
  }

  /**
   * 批量更新处理状态
   */
  async batchUpdateProcessingStatus(batchId: string, isProcessed: boolean): Promise<number> {
    try {
      const result = await this.prisma.petEvolutionLog.updateMany({
        where: { batchId },
        data: { isProcessed },
      });

      this.logger.log(`Updated processing status for batch ${batchId}: ${result.count} records`);
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to update processing status for batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 批量分析演化数据
   */
  async batchAnalyzeEvolutions(batchId: string): Promise<any> {
    const evolutions = await this.prisma.petEvolutionLog.findMany({
      where: {
        batchId,
        isProcessed: false,
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const analysis = {
      totalRecords: evolutions.length,
      typeDistribution: {} as Record<string, number>,
      significanceDistribution: {} as Record<string, number>,
      averageImpactScore: 0,
      petStatistics: {} as Record<string, any>,
    };

    let totalImpact = 0;

    for (const evolution of evolutions) {
      // 类型分布
      analysis.typeDistribution[evolution.evolutionType] = 
        (analysis.typeDistribution[evolution.evolutionType] || 0) + 1;

      // 重要性分布
      analysis.significanceDistribution[evolution.significance] = 
        (analysis.significanceDistribution[evolution.significance] || 0) + 1;

      // 影响分数
      totalImpact += evolution.impactScore;

      // 宠物统计
      if (!analysis.petStatistics[evolution.petId]) {
        analysis.petStatistics[evolution.petId] = {
          petName: evolution.pet.name,
          evolutionCount: 0,
          averageImpact: 0,
          types: {},
        };
      }

      const petStats = analysis.petStatistics[evolution.petId];
      petStats.evolutionCount++;
      petStats.averageImpact = (petStats.averageImpact * (petStats.evolutionCount - 1) + evolution.impactScore) / petStats.evolutionCount;
      petStats.types[evolution.evolutionType] = (petStats.types[evolution.evolutionType] || 0) + 1;
    }

    analysis.averageImpactScore = evolutions.length > 0 ? totalImpact / evolutions.length : 0;

    // 标记为已处理
    await this.batchUpdateProcessingStatus(batchId, true);

    return analysis;
  }

  /**
   * 获取批次信息
   */
  async getBatchInfo(batchId: string): Promise<any> {
    const [total, processed, unprocessed] = await Promise.all([
      this.prisma.petEvolutionLog.count({
        where: { batchId },
      }),
      this.prisma.petEvolutionLog.count({
        where: { batchId, isProcessed: true },
      }),
      this.prisma.petEvolutionLog.count({
        where: { batchId, isProcessed: false },
      }),
    ]);

    const firstRecord = await this.prisma.petEvolutionLog.findFirst({
      where: { batchId },
      orderBy: { createdAt: 'asc' },
    });

    const lastRecord = await this.prisma.petEvolutionLog.findFirst({
      where: { batchId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      batchId,
      total,
      processed,
      unprocessed,
      startTime: firstRecord?.createdAt,
      endTime: lastRecord?.createdAt,
      processingProgress: total > 0 ? (processed / total) * 100 : 0,
    };
  }

  /**
   * 工具方法：数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 计算过期日期
   */
  private calculateExpiryDate(baseDate: Date): Date {
    const expiry = new Date(baseDate);
    expiry.setMonth(expiry.getMonth() + 6); // 6个月后过期
    return expiry;
  }

  /**
   * 失效批量缓存
   */
  private async invalidateBatchCache(petIds: string[]): Promise<void> {
    try {
      await Promise.all([
        this.cacheService.invalidateAllBatchCache(),
        ...petIds.map(petId => this.cacheService.invalidatePersonalityCache(petId)),
      ]);
    } catch (error) {
      this.logger.error(`Failed to invalidate batch cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}