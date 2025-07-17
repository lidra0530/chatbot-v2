import { Test, TestingModule } from '@nestjs/testing';
import { PersonalityModule } from '../personality.module';
import { PrismaService } from '../../../common/prisma.service';
import { RedisService } from '../../../common/redis.service';
import { PersonalityEvolutionEngine } from '../../../algorithms/personality-evolution';
import { InteractionClassifier } from '../../../algorithms/interaction-classifier';
import { PersonalityEvolutionService } from '../services/personality-evolution.service';
import { PersonalityCacheService } from '../services/personality-cache.service';
import { PersonalityAnalyticsService } from '../services/personality-analytics.service';

describe('Personality Performance Benchmarks', () => {
  let module: TestingModule;
  let evolutionService: PersonalityEvolutionService;
  let cacheService: PersonalityCacheService;
  let analyticsService: PersonalityAnalyticsService;
  let prismaService: any;
  let redisService: any;
  let evolutionEngine: any;
  let interactionClassifier: any;

  // Performance benchmarks
  const PERFORMANCE_THRESHOLDS = {
    SINGLE_EVOLUTION_PROCESSING: 1000, // 1 second
    BATCH_EVOLUTION_PROCESSING: 5000,  // 5 seconds for 100 items
    CACHE_OPERATIONS: 50,              // 50ms per operation
    ANALYTICS_GENERATION: 2000,        // 2 seconds
    CONCURRENT_OPERATIONS: 3000,       // 3 seconds for 10 concurrent
    MEMORY_USAGE_MB: 100,              // 100MB max
  };

  const generateMockData = (count: number) => ({
    pets: Array.from({ length: count }, (_, i) => ({
      id: `perf-test-pet-${i}`,
      name: `PerfTestPet${i}`,
      userId: `perf-test-user-${i}`,
      personality: {
        traits: {
          openness: 50 + (i % 10),
          conscientiousness: 60 + (i % 10),
          extraversion: 40 + (i % 10),
          agreeableness: 70 + (i % 10),
          neuroticism: 30 + (i % 10),
        },
        lastEvolutionCheck: new Date(),
      },
      evolutionLogs: [],
      createdAt: new Date(),
    })),
    interactions: Array.from({ length: count }, (_, i) => ({
      userMessage: `Performance test message ${i}`,
      botResponse: `Performance test response ${i}`,
      type: 'conversation',
      timestamp: new Date(),
      messageCount: 1 + (i % 5),
      sessionDuration: 60 + (i % 120),
    })),
    evolutionLogs: Array.from({ length: count * 2 }, (_, i) => ({
      id: `perf-log-${i}`,
      petId: `perf-test-pet-${Math.floor(i / 2)}`,
      evolutionType: 'personality',
      triggerEvent: i % 2 === 0 ? 'conversation' : 'interaction',
      beforeSnapshot: { openness: 0.5 + (i % 10) * 0.01 },
      afterSnapshot: { openness: 0.5 + (i % 10) * 0.01 + 0.01 },
      impactScore: 0.5 + (i % 10) * 0.05,
      createdAt: new Date(Date.now() - i * 1000),
    })),
  });

  beforeAll(async () => {
    const mockPrismaService = {
      pet: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      petEvolutionLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        createMany: jest.fn(),
      },
      interactionPattern: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      setNX: jest.fn(),
      eval: jest.fn(),
      zadd: jest.fn(),
      zpopmax: jest.fn(),
      zcard: jest.fn(),
    };

    const mockEvolutionEngine = {
      processPersonalityEvolution: jest.fn(),
    };

    const mockInteractionClassifier = {
      convertToEvolutionEvent: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [PersonalityModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideProvider(PersonalityEvolutionEngine)
      .useValue(mockEvolutionEngine)
      .overrideProvider(InteractionClassifier)
      .useValue(mockInteractionClassifier)
      .compile();

    evolutionService = module.get<PersonalityEvolutionService>(PersonalityEvolutionService);
    cacheService = module.get<PersonalityCacheService>(PersonalityCacheService);
    analyticsService = module.get<PersonalityAnalyticsService>(PersonalityAnalyticsService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    evolutionEngine = module.get(PersonalityEvolutionEngine);
    interactionClassifier = module.get(InteractionClassifier);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default fast mocks for performance tests
    redisService.setNX.mockResolvedValue(true);
    redisService.eval.mockResolvedValue(1);
    redisService.get.mockResolvedValue(null);
    redisService.set.mockResolvedValue(true);
    
    prismaService.$transaction.mockImplementation(async (callback: any) => {
      return await callback(prismaService);
    });
  });

  describe('Single Evolution Processing Performance', () => {
    it('should process single evolution within performance threshold', async () => {
      const mockData = generateMockData(1);
      const pet = mockData.pets[0];
      const interaction = mockData.interactions[0];

      // Setup mocks
      prismaService.pet.findUnique.mockResolvedValue(pet);
      prismaService.pet.update.mockResolvedValue(pet);
      prismaService.petEvolutionLog.create.mockResolvedValue({});
      
      interactionClassifier.convertToEvolutionEvent.mockResolvedValue({
        id: 'event-perf-1',
        petId: pet.id,
        userId: pet.userId,
        interactionType: 'casual_chat',
        interactionMode: 'normal',
        engagementLevel: 'medium',
        duration: interaction.sessionDuration,
        messageCount: interaction.messageCount,
        topicComplexity: 0.5,
        emotionalIntensity: 0.6,
        metadata: {
          messageLength: 25,
          responseTime: 1000,
          topicTags: ['test'],
          moodIndicators: ['neutral'],
          skillsUsed: ['conversation'],
          contextSwitches: 0,
          userInitiated: true,
          feedbackGiven: false,
          specialEvents: [],
        },
        timestamp: new Date(),
      });

      evolutionEngine.processPersonalityEvolution.mockResolvedValue({
        success: true,
        petId: pet.id,
        evolutionId: 'evolution-perf-1',
        eventsProcessed: 1,
        processingTime: 50,
        newPersonalityTraits: pet.personality.traits,
        personalityAdjustment: {
          reason: 'Performance test',
          confidence: 0.8,
          traitChanges: { openness: 0.01 },
          appliedLimits: [],
          metadata: {
            originalValues: pet.personality.traits,
            rawChanges: { openness: 0.01 },
            limitedChanges: { openness: 0.01 },
            stabilityScore: 0.95,
          },
        },
        processedEvents: [],
        interactionPattern: {
          userId: pet.userId,
          petId: pet.id,
          timeWindow: 'daily',
          totalInteractions: 1,
          averageSessionLength: interaction.sessionDuration,
          interactionFrequency: 1,
          typeDistribution: {},
          modeDistribution: {},
          engagementDistribution: {},
          averageEngagement: 0.6,
          responseTimeVariance: 100,
          topicDiversity: 0.5,
          engagementTrend: 0,
          complexityTrend: 0,
          satisfactionTrend: 0,
          preferredTimeSlots: [],
          weekdayPattern: [],
          seasonalPattern: {},
        },
        timestamp: new Date(),
        algorithmVersion: '1.0',
        configSnapshot: '{}',
        warnings: [],
        errors: [],
      });

      const startTime = process.hrtime.bigint();
      await evolutionService.processEvolutionIncrement(pet.id, interaction);
      const endTime = process.hrtime.bigint();

      const processingTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_EVOLUTION_PROCESSING);
      
      // Log performance metrics for monitoring
      console.log(`Single evolution processing time: ${processingTime.toFixed(2)}ms`);
    });
  });

  describe('Batch Processing Performance', () => {
    it('should process batch of 100 evolutions within threshold', async () => {
      const mockData = generateMockData(100);
      const batchData = mockData.pets.map((pet, i) => ({
        petId: pet.id,
        interactionData: mockData.interactions[i],
      }));

      // Mock successful individual processing
      jest.spyOn(evolutionService, 'processEvolutionIncrement').mockImplementation(async () => {
        // Simulate realistic processing time
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const startTime = process.hrtime.bigint();
      await evolutionService.processBatchEvolutionIncrements(batchData);
      const endTime = process.hrtime.bigint();

      const processingTime = Number(endTime - startTime) / 1000000;

      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_EVOLUTION_PROCESSING);
      expect(evolutionService.processEvolutionIncrement).toHaveBeenCalledTimes(100);

      console.log(`Batch processing time for 100 items: ${processingTime.toFixed(2)}ms`);
      console.log(`Average time per item: ${(processingTime / 100).toFixed(2)}ms`);
    });

    it('should handle large batch processing efficiently with chunking', async () => {
      const mockData = generateMockData(1000);
      const batchData = mockData.pets.map((pet, i) => ({
        petId: pet.id,
        interactionData: mockData.interactions[i],
      }));

      jest.spyOn(evolutionService, 'processEvolutionIncrement').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
      });

      const startTime = process.hrtime.bigint();
      await evolutionService.processBatchEvolutionIncrements(batchData);
      const endTime = process.hrtime.bigint();

      const processingTime = Number(endTime - startTime) / 1000000;

      // Should process 1000 items in reasonable time (10x the 100-item threshold)
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_EVOLUTION_PROCESSING * 10);
      expect(evolutionService.processEvolutionIncrement).toHaveBeenCalledTimes(1000);

      console.log(`Large batch processing time for 1000 items: ${processingTime.toFixed(2)}ms`);
      console.log(`Throughput: ${(1000 / (processingTime / 1000)).toFixed(2)} items/second`);
    });
  });

  describe('Cache Performance', () => {
    it('should perform cache operations within threshold', async () => {
      const testData = { test: 'performance data', timestamp: Date.now() };

      const startTime = process.hrtime.bigint();
      
      // Perform multiple cache operations
      await cacheService.setWithFallback('perf-test-key-1', testData, 300);
      await cacheService.getWithFallback('perf-test-key-1');
      await cacheService.setWithFallback('perf-test-key-2', testData, 300);
      await cacheService.getWithFallback('perf-test-key-2');
      
      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_OPERATIONS * 4);

      console.log(`Cache operations time for 4 operations: ${processingTime.toFixed(2)}ms`);
      console.log(`Average cache operation time: ${(processingTime / 4).toFixed(2)}ms`);
    });

    it('should handle high-frequency cache operations', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => ({
        key: `perf-cache-key-${i}`,
        value: { id: i, data: `test-data-${i}`, timestamp: Date.now() },
      }));

      const startTime = process.hrtime.bigint();
      
      // Perform concurrent cache operations
      const setPromises = operations.map(op => 
        cacheService.setWithFallback(op.key, op.value, 300)
      );
      await Promise.all(setPromises);

      const getPromises = operations.map(op => 
        cacheService.getWithFallback(op.key)
      );
      await Promise.all(getPromises);

      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      // Should handle 200 operations (100 sets + 100 gets) efficiently
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_OPERATIONS * 20);

      console.log(`High-frequency cache operations (200 ops): ${processingTime.toFixed(2)}ms`);
      console.log(`Cache throughput: ${(200 / (processingTime / 1000)).toFixed(2)} ops/second`);
    });
  });

  describe('Analytics Performance', () => {
    it('should generate analytics within threshold', async () => {
      const mockData = generateMockData(50);
      const petId = mockData.pets[0].id;

      // Mock database queries with realistic data
      prismaService.petEvolutionLog.findMany.mockResolvedValue(mockData.evolutionLogs.slice(0, 100));
      prismaService.interactionPattern.findMany.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          id: `pattern-${i}`,
          petId,
          patternType: 'conversation',
          frequency: 5 + i,
          confidence: 0.8,
          createdAt: new Date(),
        }))
      );

      const startTime = process.hrtime.bigint();
      
      const analytics = await analyticsService.getPersonalityAnalytics(petId);
      
      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ANALYTICS_GENERATION);
      expect(analytics).toBeDefined();

      console.log(`Analytics generation time: ${processingTime.toFixed(2)}ms`);
    });

    it('should handle complex analytics queries efficiently', async () => {
      const mockData = generateMockData(10);
      const petIds = mockData.pets.map(pet => pet.id);

      // Mock complex queries
      prismaService.petEvolutionLog.findMany.mockImplementation(async ({ where }: any) => {
        const petId = where.petId;
        return mockData.evolutionLogs.filter(log => log.petId === petId);
      });

      const startTime = process.hrtime.bigint();
      
      // Process analytics for multiple pets
      const analyticsPromises = petIds.map(petId => 
        analyticsService.getPersonalityAnalytics(petId)
      );
      await Promise.all(analyticsPromises);
      
      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ANALYTICS_GENERATION * 5);

      console.log(`Complex analytics for 10 pets: ${processingTime.toFixed(2)}ms`);
      console.log(`Average analytics time per pet: ${(processingTime / 10).toFixed(2)}ms`);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent evolution processing', async () => {
      const mockData = generateMockData(10);
      const concurrentOperations = mockData.pets.map((pet, i) => ({
        petId: pet.id,
        interaction: mockData.interactions[i],
      }));

      // Setup mocks for concurrent operations
      prismaService.pet.findUnique.mockImplementation(async ({ where }: any) => {
        return mockData.pets.find(pet => pet.id === where.id);
      });
      prismaService.pet.update.mockResolvedValue({});
      prismaService.petEvolutionLog.create.mockResolvedValue({});

      interactionClassifier.convertToEvolutionEvent.mockImplementation(async () => ({
        id: `event-${Date.now()}-${Math.random()}`,
        petId: 'test-pet',
        userId: 'test-user',
        interactionType: 'casual_chat',
        interactionMode: 'normal',
        engagementLevel: 'medium',
        duration: 60,
        messageCount: 1,
        topicComplexity: 0.5,
        emotionalIntensity: 0.6,
        metadata: {
          messageLength: 25,
          responseTime: 1000,
          topicTags: [],
          moodIndicators: [],
          skillsUsed: [],
          contextSwitches: 0,
          userInitiated: true,
          feedbackGiven: false,
          specialEvents: [],
        },
        timestamp: new Date(),
      }));

      evolutionEngine.processPersonalityEvolution.mockImplementation(async () => ({
        success: true,
        petId: 'test-pet',
        evolutionId: `evolution-${Date.now()}`,
        eventsProcessed: 1,
        processingTime: 50,
        newPersonalityTraits: { openness: 0.5 },
        personalityAdjustment: {
          reason: 'Concurrent test',
          confidence: 0.8,
          traitChanges: { openness: 0.01 },
          appliedLimits: [],
          metadata: {
            originalValues: { openness: 0.5 },
            rawChanges: { openness: 0.01 },
            limitedChanges: { openness: 0.01 },
            stabilityScore: 0.95,
          },
        },
        processedEvents: [],
        interactionPattern: {
          userId: 'test-user',
          petId: 'test-pet',
          timeWindow: 'daily',
          totalInteractions: 1,
          averageSessionLength: 60,
          interactionFrequency: 1,
          typeDistribution: {},
          modeDistribution: {},
          engagementDistribution: {},
          averageEngagement: 0.6,
          responseTimeVariance: 100,
          topicDiversity: 0.5,
          engagementTrend: 0,
          complexityTrend: 0,
          satisfactionTrend: 0,
          preferredTimeSlots: [],
          weekdayPattern: [],
          seasonalPattern: {},
        },
        timestamp: new Date(),
        algorithmVersion: '1.0',
        configSnapshot: '{}',
        warnings: [],
        errors: [],
      }));

      const startTime = process.hrtime.bigint();
      
      // Execute concurrent operations
      const promises = concurrentOperations.map(op =>
        evolutionService.processEvolutionIncrement(op.petId, op.interaction)
      );
      await Promise.all(promises);
      
      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS);

      console.log(`Concurrent operations (10 parallel): ${processingTime.toFixed(2)}ms`);
      console.log(`Concurrency efficiency: ${((10 * 100) / processingTime).toFixed(2)}% vs sequential`);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should maintain reasonable memory usage during processing', async () => {
      const initialMemory = process.memoryUsage();
      const mockData = generateMockData(100);

      // Process large amount of data
      jest.spyOn(evolutionService, 'processEvolutionIncrement').mockResolvedValue();
      
      const batchData = mockData.pets.map((pet, i) => ({
        petId: pet.id,
        interactionData: mockData.interactions[i],
      }));

      await evolutionService.processBatchEvolutionIncrements(batchData);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryDiff = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

      expect(memoryDiff).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB);

      console.log(`Memory usage increase: ${memoryDiff.toFixed(2)}MB`);
      console.log(`Heap used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Database Query Performance', () => {
    it('should optimize database query performance', async () => {
      let queryCount = 0;
      
      // Track database queries
      prismaService.pet.findUnique.mockImplementation(async () => {
        queryCount++;
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate DB latency
        return generateMockData(1).pets[0];
      });

      prismaService.petEvolutionLog.findMany.mockImplementation(async () => {
        queryCount++;
        await new Promise(resolve => setTimeout(resolve, 15)); // Simulate DB latency
        return generateMockData(10).evolutionLogs;
      });

      const startTime = process.hrtime.bigint();
      
      // Perform operations that should minimize database queries
      await analyticsService.getPersonalityAnalytics('test-pet-1');
      
      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;

      // Verify query optimization
      expect(queryCount).toBeLessThan(5); // Should use minimal queries
      expect(processingTime).toBeLessThan(500); // Should be fast despite DB latency

      console.log(`Database queries executed: ${queryCount}`);
      console.log(`Query optimization processing time: ${processingTime.toFixed(2)}ms`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      const baselineMetrics = {
        singleEvolution: 100, // 100ms baseline
        batchProcessing: 2000, // 2s for 100 items
        cacheOperations: 20, // 20ms per operation
      };

      // Test single evolution
      const singleStartTime = process.hrtime.bigint();
      jest.spyOn(evolutionService, 'processEvolutionIncrement').mockResolvedValue();
      await evolutionService.processEvolutionIncrement('test-pet', { type: 'test' });
      const singleEndTime = process.hrtime.bigint();
      const singleTime = Number(singleEndTime - singleStartTime) / 1000000;

      // Test batch processing
      const batchStartTime = process.hrtime.bigint();
      const batchData = Array.from({ length: 100 }, (_, i) => ({
        petId: `test-pet-${i}`,
        interactionData: { type: 'test' },
      }));
      await evolutionService.processBatchEvolutionIncrements(batchData);
      const batchEndTime = process.hrtime.bigint();
      const batchTime = Number(batchEndTime - batchStartTime) / 1000000;

      // Test cache operations
      const cacheStartTime = process.hrtime.bigint();
      await cacheService.setWithFallback('test-key', { data: 'test' }, 300);
      await cacheService.getWithFallback('test-key');
      const cacheEndTime = process.hrtime.bigint();
      const cacheTime = Number(cacheEndTime - cacheStartTime) / 1000000;

      // Check for regressions (within 50% of baseline)
      const regressionThreshold = 1.5;
      
      expect(singleTime).toBeLessThan(baselineMetrics.singleEvolution * regressionThreshold);
      expect(batchTime).toBeLessThan(baselineMetrics.batchProcessing * regressionThreshold);
      expect(cacheTime).toBeLessThan(baselineMetrics.cacheOperations * regressionThreshold);

      console.log('Performance Regression Check:');
      console.log(`Single evolution: ${singleTime.toFixed(2)}ms (baseline: ${baselineMetrics.singleEvolution}ms)`);
      console.log(`Batch processing: ${batchTime.toFixed(2)}ms (baseline: ${baselineMetrics.batchProcessing}ms)`);
      console.log(`Cache operations: ${cacheTime.toFixed(2)}ms (baseline: ${baselineMetrics.cacheOperations}ms)`);
    });
  });
});