import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { PersonalityEvolutionEngine } from '../../../algorithms/personality-evolution';
import {
  InteractionClassifier,
  RawInteractionData,
} from '../../../algorithms/interaction-classifier';
import { PersonalityCacheService } from './personality-cache.service';
import { EvolutionBatchService } from './evolution-batch.service';
import { EvolutionHistoryService } from './evolution-history.service';
import {
  PersonalityTraits,
  EvolutionSettings,
} from '../interfaces/personality.interface';
import {
  EvolutionEvent,
  EvolutionResult,
  EvolutionContext,
  PersonalityTrait,
} from '../../../algorithms/types/personality.types';
import {
  PersonalityErrorHandler,
  PetNotFoundError,
} from '../errors/personality.errors';
import { PersonalityLogger } from '../utils/personality-logger';
import {
  DistributedLockService,
  RateLimitService,
} from '../utils/concurrency-control';

@Injectable()
export class PersonalityEvolutionService {
  private readonly logger = new PersonalityLogger('EvolutionService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionEngine: PersonalityEvolutionEngine,
    private readonly interactionClassifier: InteractionClassifier,
    private readonly cacheService: PersonalityCacheService,
    // @ts-ignore - 预留用于未来批量处理优化
    private readonly batchService: EvolutionBatchService,
    // @ts-ignore - 预留用于历史数据查询优化
    private readonly historyService: EvolutionHistoryService,
    private readonly lockService: DistributedLockService,
    private readonly rateLimitService: RateLimitService,
  ) {
    this.logger.logBusiness('log', 'Service initialized', {
      operation: 'initialization',
      businessData: {
        dependenciesLoaded: [
          'prisma',
          'evolutionEngine',
          'interactionClassifier',
          'cacheService',
          'batchService',
          'historyService',
          'lockService',
          'rateLimitService',
        ],
      },
    });
  }

