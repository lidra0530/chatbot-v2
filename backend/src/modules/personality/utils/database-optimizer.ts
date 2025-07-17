import { PrismaService } from '../../../common/prisma.service';
import { PersonalityLogger } from './personality-logger';

/**
 * 数据库查询优化工具
 */
export class DatabaseOptimizer {
  private readonly logger: PersonalityLogger;

  constructor(private readonly prisma: PrismaService) {
    this.logger = new PersonalityLogger('DatabaseOptimizer');
  }

  /**
   * 批量查询宠物数据
   */
  async batchFindPets(petIds: string[], options?: {
    includeEvolutionLogs?: boolean;
    evolutionLogsLimit?: number;
    includeInteractionPatterns?: boolean;
    interactionPatternsLimit?: number;
  }): Promise<any[]> {
    const startTime = Date.now();
    const {
      includeEvolutionLogs = true,
      evolutionLogsLimit = 50,
      includeInteractionPatterns = false,
      interactionPatternsLimit = 30
    } = options || {};

    try {
      this.logger.logTrace('batchFindPets', 'start', {
        step: 'batch_query_initialization',
        batchSize: petIds.length
      });

      // 使用并行查询优化
      const pets = await this.prisma.pet.findMany({
        where: {
          id: { in: petIds }
        },
        include: {
          ...(includeEvolutionLogs && {
            evolutionLogs: {
              orderBy: { createdAt: 'desc' },
              take: evolutionLogsLimit
            }
          }),
          ...(includeInteractionPatterns && {
            interactionPatterns: {
              orderBy: { createdAt: 'desc' },
              take: interactionPatternsLimit
            }
          })
        }
      });

      const duration = Date.now() - startTime;
      this.logger.logPerformance('batchFindPets', duration, {
        success: true,
        dataSize: pets.length,
        cacheHit: false,
        databaseQueries: 1
      });

      return pets;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logPerformance('batchFindPets', duration, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 并行查询个性相关数据
   */
  async parallelFindPersonalityData(petId: string): Promise<{
    pet: any;
    evolutionLogs: any[];
    interactionPatterns: any[];
  }> {
    const startTime = Date.now();

    try {
      this.logger.logTrace('parallelFindPersonalityData', 'start', {
        entityId: petId,
        step: 'parallel_queries_initialization'
      });

      // 并行执行多个查询
      const [pet, evolutionLogs, interactionPatterns] = await Promise.all([
        this.prisma.pet.findUnique({
          where: { id: petId }
        }),
        this.prisma.petEvolutionLog.findMany({
          where: { petId },
          orderBy: { createdAt: 'desc' },
          take: 100
        }),
        this.prisma.interactionPattern.findMany({
          where: { petId },
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      ]);

      const duration = Date.now() - startTime;
      this.logger.logPerformance('parallelFindPersonalityData', duration, {
        entityId: petId,
        success: true,
        dataSize: (evolutionLogs?.length || 0) + (interactionPatterns?.length || 0),
        cacheHit: false,
        databaseQueries: 3
      });

      return {
        pet: pet || null,
        evolutionLogs: evolutionLogs || [],
        interactionPatterns: interactionPatterns || []
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logPerformance('parallelFindPersonalityData', duration, {
        entityId: petId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 优化的演化历史查询
   */
  async optimizedEvolutionHistory(petId: string, options?: {
    timeRange?: { start: Date; end: Date };
    limit?: number;
    includeAnalysisData?: boolean;
    evolutionTypes?: string[];
  }): Promise<any[]> {
    const startTime = Date.now();
    const {
      timeRange,
      limit = 100,
      includeAnalysisData = false,
      evolutionTypes
    } = options || {};

    try {
      this.logger.logTrace('optimizedEvolutionHistory', 'start', {
        entityId: petId,
        step: 'optimized_query_preparation',
        queryOptions: { limit, includeAnalysisData, hasTimeRange: !!timeRange }
      });

      // 构建动态查询条件
      const whereCondition: any = { petId };

      if (timeRange) {
        whereCondition.createdAt = {
          gte: timeRange.start,
          lte: timeRange.end
        };
      }

      if (evolutionTypes && evolutionTypes.length > 0) {
        whereCondition.evolutionType = { in: evolutionTypes };
      }

      // 选择性包含字段以减少数据传输
      const selectFields: any = {
        id: true,
        petId: true,
        evolutionType: true,
        changeDescription: true,
        triggerEvent: true,
        beforeSnapshot: true,
        afterSnapshot: true,
        impactScore: true,
        significance: true,
        createdAt: true
      };

      if (includeAnalysisData) {
        selectFields.analysisData = true;
      }

      const evolutionLogs = await this.prisma.petEvolutionLog.findMany({
        where: whereCondition,
        select: selectFields,
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      const duration = Date.now() - startTime;
      this.logger.logPerformance('optimizedEvolutionHistory', duration, {
        entityId: petId,
        success: true,
        dataSize: evolutionLogs.length,
        cacheHit: false,
        databaseQueries: 1
      });

      return evolutionLogs;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logPerformance('optimizedEvolutionHistory', duration, {
        entityId: petId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 批量插入演化记录（事务优化）
   */
  async batchInsertEvolutionLogs(evolutionData: any[]): Promise<{ successCount: number; failureCount: number }> {
    const startTime = Date.now();
    const batchSize = 100;
    let successCount = 0;
    let failureCount = 0;

    try {
      this.logger.logTrace('batchInsertEvolutionLogs', 'start', {
        step: 'batch_insert_preparation',
        totalItems: evolutionData.length,
        batchSize
      });

      // 分批处理以避免事务过大
      const batches = this.chunkArray(evolutionData, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          await this.prisma.$transaction(async (prisma) => {
            await prisma.petEvolutionLog.createMany({
              data: batch.map(item => ({
                ...item,
                createdAt: new Date()
              }))
            });
          });

          successCount += batch.length;
          
          this.logger.logTrace('batchInsertEvolutionLogs', 'progress', {
            step: 'batch_completed',
            progress: Math.round(((i + 1) / batches.length) * 100),
            currentBatch: i + 1,
            totalBatches: batches.length
          });

        } catch (error) {
          failureCount += batch.length;
          this.logger.logDatabase('batchInsert', 'petEvolutionLog', {
            queryType: 'insert',
            batchSize: batch.length,
            error: error instanceof Error ? error : new Error('Unknown error')
          });
        }
      }

      const duration = Date.now() - startTime;
      this.logger.logPerformance('batchInsertEvolutionLogs', duration, {
        success: failureCount === 0,
        dataSize: successCount,
        databaseQueries: batches.length
      });

      this.logger.logBatch('insertEvolutionLogs', {
        itemCount: evolutionData.length,
        successCount,
        failureCount,
        duration,
        batchSize
      });

      return { successCount, failureCount };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logPerformance('batchInsertEvolutionLogs', duration, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 连接池优化查询
   */
  async optimizedConnection<T>(
    operation: (prisma: PrismaService) => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now();

    try {
      this.logger.logTrace(operationName, 'start', {
        step: 'connection_optimization'
      });

      const result = await operation(this.prisma);

      const duration = Date.now() - startTime;
      this.logger.logPerformance(operationName, duration, {
        success: true,
        databaseQueries: 1
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logPerformance(operationName, duration, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 慢查询监控
   */
  async monitorSlowQuery<T>(
    queryFunction: () => Promise<T>,
    queryName: string,
    slowThreshold: number = 1000
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await queryFunction();
      const duration = Date.now() - startTime;

      if (duration > slowThreshold) {
        this.logger.logDatabase('slowQuery', queryName, {
          duration,
          queryType: 'select',
          recordsAffected: Array.isArray(result) ? result.length : 1
        });
      } else {
        this.logger.logDatabase('normalQuery', queryName, {
          duration,
          queryType: 'select',
          recordsAffected: Array.isArray(result) ? result.length : 1
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logDatabase('failedQuery', queryName, {
        duration,
        queryType: 'select',
        error: error instanceof Error ? error : new Error('Unknown error')
      });
      throw error;
    }
  }

  /**
   * 查询结果缓存封装
   */
  async cacheWrappedQuery<T>(
    cacheKey: string,
    queryFunction: () => Promise<T>,
    cacheService: any,
    ttl: number = 300
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // 尝试从缓存获取
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        this.logger.logCache('hit', cacheKey, {
          success: true,
          strategy: 'database_query_cache'
        });
        return cached;
      }

      // 缓存未命中，执行查询
      this.logger.logCache('miss', cacheKey, {
        success: true,
        strategy: 'database_query_cache'
      });

      const result = await queryFunction();
      
      // 将结果写入缓存
      await cacheService.set(cacheKey, result, ttl);
      this.logger.logCache('set', cacheKey, {
        ttl,
        size: JSON.stringify(result).length,
        strategy: 'database_query_cache',
        success: true
      });

      const duration = Date.now() - startTime;
      this.logger.logPerformance('cacheWrappedQuery', duration, {
        success: true,
        cacheHit: false,
        databaseQueries: 1
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logPerformance('cacheWrappedQuery', duration, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
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
}

/**
 * 数据库查询构建器
 */
export class PersonalityQueryBuilder {
  private readonly logger: PersonalityLogger;

  constructor() {
    this.logger = new PersonalityLogger('QueryBuilder');
  }

  /**
   * 构建演化历史查询
   */
  buildEvolutionHistoryQuery(petId: string, filters: {
    timeRange?: { start: Date; end: Date };
    evolutionTypes?: string[];
    significance?: string[];
    limit?: number;
    offset?: number;
  }) {
    const whereCondition: any = { petId };

    if (filters.timeRange) {
      whereCondition.createdAt = {
        gte: filters.timeRange.start,
        lte: filters.timeRange.end
      };
    }

    if (filters.evolutionTypes && filters.evolutionTypes.length > 0) {
      whereCondition.evolutionType = { in: filters.evolutionTypes };
    }

    if (filters.significance && filters.significance.length > 0) {
      whereCondition.significance = { in: filters.significance };
    }

    this.logger.logBusiness('debug', 'Query built', {
      operation: 'buildEvolutionHistoryQuery',
      entityId: petId,
      businessData: {
        filtersApplied: Object.keys(filters).filter(key => filters[key as keyof typeof filters] !== undefined).length,
        hasTimeRange: !!filters.timeRange,
        hasTypeFilter: !!(filters.evolutionTypes && filters.evolutionTypes.length > 0)
      }
    });

    return {
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0
    };
  }

  /**
   * 构建个性分析查询
   */
  buildPersonalityAnalysisQuery(petId: string, options: {
    includeEvolutionLogs?: boolean;
    includeInteractionPatterns?: boolean;
    recentOnly?: boolean;
  }) {
    const include: any = {};

    if (options.includeEvolutionLogs) {
      include.evolutionLogs = {
        orderBy: { createdAt: 'desc' },
        take: options.recentOnly ? 50 : 200
      };
    }

    if (options.includeInteractionPatterns) {
      include.interactionPatterns = {
        orderBy: { createdAt: 'desc' },
        take: options.recentOnly ? 30 : 100
      };
    }

    this.logger.logBusiness('debug', 'Analysis query built', {
      operation: 'buildPersonalityAnalysisQuery',
      entityId: petId,
      businessData: {
        includeEvolutionLogs: options.includeEvolutionLogs,
        includeInteractionPatterns: options.includeInteractionPatterns,
        recentOnly: options.recentOnly
      }
    });

    return {
      where: { id: petId },
      include
    };
  }
}