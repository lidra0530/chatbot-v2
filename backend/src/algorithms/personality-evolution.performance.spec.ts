import { PersonalityEvolutionEngine } from './personality-evolution';
import {
  PersonalityTrait,
  InteractionType,
  InteractionMode,
  EngagementLevel,
  EvolutionEvent,
  DEFAULT_PERSONALITY_TRAITS,
  EvolutionContext,
} from './types/personality.types';

describe('PersonalityEvolution Performance Tests', () => {
  let engine: PersonalityEvolutionEngine;

  beforeEach(() => {
    engine = new PersonalityEvolutionEngine();
  });

  const createMockEvent = (overrides: Partial<EvolutionEvent> = {}): EvolutionEvent => ({
    id: 'test-event',
    userId: 'user-123',
    petId: 'pet-456',
    timestamp: new Date(),
    interactionType: InteractionType.CASUAL_CHAT,
    interactionMode: InteractionMode.NORMAL,
    engagementLevel: EngagementLevel.MEDIUM,
    duration: 300,
    messageCount: 5,
    emotionalIntensity: 0.5,
    topicComplexity: 0.6,
    userSatisfaction: 0.7,
    metadata: {
      messageLength: 50,
      responseTime: 100,
      topicTags: ['greeting', 'casual'],
      moodIndicators: ['neutral', 'friendly'],
      skillsUsed: ['conversation', 'empathy'],
      contextSwitches: 0,
      userInitiated: true,
      feedbackGiven: false,
      specialEvents: [],
    },
    ...overrides,
  });

  const createMockContext = (): EvolutionContext => ({
    pet: {
      id: 'pet-456',
      currentTraits: { ...DEFAULT_PERSONALITY_TRAITS },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastEvolutionAt: new Date(),
    },
    user: {
      id: 'user-123',
      interactionHistory: [],
      preferences: { style: 'casual' },
    },
    environment: {
      timeOfDay: 'morning',
      dayOfWeek: 1,
      season: 'spring',
      isHoliday: false,
    },
    systemState: {
      serverLoad: 0.5,
      apiQuotaRemaining: 1000,
      experimentalFeatures: [],
    },
  });

  const createEventBatch = (count: number): EvolutionEvent[] => {
    return Array.from({ length: count }, (_, i) => createMockEvent({
      id: `event-${i}`,
      timestamp: new Date(Date.now() - i * 60 * 1000), // 每分钟一个事件
      interactionType: [
        InteractionType.CASUAL_CHAT,
        InteractionType.EMOTIONAL_SUPPORT,
        InteractionType.LEARNING,
        InteractionType.CREATIVE_WORK,
      ][i % 4],
      engagementLevel: [
        EngagementLevel.LOW,
        EngagementLevel.MEDIUM,
        EngagementLevel.HIGH,
        EngagementLevel.INTENSE,
      ][i % 4],
      duration: 300 + (i * 10),
      emotionalIntensity: 0.3 + (i * 0.01),
      topicComplexity: 0.4 + (i * 0.01),
      userSatisfaction: 0.5 + (i * 0.01),
    }));
  };

  describe('缓存性能测试', () => {
    it('应该在缓存启用时提高性能', async () => {
      const events = createEventBatch(50);
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      // 启用缓存的引擎
      const cachedEngine = new PersonalityEvolutionEngine({
        performance: {
          batchProcessing: {
            maxBatchSize: 100,
            batchTimeout: 5000,
            parallelBatches: 3,
          },
          caching: { 
            enabled: true,
            maxCacheSize: 1000,
            ttl: 3600,
          },
          computationLimits: { 
            maxEventsPerCalculation: 100,
            timeoutMs: 10000,
            maxRetries: 3,
          },
        },
      });

      // 禁用缓存的引擎
      const nonCachedEngine = new PersonalityEvolutionEngine({
        performance: {
          batchProcessing: {
            maxBatchSize: 100,
            batchTimeout: 5000,
            parallelBatches: 3,
          },
          caching: { 
            enabled: false,
            maxCacheSize: 1000,
            ttl: 3600,
          },
          computationLimits: { 
            maxEventsPerCalculation: 100,
            timeoutMs: 10000,
            maxRetries: 3,
          },
        },
      });

      // 第一次运行 - 预热缓存
      await cachedEngine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      // 测试缓存引擎性能
      const cachedStartTime = Date.now();
      const cachedResult = await cachedEngine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );
      const cachedEndTime = Date.now();

      // 测试非缓存引擎性能
      const nonCachedStartTime = Date.now();
      const nonCachedResult = await nonCachedEngine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );
      const nonCachedEndTime = Date.now();

      const cachedTime = cachedEndTime - cachedStartTime;
      const nonCachedTime = nonCachedEndTime - nonCachedStartTime;

      expect(cachedResult.success).toBe(true);
      expect(nonCachedResult.success).toBe(true);
      
      // 缓存版本应该更快（至少快10%）
      expect(cachedTime).toBeLessThan(nonCachedTime * 0.9);
      
      // 验证缓存统计
      const cachedStats = cachedEngine.getProcessingStats();
      expect(cachedStats.cacheHitRate).toBeGreaterThan(0);
    });

    it('应该在重复计算时展现缓存效果', async () => {
      const events = createEventBatch(30);
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      // 多次运行相同的计算
      const times: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        const result = await engine.processPersonalityEvolution(
          'pet-456',
          'user-123',
          events,
          currentTraits,
          context
        );
        const endTime = Date.now();
        
        times.push(endTime - startTime);
        expect(result.success).toBe(true);
      }

      // 后续运行应该比第一次运行更快
      const firstRunTime = times[0];
      const subsequentAverageTime = times.slice(1).reduce((sum, time) => sum + time, 0) / (times.length - 1);
      
      expect(subsequentAverageTime).toBeLessThan(firstRunTime * 1.2); // 允许20%误差
    });
  });

  describe('批量处理性能测试', () => {
    it('应该在不同事件数量下保持良好性能', async () => {
      const eventCounts = [10, 50, 100, 200, 500];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const performanceResults: { count: number; time: number; rate: number }[] = [];

      for (const count of eventCounts) {
        const events = createEventBatch(count);
        
        const startTime = Date.now();
        const result = await engine.processPersonalityEvolution(
          'pet-456',
          'user-123',
          events,
          currentTraits,
          context
        );
        const endTime = Date.now();

        const processingTime = endTime - startTime;
        const rate = count / processingTime; // 事件/毫秒

        performanceResults.push({
          count,
          time: processingTime,
          rate,
        });

        expect(result.success).toBe(true);
        expect(processingTime).toBeLessThan(10000); // 10秒内完成
        expect(rate).toBeGreaterThan(0.01); // 至少每100毫秒处理1个事件
      }

      // 验证性能没有急剧下降
      for (let i = 1; i < performanceResults.length; i++) {
        const current = performanceResults[i];
        const previous = performanceResults[i - 1];
        
        // 处理率下降不应超过50%
        expect(current.rate).toBeGreaterThan(previous.rate * 0.5);
      }
    });

    it('应该处理极大批量事件而不崩溃', async () => {
      const largeEventBatch = createEventBatch(1000);
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const startTime = Date.now();
      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        largeEventBatch,
        currentTraits,
        context
      );
      const endTime = Date.now();

      const processingTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(30000); // 30秒内完成
      expect(result.eventsProcessed).toBeGreaterThan(0);
      expect(result.eventsProcessed).toBeLessThanOrEqual(1000);
    });
  });

  describe('内存使用优化测试', () => {
    it('应该在处理大量事件时管理内存使用', async () => {
      const iterations = 10;
      const eventsPerIteration = 100;
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const initialMemory = process.memoryUsage().heapUsed;
      const memoryReadings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const events = createEventBatch(eventsPerIteration);
        
        const result = await engine.processPersonalityEvolution(
          'pet-456',
          'user-123',
          events,
          currentTraits,
          context
        );

        expect(result.success).toBe(true);
        
        // 强制垃圾回收（如果可用）
        if (global.gc) {
          global.gc();
        }

        const currentMemory = process.memoryUsage().heapUsed;
        memoryReadings.push(currentMemory);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // 内存增长应该是合理的（小于100MB）
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);

      // 内存使用应该相对稳定
      const maxMemory = Math.max(...memoryReadings);
      const minMemory = Math.min(...memoryReadings);
      const memoryVariance = (maxMemory - minMemory) / minMemory;

      expect(memoryVariance).toBeLessThan(0.5); // 50%的变化范围内
    });
  });

  describe('增量计算效果验证', () => {
    it('应该在增量计算中显示性能提升', async () => {
      const baseEvents = createEventBatch(100);
      const newEvents = createEventBatch(10);
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      // 启用增量计算的引擎
      const incrementalEngine = new PersonalityEvolutionEngine({
        performance: {
          batchProcessing: {
            maxBatchSize: 100,
            batchTimeout: 5000,
            parallelBatches: 3,
          },
          caching: { 
            enabled: true,
            maxCacheSize: 1000,
            ttl: 3600,
          },
          computationLimits: { 
            maxEventsPerCalculation: 100,
            timeoutMs: 10000,
            maxRetries: 3,
          },
        },
      });

      // 禁用增量计算的引擎
      const fullEngine = new PersonalityEvolutionEngine({
        performance: {
          batchProcessing: {
            maxBatchSize: 100,
            batchTimeout: 5000,
            parallelBatches: 3,
          },
          caching: { 
            enabled: false,
            maxCacheSize: 1000,
            ttl: 3600,
          },
          computationLimits: { 
            maxEventsPerCalculation: 100,
            timeoutMs: 10000,
            maxRetries: 3,
          },
        },
      });

      // 建立基础状态
      await incrementalEngine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        baseEvents,
        currentTraits,
        context
      );

      // 测试增量计算性能
      const incrementalStartTime = Date.now();
      const incrementalResult = await incrementalEngine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        newEvents,
        currentTraits,
        context
      );
      const incrementalEndTime = Date.now();

      // 测试完整计算性能
      const fullStartTime = Date.now();
      const fullResult = await fullEngine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        [...baseEvents, ...newEvents],
        currentTraits,
        context
      );
      const fullEndTime = Date.now();

      const incrementalTime = incrementalEndTime - incrementalStartTime;
      const fullTime = fullEndTime - fullStartTime;

      expect(incrementalResult.success).toBe(true);
      expect(fullResult.success).toBe(true);
      
      // 增量计算应该明显更快
      expect(incrementalTime).toBeLessThan(fullTime * 0.5);
    });

    it('应该验证增量计算的准确性', async () => {
      const events = createEventBatch(50);
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      // 分批处理
      const batch1 = events.slice(0, 25);
      const batch2 = events.slice(25, 50);

      // 增量处理
      const result1 = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        batch1,
        currentTraits,
        context
      );

      const result2 = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        batch2,
        result1.newPersonalityTraits,
        context
      );

      // 一次性处理
      const fullResult = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(fullResult.success).toBe(true);

      // 验证结果的相似性（允许小的差异）
      Object.values(PersonalityTrait).forEach(trait => {
        const incrementalValue = result2.newPersonalityTraits[trait];
        const fullValue = fullResult.newPersonalityTraits[trait];
        const difference = Math.abs(incrementalValue - fullValue);
        
        expect(difference).toBeLessThan(0.2); // 20%的差异容忍度
      });
    });
  });

  describe('并发处理性能测试', () => {
    it('应该处理并发请求而不出现竞态条件', async () => {
      const concurrentRequests = 5;
      const eventsPerRequest = 20;
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const promises = Array.from({ length: concurrentRequests }, (_, i) => {
        const events = createEventBatch(eventsPerRequest);
        return engine.processPersonalityEvolution(
          `pet-${i}`,
          'user-123',
          events,
          currentTraits,
          context
        );
      });

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;

      // 所有请求都应该成功
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 并发处理应该比串行处理更快
      expect(averageTime).toBeLessThan(1000); // 平均每个请求1秒内完成
    });
  });

  describe('性能监控和统计', () => {
    it('应该提供准确的性能统计信息', async () => {
      const events = createEventBatch(50);
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const initialStats = engine.getProcessingStats();
      expect(initialStats.totalProcessed).toBe(0);

      // 处理多个请求
      for (let i = 0; i < 5; i++) {
        const result = await engine.processPersonalityEvolution(
          'pet-456',
          'user-123',
          events,
          currentTraits,
          context
        );
        expect(result.success).toBe(true);
      }

      const finalStats = engine.getProcessingStats();
      
      expect(finalStats.totalProcessed).toBe(5);
      expect(finalStats.averageProcessingTime).toBeGreaterThan(0);
      expect(finalStats.errorCount).toBe(0);
    });

    it('应该跟踪缓存命中率', async () => {
      const events = createEventBatch(30);
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      // 启用缓存
      const cachedEngine = new PersonalityEvolutionEngine({
        performance: {
          batchProcessing: {
            maxBatchSize: 100,
            batchTimeout: 5000,
            parallelBatches: 3,
          },
          caching: { 
            enabled: true,
            maxCacheSize: 1000,
            ttl: 3600,
          },
          computationLimits: { 
            maxEventsPerCalculation: 100,
            timeoutMs: 10000,
            maxRetries: 3,
          },
        },
      });

      // 多次运行相同的计算
      for (let i = 0; i < 3; i++) {
        const result = await cachedEngine.processPersonalityEvolution(
          'pet-456',
          'user-123',
          events,
          currentTraits,
          context
        );
        expect(result.success).toBe(true);
      }

      const stats = cachedEngine.getProcessingStats();
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });
  });

  describe('资源使用优化', () => {
    it('应该在资源限制下正常工作', async () => {
      const events = createEventBatch(200);
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      // 配置资源限制
      const constrainedEngine = new PersonalityEvolutionEngine({
        performance: {
          batchProcessing: {
            maxBatchSize: 100,
            batchTimeout: 5000,
            parallelBatches: 3,
          },
          caching: {
            enabled: true,
            maxCacheSize: 1000,
            ttl: 3600,
          },
          computationLimits: {
            maxEventsPerCalculation: 50,
            timeoutMs: 5000,
            maxRetries: 3,
          },
        },
      });

      const result = await constrainedEngine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(50); // 限制生效
      expect(result.processingTime).toBeLessThan(5000); // 超时限制
    });
  });
});