  /**
   * 处理个性演化增量计算 - 核心业务逻辑方法
   */
  async processEvolutionIncrement(
    petId: string,
    interactionData: any,
  ): Promise<void> {
    const startTime = Date.now();

    return PersonalityErrorHandler.wrapAsync(
      async () => {
        // 输入验证
        PersonalityErrorHandler.validateBatch([
          () =>
            PersonalityErrorHandler.validateInput(petId, 'petId', {
              required: true,
              type: 'string',
              minLength: 1,
              pattern: /^[a-zA-Z0-9-]+$/,
            }),
          () =>
            PersonalityErrorHandler.validateInput(
              interactionData,
              'interactionData',
              {
                required: true,
                type: 'object',
              },
            ),
        ]);

        // 添加限流控制 - 防止频繁的演化请求
        const rateLimitKey = `evolution:${petId}`;
        const rateLimitResult = await this.rateLimitService.checkRateLimit(
          rateLimitKey,
          10, // 每分钟最多10次演化请求
          60 * 1000, // 60秒窗口
        );

        if (!rateLimitResult.allowed) {
          this.logger.logBusiness(
            'warn',
            'Rate limit exceeded for evolution processing',
            {
              operation: 'processEvolutionIncrement',
              businessData: {
                petId,
                remaining: rateLimitResult.remaining,
                resetTime: new Date(rateLimitResult.resetTime).toISOString(),
              },
            },
          );
          throw new Error(
            `Rate limit exceeded for pet ${petId}. Try again after ${new Date(rateLimitResult.resetTime).toISOString()}`,
          );
        }

        this.logger.logTrace('processEvolutionIncrement', 'start', {
          entityId: petId,
          traceId: `evolution-${petId}-${Date.now()}`,
          step: 'validation_completed',
          interactionDataKeys: Object.keys(interactionData || {}),
          rateLimitRemaining: rateLimitResult.remaining,
        });

        // 使用分布式锁确保同一宠物的演化处理串行化
        const lockResource = `pet-evolution:${petId}`;

        return await this.lockService.executeWithLock(
          lockResource,
          async () => {
            this.logger.logBusiness(
              'log',
              'Evolution processing started with lock',
              {
                operation: 'processEvolutionIncrement',
                businessData: { petId, lockResource },
              },
            );

            // 使用数据库事务确保数据一致性
            await this.prisma.$transaction(async (prisma) => {
              // 获取宠物信息和历史数据
              const pet = await prisma.pet.findUnique({
                where: { id: petId },
                include: {
                  evolutionLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                  },
                },
              });

              if (!pet) {
                throw new PetNotFoundError(petId, {
                  operation: 'processEvolutionIncrement',
                });
              }

              this.logger.logDatabase('findUnique', 'pet', {
                entityId: petId,
                queryType: 'select',
                recordsAffected: 1,
                businessData: {
                  petName: pet.name,
                  evolutionLogsCount: pet.evolutionLogs.length,
                },
              });

              // 步骤1：转换原始交互数据为RawInteractionData格式
              this.logger.logTrace('processEvolutionIncrement', 'progress', {
                entityId: petId,
                step: 'converting_interaction_data',
                progress: 20,
              });
              const rawInteractionData: RawInteractionData =
                this.convertToRawInteractionData(interactionData, pet);

              // 步骤2：使用InteractionClassifier转换为EvolutionEvent
              this.logger.logTrace('processEvolutionIncrement', 'progress', {
                entityId: petId,
                step: 'classifying_interaction',
                progress: 40,
              });
              const evolutionEvent: EvolutionEvent =
                await this.interactionClassifier.convertToEvolutionEvent(
                  rawInteractionData,
                );

              // 步骤3：构建演化上下文
              this.logger.logTrace('processEvolutionIncrement', 'progress', {
                entityId: petId,
                step: 'building_context',
                progress: 60,
              });
              const context: EvolutionContext =
                await this.buildEvolutionContext(pet);

              // 步骤4：提取当前个性特质
              this.logger.logTrace('processEvolutionIncrement', 'progress', {
                entityId: petId,
                step: 'extracting_traits',
                progress: 70,
              });
              const currentTraits = this.extractCurrentTraits(pet.personality);

              // 步骤5：调用PersonalityEvolutionEngine处理演化
              this.logger.logEvolution('calculation', petId, {
                evolutionType: evolutionEvent.interactionType,
                traitChanges: currentTraits as unknown as Record<
                  string,
                  number
                >,
                businessData: {
                  eventId: evolutionEvent.id,
                  currentTraitsCount: Object.keys(currentTraits).length,
                },
              });

              const evolutionResult: EvolutionResult =
                await this.evolutionEngine.processPersonalityEvolution(
                  petId,
                  pet.userId,
                  [evolutionEvent],
                  currentTraits as any,
                  context,
                );

              this.logger.debug('Evolution calculation completed', {
                petId,
                success: evolutionResult.success,
                eventsProcessed: evolutionResult.eventsProcessed,
                processingTime: evolutionResult.processingTime,
              });

              // 步骤6：应用演化限制检查
              if (!this.validateEvolutionResult(evolutionResult)) {
                this.logger.warn(
                  `Evolution result failed validation for pet ${petId}`,
                );
                return;
              }

              // 步骤7：更新宠物个性特质（使用事务）
              await this.updatePetPersonalityWithTransaction(
                prisma,
                petId,
                evolutionResult,
                pet.personality,
              );

              // 步骤8：记录演化日志（使用事务）
              await this.recordEvolutionLogWithTransaction(
                prisma,
                petId,
                evolutionResult,
                evolutionEvent,
              );

              this.logger.debug(
                `Transaction completed successfully for pet ${petId}`,
                {
                  eventsProcessed: evolutionResult.eventsProcessed,
                  processingTime: evolutionResult.processingTime,
                },
              );
            });

            // 步骤9：智能缓存失效（在事务外执行）
            await this.intelligentCacheInvalidation(
              petId,
              'personality_evolution',
              { processed: true },
            );

            const endTime = Date.now();
            this.logger.logPerformance(
              'processEvolutionIncrement',
              endTime - startTime,
              {
                entityId: petId,
                success: true,
                cacheHit: false,
                databaseQueries: 2,
              },
            );

            this.logger.logTrace('processEvolutionIncrement', 'complete', {
              entityId: petId,
              step: 'transaction_completed',
              progress: 100,
            });
          },
          {
            ttl: 30000, // 30秒锁超时
            maxRetries: 5, // 最多重试5次
            autoRenew: true, // 启用自动续期
            renewInterval: 20000, // 20秒自动续期间隔
          },
        );
      },
      {
        operationType: 'processEvolutionIncrement',
        entityId: petId,
        additionalContext: { interactionDataType: typeof interactionData },
      },
    );
  }

  /**
   * 记录交互事件
   */
  async recordInteractionEvent(
    petId: string,
    interactionData: any,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // 输入验证
      if (!petId || typeof petId !== 'string') {
        throw new Error('Invalid petId provided');
      }

      if (!interactionData || typeof interactionData !== 'object') {
        throw new Error('Invalid interaction data provided');
      }

      this.logger.debug(`Recording interaction event for pet ${petId}`, {
        interactionType: interactionData.type || 'general',
        timestamp: new Date().toISOString(),
      });

      const dbStartTime = Date.now();
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
      });

      if (!pet) {
        throw new Error(`Pet with id ${petId} not found`);
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
          confidence: 0.5,
        },
      });

      const endTime = Date.now();
      this.logger.debug(
        `Interaction event recorded successfully for pet ${petId}`,
        {
          executionTime: endTime - startTime,
          dbOperationTime: endTime - dbStartTime,
          interactionType: interactionData.type || 'general',
          petId,
        },
      );
    } catch (error) {
      const endTime = Date.now();
      this.logger.error(`Failed to record interaction event for pet ${petId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        executionTime: endTime - startTime,
        petId,
        interactionDataType: typeof interactionData,
      });
      throw error;
    }
  }

  /**
   * 更新演化设置
   */
  async updateEvolutionSettings(
    petId: string,
    settings: EvolutionSettings,
  ): Promise<EvolutionSettings> {
    const startTime = Date.now();

    try {
      // 输入验证
      if (!petId || typeof petId !== 'string') {
        throw new Error('Invalid petId provided');
      }

      if (!settings || typeof settings !== 'object') {
        throw new Error('Invalid settings provided');
      }

      this.logger.debug(`Updating evolution settings for pet ${petId}`, {
        settingsKeys: Object.keys(settings),
        timestamp: new Date().toISOString(),
      });

      const dbStartTime = Date.now();
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
      });

      if (!pet) {
        throw new Error(`Pet with id ${petId} not found`);
      }

      // 更新宠物的个性配置（存储在personality JSON字段中）
      const currentPersonality = pet.personality as any;
      const updatedPersonality = {
        ...currentPersonality,
        evolutionSettings: settings,
      };

      await this.prisma.pet.update({
        where: { id: petId },
        data: {
          personality: updatedPersonality,
        },
      });

      // 缓存新设置
      const cacheKey = `evolution_settings_${petId}`;
      await this.cacheService.setWithFallback(cacheKey, settings, 3600); // 1小时缓存

      const endTime = Date.now();
      this.logger.debug(
        `Evolution settings updated successfully for pet ${petId}`,
        {
          executionTime: endTime - startTime,
          dbOperationTime: endTime - dbStartTime,
          settingsCount: Object.keys(settings).length,
          petId,
        },
      );

      return settings;
    } catch (error) {
      const endTime = Date.now();
      this.logger.error(
        `Failed to update evolution settings for pet ${petId}`,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          executionTime: endTime - startTime,
          petId,
          settingsType: typeof settings,
        },
      );
      throw error;
    }
  }

  /**
   * 获取演化设置 - 优化缓存策略
   */
  async getEvolutionSettings(petId: string): Promise<EvolutionSettings> {
    const startTime = Date.now();

    try {
      // 输入验证
      if (!petId || typeof petId !== 'string') {
        throw new Error('Invalid petId provided');
      }

      this.logger.debug(`Getting evolution settings for pet ${petId}`, {
        timestamp: new Date().toISOString(),
      });

      // 优化缓存策略：使用混合缓存（Redis + 内存备用）
      const cacheKey = `evolution_settings_${petId}`;
      const cachedSettings = await this.cacheService.getWithFallback(cacheKey);
      if (cachedSettings) {
        this.logger.debug(
          `Retrieved evolution settings from optimized cache for pet ${petId}`,
          {
            cacheType: 'hybrid',
            cacheAge: Date.now() - startTime,
          },
        );
        return cachedSettings;
      }

      const dbStartTime = Date.now();
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId },
      });

      if (!pet) {
        throw new Error(`Pet with id ${petId} not found`);
      }

      const personality = pet.personality as any;
      const settings =
        personality?.evolutionSettings || this.getDefaultEvolutionSettings();

      // 优化缓存设置：使用智能失效策略和混合存储
      const cacheData = {
        settings,
        timestamp: Date.now(),
        version: '1.0',
        metadata: {
          hasCustomSettings: !!personality?.evolutionSettings,
          lastModified:
            personality?.lastEvolutionCheck || new Date().toISOString(),
        },
      };

      // 使用混合缓存策略，较长的TTL用于稳定数据
      await this.cacheService.setWithFallback(cacheKey, cacheData, 7200); // 2小时缓存

      // 预热相关缓存：为经常访问的数据预设缓存
      await this.preWarmRelatedCache(petId, settings);

      const endTime = Date.now();
      this.logger.debug(
        `Evolution settings retrieved with cache optimization for pet ${petId}`,
        {
          executionTime: endTime - startTime,
          dbQueryTime: endTime - dbStartTime,
          hasCustomSettings: !!personality?.evolutionSettings,
          settingsCount: Object.keys(settings).length,
          cacheStrategy: 'hybrid_prewarmed',
          petId,
        },
      );

      return settings;
    } catch (error) {
      const endTime = Date.now();
      this.logger.error(`Failed to get evolution settings for pet ${petId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        executionTime: endTime - startTime,
        petId,
      });
      throw error;
    }
  }

  /**
   * 获取默认演化设置
   */
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
        neuroticism: { min: 0, max: 100 },
      },
      triggers: {
        conversation: { enabled: true, weight: 1.0 },
        interaction: { enabled: true, weight: 0.8 },
        time_decay: { enabled: true, weight: 0.3 },
      },
    };
  }

  // ===== 私有辅助方法 =====

  /**
   * 转换原始交互数据为RawInteractionData格式
   */
  private convertToRawInteractionData(
    interactionData: any,
    pet: any,
  ): RawInteractionData {
    return {
      id: `interaction_${Date.now()}`,
      petId: pet.id,
      userId: pet.userId,
      conversationId: interactionData.conversationId || `conv_${Date.now()}`,
      timestamp: new Date(),

      // 消息相关
      userMessage: interactionData.userMessage || '',
      botResponse: interactionData.botResponse || '',
      messageCount: interactionData.messageCount || 1,
      averageMessageLength:
        interactionData.averageMessageLength ||
        interactionData.userMessage?.length ||
        50,

      // 时间相关
      responseTime: interactionData.responseTime || 5000,
      sessionDuration: interactionData.sessionDuration || 60,
      timeSinceLastInteraction:
        interactionData.timeSinceLastInteraction || 3600,

      // 上下文相关
      conversationHistory: interactionData.conversationHistory || [],
      topicKeywords:
        interactionData.topicKeywords ||
        this.extractTopicKeywords(interactionData.userMessage || ''),
      emotionIndicators:
        interactionData.emotionIndicators ||
        this.extractEmotionIndicators(interactionData.userMessage || ''),

      // 用户行为
      userInitiated: interactionData.userInitiated ?? true,
      feedbackProvided: interactionData.feedbackProvided ?? false,
      specialActions: interactionData.specialActions || [],

      // 系统状态
      systemLoad: 0.5,
      apiLatency: 100,
      errorOccurred: false,
    };
  }

  /**
   * 构建演化上下文
   */
  private async buildEvolutionContext(pet: any): Promise<EvolutionContext> {
    return {
      pet: {
        id: pet.id,
        currentTraits: this.extractCurrentTraits(pet.personality) as any,
        createdAt: pet.createdAt,
        lastEvolutionAt: pet.personality?.lastEvolutionCheck,
      },
      user: {
        id: pet.userId,
        interactionHistory: [],
        preferences: {},
      },
      environment: {
        timeOfDay: this.getTimeOfDay() as any,
        dayOfWeek: new Date().getDay(),
        season: this.getCurrentSeason() as any,
        isHoliday: false,
      },
      systemState: {
        serverLoad: 0.5,
        apiQuotaRemaining: 1000,
        experimentalFeatures: [],
      },
    };
  }

  /**
   * 提取当前个性特质
   */
  private extractCurrentTraits(personality: any): PersonalityTrait {
    const traits = personality?.traits || this.getDefaultPersonalityTraits();

    // 转换为0-1范围（算法引擎使用的格式）
    const convertedTraits: any = {};
    for (const [trait, value] of Object.entries(traits)) {
      convertedTraits[trait] = typeof value === 'number' ? value / 100 : 0.5;
    }

    return convertedTraits;
  }

  /**
   * 验证演化结果
   */
  private validateEvolutionResult(evolutionResult: EvolutionResult): boolean {
    if (!evolutionResult.success) {
      this.logger.warn('Evolution result marked as unsuccessful');
      return false;
    }

    if (!evolutionResult.newPersonalityTraits) {
      this.logger.warn('Evolution result missing new personality traits');
      return false;
    }

    // 验证特质值在合理范围内
    for (const [trait, value] of Object.entries(
      evolutionResult.newPersonalityTraits,
    )) {
      if (typeof value !== 'number' || value < 0 || value > 1) {
        this.logger.warn(`Invalid trait value for ${trait}: ${value}`);
        return false;
      }
    }

    return true;
  }

  /**
   * 使用事务更新宠物个性特质
   */
  private async updatePetPersonalityWithTransaction(
    prisma: any,
    petId: string,
    evolutionResult: EvolutionResult,
    currentPersonality: any,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Updating pet personality with transaction for pet ${petId}`,
        {
          success: evolutionResult.success,
          newTraitsCount: Object.keys(evolutionResult.newPersonalityTraits)
            .length,
        },
      );

      // 转换回0-100范围
      const updatedTraits: any = {};
      for (const [trait, value] of Object.entries(
        evolutionResult.newPersonalityTraits,
      )) {
        updatedTraits[trait] = Math.round((value as number) * 100);
      }

      const updatedPersonality = {
        ...currentPersonality,
        traits: updatedTraits,
        lastEvolutionCheck: new Date(),
        evolutionMetadata: {
          lastEvolutionResult: {
            success: evolutionResult.success,
            eventsProcessed: evolutionResult.eventsProcessed,
            processingTime: evolutionResult.processingTime,
          },
          updatedAt: new Date().toISOString(),
        },
      };

      await prisma.pet.update({
        where: { id: petId },
        data: {
          personality: updatedPersonality,
        },
      });

      this.logger.debug(
        `Pet personality updated successfully for pet ${petId}`,
        {
          petId,
          traitsUpdated: Object.keys(evolutionResult.newPersonalityTraits)
            .length,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to update pet personality with transaction for pet ${petId}`,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          petId,
        },
      );
      throw error;
    }
  }

  /**
   * 使用事务记录演化日志
   */
  private async recordEvolutionLogWithTransaction(
    prisma: any,
    petId: string,
    evolutionResult: EvolutionResult,
    evolutionEvent: EvolutionEvent,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Recording evolution log with transaction for pet ${petId}`,
        {
          eventType: evolutionEvent.interactionType,
          success: evolutionResult.success,
          eventsProcessed: evolutionResult.eventsProcessed,
        },
      );

      const now = new Date();
      const logData = {
        petId,
        evolutionType: 'personality',
        changeDescription:
          evolutionResult.personalityAdjustment?.reason ||
          'Evolution increment processed',
        triggerEvent: evolutionEvent.interactionType,
        beforeSnapshot:
          evolutionResult.personalityAdjustment?.metadata?.originalValues || {},
        afterSnapshot: evolutionResult.newPersonalityTraits,
        impactScore: evolutionResult.personalityAdjustment?.confidence || 0.5,
        significance: this.calculateEvolutionSignificance(evolutionResult),
        analysisData: {
          eventsProcessed: evolutionResult.eventsProcessed,
          processingTime: evolutionResult.processingTime,
          appliedLimits:
            evolutionResult.personalityAdjustment?.appliedLimits || [],
          algorithmVersion: evolutionResult.algorithmVersion || '1.0',
          eventId: evolutionEvent.id,
          interactionType: evolutionEvent.interactionType,
        },
        yearMonth: now.toISOString().substring(0, 7),
        dayOfWeek: now.getDay() || 7,
        hourOfDay: now.getHours(),
      };

      await prisma.petEvolutionLog.create({
        data: logData,
      });

      this.logger.debug(
        `Evolution log recorded successfully for pet ${petId}`,
        {
          petId,
          logId: `${petId}-${now.toISOString()}`,
          impactScore: logData.impactScore,
          significance: logData.significance,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to record evolution log with transaction for pet ${petId}`,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          petId,
          eventType: evolutionEvent.interactionType,
        },
      );
      throw error;
    }
  }

  /**
   * 计算演化意义度
   */
  private calculateEvolutionSignificance(
    evolutionResult: EvolutionResult,
  ): number {
    try {
      if (!evolutionResult.personalityAdjustment?.traitChanges) {
        return 0;
      }

      const traitChanges = evolutionResult.personalityAdjustment.traitChanges;
      const totalChange = Object.values(traitChanges).reduce(
        (sum, change) => sum + Math.abs(change),
        0,
      );
      const averageChange = totalChange / Object.keys(traitChanges).length;

      // 基于变化幅度和置信度计算意义度
      const confidence =
        evolutionResult.personalityAdjustment.confidence || 0.5;
      const significance = Math.min(averageChange * confidence, 1);

      return significance;
    } catch (error) {
      this.logger.error('Failed to calculate evolution significance', error);
      return 0;
    }
  }

  // ===== 批量处理集成方法 =====

  /**
   * 批量处理演化增量 - 异步批量处理优化
   */
  async processBatchEvolutionIncrements(
    batchData: Array<{ petId: string; interactionData: any }>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Starting batch evolution processing for ${batchData.length} pets`,
      );

      // 验证批量数据
      const validBatchData = batchData.filter(
        (item) =>
          item.petId &&
          typeof item.petId === 'string' &&
          item.interactionData &&
          typeof item.interactionData === 'object',
      );

      if (validBatchData.length === 0) {
        throw new Error('No valid batch data provided');
      }

      // 使用批量服务进行并行处理，但限制并发数
      const batchSize = 10; // 限制并发数量
      const batches = [];

      for (let i = 0; i < validBatchData.length; i += batchSize) {
        batches.push(validBatchData.slice(i, i + batchSize));
      }

      const results = [];
      for (const batch of batches) {
        const batchPromises = batch.map((item) =>
          this.processEvolutionIncrement(
            item.petId,
            item.interactionData,
          ).catch((error) => {
            this.logger.error(
              `Batch evolution failed for pet ${item.petId}`,
              error,
            );
            return { petId: item.petId, error: error.message };
          }),
        );

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
      }

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - successful;

      // 批量缓存失效
      if (successful > 0) {
        await this.intelligentCacheInvalidation('', 'batch_update', {
          processedCount: successful,
          failedCount: failed,
        });
      }

      const endTime = Date.now();
      this.logger.debug(`Batch evolution processing completed`, {
        totalExecutionTime: endTime - startTime,
        totalItems: batchData.length,
        validItems: validBatchData.length,
        successful,
        failed,
        batchSize,
        batches: batches.length,
        strategy: 'controlled_concurrency_batch',
      });
    } catch (error) {
      const endTime = Date.now();
      this.logger.error(`Batch evolution processing failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: endTime - startTime,
        batchSize: batchData.length,
      });
      throw error;
    }
  }

  /**
   * 异步批量演化处理 - 后台异步处理
   */
  async scheduleAsyncBatchEvolution(
    batchData: Array<{ petId: string; interactionData: any }>,
  ): Promise<string> {
    try {
      this.logger.debug(
        `Scheduling async batch evolution for ${batchData.length} pets`,
      );

      // 生成批量任务ID
      const batchId = `async_batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // 准备批量数据结构
      const evolutionData = batchData.map((item, index) => ({
        petId: item.petId,
        evolutionType: 'personality',
        changeDescription: 'Async batch evolution increment',
        triggerEvent: 'batch_async',
        beforeSnapshot: {},
        afterSnapshot: item.interactionData,
        impactScore: 0.5,
        significance: '0.5',
        analysisData: {
          batchId,
          batchIndex: index,
          isAsync: true,
          scheduledAt: new Date().toISOString(),
        },
      }));

      // 使用 EvolutionBatchService 进行异步批量写入
      const batchResult =
        await this.batchService.batchWriteEvolutions(evolutionData);

      // 缓存批量任务信息
      await this.cacheService.cacheBatchEvolution(
        batchData.map((item) => item.petId),
        {
          batchId,
          status: 'scheduled',
          itemCount: batchData.length,
          scheduledAt: Date.now(),
          batchResult,
        },
      );

      this.logger.debug(`Async batch evolution scheduled successfully`, {
        batchId,
        itemCount: batchData.length,
        successful: batchResult.successCount || 0,
        failed: batchResult.failureCount || 0,
        strategy: 'async_batch_service',
      });

      return batchId;
    } catch (error) {
      this.logger.error(`Failed to schedule async batch evolution`, error);
      throw error;
    }
  }

  /**
   * 获取批量处理状态
   */
  async getBatchEvolutionStatus(batchId: string): Promise<any> {
    try {
      // 从批量服务获取详细信息
      const batchInfo = await this.batchService.getBatchInfo(batchId);

      // 从缓存获取补充信息
      const petIds = batchInfo.petIds || [];
      const cachedInfo = await this.cacheService.getBatchEvolution(petIds);

      return {
        batchId,
        status: batchInfo.status || 'unknown',
        progress: {
          total: batchInfo.totalItems || 0,
          processed: batchInfo.processedItems || 0,
          successful: batchInfo.successful || 0,
          failed: batchInfo.failed || 0,
        },
        timing: {
          scheduledAt: cachedInfo?.scheduledAt,
          startedAt: batchInfo.startedAt,
          completedAt: batchInfo.completedAt,
          estimatedCompletionTime: batchInfo.estimatedCompletionTime,
        },
        metadata: {
          strategy: 'batch_service_integration',
          cachedInfo: !!cachedInfo,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get batch evolution status for ${batchId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 批量演化数据分析 - 集成批量分析功能
   */
  async analyzeBatchEvolutionResults(batchId: string): Promise<any> {
    try {
      this.logger.debug(`Analyzing batch evolution results for ${batchId}`);

      // 使用批量服务进行分析
      const analysisResult =
        await this.batchService.batchAnalyzeEvolutions(batchId);

      // 增强分析结果
      const enhancedAnalysis = {
        ...analysisResult,
        trends: {
          overallSuccess: analysisResult.successful / analysisResult.totalItems,
          averageProcessingTime:
            analysisResult.totalProcessingTime / analysisResult.totalItems,
          errorPatterns: this.analyzeErrorPatterns(analysisResult.errors || []),
          performanceMetrics:
            this.calculateBatchPerformanceMetrics(analysisResult),
        },
        recommendations:
          this.generateBatchOptimizationRecommendations(analysisResult),
        timestamp: Date.now(),
        analysisVersion: '1.0',
      };

      // 缓存分析结果
      await this.cacheService.setWithFallback(
        `batch_analysis_${batchId}`,
        enhancedAnalysis,
        3600, // 1小时缓存
      );

      this.logger.debug(`Batch evolution analysis completed for ${batchId}`, {
        totalItems: analysisResult.totalItems,
        successful: analysisResult.successful,
        failed: analysisResult.failed,
        overallSuccessRate: enhancedAnalysis.trends.overallSuccess,
        strategy: 'enhanced_batch_analysis',
      });

      return enhancedAnalysis;
    } catch (error) {
      this.logger.error(
        `Failed to analyze batch evolution results for ${batchId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 分析错误模式
   */
  private analyzeErrorPatterns(errors: any[]): any {
    const errorTypes: { [key: string]: number } = {};
    const errorFrequency: { [key: string]: number } = {};

    errors.forEach((error) => {
      const errorType = error.type || 'unknown';
      const errorMessage = error.message || 'unknown';

      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      errorFrequency[errorMessage] = (errorFrequency[errorMessage] || 0) + 1;
    });

    return {
      byType: errorTypes,
      byMessage: errorFrequency,
      mostCommon: Object.entries(errorFrequency)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5),
    };
  }

  /**
   * 计算批量性能指标
   */
  private calculateBatchPerformanceMetrics(analysisResult: any): any {
    return {
      throughput:
        analysisResult.totalItems / (analysisResult.totalProcessingTime / 1000), // items per second
      errorRate: analysisResult.failed / analysisResult.totalItems,
      averageItemTime:
        analysisResult.totalProcessingTime / analysisResult.totalItems,
      efficiency: analysisResult.successful / analysisResult.totalItems,
      scalabilityScore: Math.min(1, analysisResult.totalItems / 1000), // normalized for up to 1000 items
    };
  }

  /**
   * 生成批量优化建议
   */
  private generateBatchOptimizationRecommendations(
    analysisResult: any,
  ): string[] {
    const recommendations = [];

    if (analysisResult.failed / analysisResult.totalItems > 0.1) {
      recommendations.push('考虑降低批量大小以提高成功率');
    }

    if (analysisResult.totalProcessingTime / analysisResult.totalItems > 5000) {
      recommendations.push('考虑优化单个演化处理性能');
    }

    if (analysisResult.totalItems > 100) {
      recommendations.push('考虑使用更大的批量大小以提高吞吐量');
    }

    return recommendations;
  }

  // ===== 缓存优化方法 =====

  /**
   * 预热相关缓存 - 缓存预热策略
   */
  private async preWarmRelatedCache(
    petId: string,
    _settings: EvolutionSettings,
  ): Promise<void> {
    try {
      this.logger.debug(`Pre-warming related cache for pet ${petId}`);

      // 并行预热多个相关缓存
      const preWarmPromises = [
        // 预热个性分析缓存
        this.cacheService.getPersonalityAnalysis(petId),
        // 预热演化统计缓存
        this.cacheService.getEvolutionStats(petId, 'weekly'),
        // 预热演化趋势缓存
        this.cacheService.getEvolutionTrends(petId, 'monthly'),
      ];

      await Promise.allSettled(preWarmPromises);

      this.logger.debug(`Cache pre-warming completed for pet ${petId}`, {
        preWarmCount: preWarmPromises.length,
        strategy: 'parallel_preload',
      });
    } catch (error) {
      // 预热失败不应该影响主要功能
      this.logger.warn(`Cache pre-warming failed for pet ${petId}`, error);
    }
  }

  /**
   * 批量缓存操作 - 优化批量数据处理
   */
  async batchCacheEvolutionData(
    petIds: string[],
    evolutionData: any[],
  ): Promise<void> {
    try {
      this.logger.debug(
        `Starting batch cache operation for ${petIds.length} pets`,
      );

      const cacheOperations = [];

      for (let i = 0; i < petIds.length; i++) {
        const petId = petIds[i];
        const data = evolutionData[i];

        if (data) {
          // 批量缓存演化数据
          const cacheKey = `evolution_increment_${petId}`;
          cacheOperations.push(
            this.cacheService.setWithFallback(
              cacheKey,
              {
                data,
                timestamp: Date.now(),
                batchId: `batch_${Date.now()}_${i}`,
              },
              1800,
            ), // 30分钟缓存
          );
        }
      }

      // 并行执行所有缓存操作
      await Promise.allSettled(cacheOperations);

      this.logger.debug(`Batch cache operation completed`, {
        petsProcessed: petIds.length,
        cacheOperations: cacheOperations.length,
        strategy: 'parallel_batch_cache',
      });
    } catch (error) {
      this.logger.error(`Batch cache operation failed`, error);
      throw error;
    }
  }

  /**
   * 智能缓存失效 - 基于数据变化的智能失效策略
   */
  async intelligentCacheInvalidation(
    petId: string,
    changeType: string,
    changeData: any,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Starting intelligent cache invalidation for pet ${petId}`,
        {
          changeType,
          changeDataKeys: Object.keys(changeData || {}),
        },
      );

      const invalidationTasks = [];

      // 根据变化类型决定失效策略
      switch (changeType) {
        case 'personality_evolution':
          // 个性演化：失效个性相关的所有缓存
          invalidationTasks.push(
            this.cacheService.invalidatePersonalityCache(petId),
            this.invalidateEvolutionCache(petId),
          );
          break;

        case 'settings_update':
          // 设置更新：只失效设置相关缓存
          invalidationTasks.push(this.invalidateSettingsCache(petId));
          break;

        case 'batch_update':
          // 批量更新：使用批量失效策略
          invalidationTasks.push(this.cacheService.invalidateAllBatchCache());
          break;

        default:
          // 默认：保守策略，失效相关缓存
          invalidationTasks.push(
            this.cacheService.invalidatePersonalityCache(petId),
          );
      }

      await Promise.allSettled(invalidationTasks);

      this.logger.debug(
        `Intelligent cache invalidation completed for pet ${petId}`,
        {
          changeType,
          invalidationTasks: invalidationTasks.length,
          strategy: 'change_aware_invalidation',
        },
      );
    } catch (error) {
      this.logger.error(
        `Intelligent cache invalidation failed for pet ${petId}`,
        error,
      );
      // 缓存失效失败不应该影响主要功能，但需要记录
    }
  }

  /**
   * 失效演化相关缓存
   */
  private async invalidateEvolutionCache(petId: string): Promise<void> {
    const cacheKeys = [
      `evolution_settings_${petId}`,
      `evolution_increment_${petId}`,
      `evolution_history_${petId}`,
    ];

    const invalidationPromises = cacheKeys.map((key) =>
      this.cacheService
        .getWithFallback(key)
        .then(() => {
          // 如果存在则删除
          return this.cacheService.invalidatePersonalityCache(petId);
        })
        .catch(() => {
          // 忽略不存在的key
        }),
    );

    await Promise.allSettled(invalidationPromises);
  }

  /**
   * 失效设置相关缓存
   */
  private async invalidateSettingsCache(petId: string): Promise<void> {
    const settingsCacheKey = `evolution_settings_${petId}`;
    try {
      // 检查缓存是否存在，然后失效
      const exists = await this.cacheService.getWithFallback(settingsCacheKey);
      if (exists) {
        await this.cacheService.invalidatePersonalityCache(petId);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate settings cache for pet ${petId}`,
        error,
      );
    }
  }

  // ===== 演化历史分析方法（为未来扩展预留） =====
  // 这些方法已迁移到 PersonalityAnalyticsService，此处保留接口用于未来功能扩展

  // ===== 工具方法 =====

  private getDefaultPersonalityTraits(): PersonalityTraits {
    return {
      openness: 50,
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 30,
    };
  }

  private extractTopicKeywords(message: string): string[] {
    // 简单的关键词提取
    const words = message.toLowerCase().split(/\s+/);
    return words.filter((word) => word.length > 3).slice(0, 5);
  }

  private extractEmotionIndicators(message: string): string[] {
    // 简单的情感指标提取
    const emotionWords = [
      'happy',
      'sad',
      'angry',
      'excited',
      'tired',
      'confused',
    ];
    const words = message.toLowerCase().split(/\s+/);
    return emotionWords.filter((emotion) => words.includes(emotion));
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month < 3 || month === 11) return 'winter';
    if (month < 6) return 'spring';
    if (month < 9) return 'summer';
    return 'fall';
  }
}
