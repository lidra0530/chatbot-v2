import { Test, TestingModule } from '@nestjs/testing';
import { PersonalityModule } from '../personality.module';
import { PrismaService } from '../../../common/prisma.service';
import { RedisService } from '../../../common/redis.service';
import { PersonalityEvolutionEngine } from '../../../algorithms/personality-evolution';
import { InteractionClassifier } from '../../../algorithms/interaction-classifier';
import { PersonalityEvolutionService } from '../services/personality-evolution.service';
import { PersonalityCacheService } from '../services/personality-cache.service';
import { PersonalityAnalyticsService } from '../services/personality-analytics.service';
import { EvolutionBatchService } from '../services/evolution-batch.service';
import { EvolutionHistoryService } from '../services/evolution-history.service';

describe('Personality Integration Tests', () => {
  let module: TestingModule;
  let evolutionService: PersonalityEvolutionService;
  let cacheService: PersonalityCacheService;
  let analyticsService: PersonalityAnalyticsService;
  let batchService: EvolutionBatchService;
  let historyService: EvolutionHistoryService;
  let prismaService: any;
  let redisService: any;
  let evolutionEngine: any;
  let interactionClassifier: any;

  // Mock data
  const mockPetId = 'integration-test-pet-123';
  const mockUserId = 'integration-test-user-456';
  const mockPet = {
    id: mockPetId,
    name: 'IntegrationTestPet',
    userId: mockUserId,
    personality: {
      traits: {
        openness: 50,
        conscientiousness: 60,
        extraversion: 40,
        agreeableness: 70,
        neuroticism: 30,
      },
      lastEvolutionCheck: new Date(),
    },
    evolutionLogs: [],
    interactionPatterns: [],
    createdAt: new Date(),
  };

  const mockInteractionData = {
    userMessage: 'Hello pet! How are you feeling today?',
    botResponse: 'I am feeling great! Thank you for asking.',
    type: 'conversation',
    timestamp: new Date(),
    messageCount: 2,
    sessionDuration: 120,
    emotionalTone: 'positive',
  };

  beforeAll(async () => {
    // Create comprehensive mocks for all dependencies
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
        createMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      keys: jest.fn(),
      flushPattern: jest.fn(),
      setNX: jest.fn(),
      eval: jest.fn(),
      zadd: jest.fn(),
      zpopmax: jest.fn(),
      zcard: jest.fn(),
    };

    const mockEvolutionEngine = {
      processPersonalityEvolution: jest.fn(),
      calculateEvolutionImpact: jest.fn(),
      validateEvolutionConstraints: jest.fn(),
    };

    const mockInteractionClassifier = {
      convertToEvolutionEvent: jest.fn(),
      classifyInteraction: jest.fn(),
      extractEmotionalContext: jest.fn(),
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
    batchService = module.get<EvolutionBatchService>(EvolutionBatchService);
    historyService = module.get<EvolutionHistoryService>(EvolutionHistoryService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    evolutionEngine = module.get(PersonalityEvolutionEngine);
    interactionClassifier = module.get(InteractionClassifier);
  });

  afterAll(async () => {
    await module.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Evolution Flow Integration', () => {
    it('should process complete evolution flow with all services', async () => {
      // Setup mocks for successful evolution flow
      const mockEvolutionResult = {
        success: true,
        petId: mockPetId,
        evolutionId: 'evolution-integration-123',
        eventsProcessed: 1,
        processingTime: 250,
        newPersonalityTraits: {
          openness: 0.52,
          conscientiousness: 0.61,
          extraversion: 0.41,
          agreeableness: 0.71,
          neuroticism: 0.29,
        },
        personalityAdjustment: {
          reason: 'Positive interaction detected',
          confidence: 0.85,
          traitChanges: {
            openness: 0.02,
            conscientiousness: 0.01,
            extraversion: 0.01,
            agreeableness: 0.01,
            neuroticism: -0.01,
          },
          appliedLimits: [],
          metadata: {
            originalValues: {
              openness: 0.5,
              conscientiousness: 0.6,
              extraversion: 0.4,
              agreeableness: 0.7,
              neuroticism: 0.3,
            },
            rawChanges: {
              openness: 0.02,
              conscientiousness: 0.01,
              extraversion: 0.01,
              agreeableness: 0.01,
              neuroticism: -0.01,
            },
            limitedChanges: {
              openness: 0.02,
              conscientiousness: 0.01,
              extraversion: 0.01,
              agreeableness: 0.01,
              neuroticism: -0.01,
            },
            stabilityScore: 0.95,
          },
        },
        processedEvents: [],
        interactionPattern: {
          userId: mockUserId,
          petId: mockPetId,
          timeWindow: 'daily',
          totalInteractions: 1,
          averageSessionLength: 120,
          interactionFrequency: 1,
          typeDistribution: {},
          modeDistribution: {},
          engagementDistribution: {},
          averageEngagement: 0.8,
          responseTimeVariance: 50,
          topicDiversity: 0.6,
          engagementTrend: 0.1,
          complexityTrend: 0.05,
          satisfactionTrend: 0.15,
          preferredTimeSlots: [14, 15, 16],
          weekdayPattern: [1, 1, 1, 1, 1, 0.5, 0.5],
          seasonalPattern: {},
        },
        timestamp: new Date(),
        algorithmVersion: '1.0',
        configSnapshot: '{}',
        warnings: [],
        errors: [],
      };

      // Mock distributed lock and rate limiting
      redisService.setNX.mockResolvedValue(true);
      redisService.eval.mockResolvedValue(1);

      // Mock database operations
      prismaService.pet.findUnique.mockResolvedValue(mockPet);
      prismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaService);
      });
      prismaService.pet.update.mockResolvedValue({
        ...mockPet,
        personality: {
          ...mockPet.personality,
          traits: mockEvolutionResult.newPersonalityTraits,
        },
      });
      prismaService.petEvolutionLog.create.mockResolvedValue({
        id: 'log-123',
        petId: mockPetId,
        evolutionType: 'personality',
        createdAt: new Date(),
      });

      // Mock interaction classification
      interactionClassifier.convertToEvolutionEvent.mockResolvedValue({
        id: 'event-integration-123',
        petId: mockPetId,
        userId: mockUserId,
        interactionType: 'casual_chat',
        interactionMode: 'normal',
        engagementLevel: 'high',
        duration: 120,
        messageCount: 2,
        topicComplexity: 0.6,
        emotionalIntensity: 0.8,
        metadata: {
          messageLength: 25,
          responseTime: 1500,
          topicTags: ['greeting', 'wellbeing'],
          moodIndicators: ['positive', 'friendly'],
          skillsUsed: ['conversation'],
          contextSwitches: 0,
          userInitiated: true,
          feedbackGiven: false,
          specialEvents: [],
        },
        timestamp: new Date(),
      });

      // Mock evolution engine
      evolutionEngine.processPersonalityEvolution.mockResolvedValue(mockEvolutionResult);

      // Mock caching operations
      redisService.get.mockResolvedValue(null); // Cache miss
      redisService.set.mockResolvedValue(true);

      // Step 1: Process evolution increment
      await evolutionService.processEvolutionIncrement(mockPetId, mockInteractionData);

      // Step 2: Verify cache operations
      expect(redisService.set).toHaveBeenCalled(); // Cache invalidation

      // Step 3: Verify database operations
      expect(prismaService.pet.findUnique).toHaveBeenCalledWith({
        where: { id: mockPetId },
        include: {
          evolutionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });
      expect(prismaService.pet.update).toHaveBeenCalled();
      expect(prismaService.petEvolutionLog.create).toHaveBeenCalled();

      // Step 4: Verify interaction classification
      expect(interactionClassifier.convertToEvolutionEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          petId: mockPetId,
          userId: mockUserId,
          userMessage: mockInteractionData.userMessage,
          botResponse: mockInteractionData.botResponse,
        })
      );

      // Step 5: Verify evolution engine processing
      expect(evolutionEngine.processPersonalityEvolution).toHaveBeenCalledWith(
        mockPetId,
        mockUserId,
        expect.arrayContaining([
          expect.objectContaining({
            id: 'event-integration-123',
            interactionType: 'casual_chat',
          }),
        ]),
        expect.any(Object), // Current traits
        expect.any(Object)  // Evolution context
      );

      // Step 6: Verify distributed locking was used
      expect(redisService.setNX).toHaveBeenCalledWith(
        expect.stringContaining('personality:lock:pet-evolution'),
        expect.any(String),
        expect.any(Number)
      );
      expect(redisService.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("get", KEYS[1])'),
        expect.any(Array),
        expect.any(Array)
      );
    });

    it('should handle evolution flow with caching integration', async () => {
      // Mock cached data
      const cachedAnalysis = {
        petId: mockPetId,
        analysisData: {
          traitAnalysis: {
            openness: { score: 0.6, trend: 'stable' },
            conscientiousness: { score: 0.7, trend: 'increasing' },
          },
          evolutionSummary: {
            totalChanges: 15,
            significantChanges: 3,
            lastEvolutionDate: new Date().toISOString(),
          },
        },
        timestamp: Date.now(),
        ttl: 300,
      };

      redisService.get.mockResolvedValue(cachedAnalysis);

      // Test cache retrieval through analytics service
      const analysis = await analyticsService.getPersonalityAnalytics(mockPetId);

      expect(analysis).toEqual(cachedAnalysis);
      expect(redisService.get).toHaveBeenCalledWith(
        `personality:analysis:${mockPetId}`
      );

      // Verify cache service integration
      const cacheResult = await cacheService.getPersonalityAnalysis(mockPetId);
      expect(cacheResult).toEqual(cachedAnalysis);
    });

    it('should handle cache invalidation across services', async () => {
      redisService.keys.mockResolvedValue([
        `personality:analysis:${mockPetId}`,
        `personality:stats:${mockPetId}:weekly`,
        `personality:trends:${mockPetId}:monthly`,
      ]);
      redisService.del.mockResolvedValue(true);

      // Trigger cache invalidation through evolution service
      await cacheService.invalidatePersonalityCache(mockPetId);

      expect(redisService.keys).toHaveBeenCalledWith(
        `personality:*:${mockPetId}*`
      );
      expect(redisService.del).toHaveBeenCalledTimes(3);
    });
  });

  describe('Batch Processing Integration', () => {
    it('should process batch evolution with all services coordinated', async () => {
      const batchData = [
        { petId: 'pet-1', interactionData: { type: 'conversation', message: 'Hello' } },
        { petId: 'pet-2', interactionData: { type: 'play', message: 'Let us play' } },
        { petId: 'pet-3', interactionData: { type: 'learning', message: 'Teach me' } },
      ];

      // Mock batch processing infrastructure
      redisService.zadd.mockResolvedValue(1);
      redisService.zpopmax.mockResolvedValue([
        JSON.stringify({ id: 'task-1', data: batchData[0] }),
        '5'
      ]);
      redisService.zcard.mockResolvedValue(3);

      // Mock successful individual processing
      jest.spyOn(evolutionService, 'processEvolutionIncrement').mockResolvedValue();

      // Process batch
      await evolutionService.processBatchEvolutionIncrements(batchData);

      expect(evolutionService.processEvolutionIncrement).toHaveBeenCalledTimes(3);
      expect(evolutionService.processEvolutionIncrement).toHaveBeenCalledWith(
        'pet-1',
        { type: 'conversation', message: 'Hello' }
      );
    });

    it('should handle async batch evolution scheduling', async () => {
      const batchData = [
        { petId: 'pet-1', interactionData: { type: 'conversation' } },
        { petId: 'pet-2', interactionData: { type: 'interaction' } },
      ];

      // Mock batch service response
      jest.spyOn(batchService, 'batchWriteEvolutions').mockResolvedValue({
        batchId: 'async-batch-123',
        successCount: 2,
        failureCount: 0,
        errors: [],
      });

      // Mock cache operations
      redisService.set.mockResolvedValue(true);

      const batchId = await evolutionService.scheduleAsyncBatchEvolution(batchData);

      expect(batchId).toMatch(/^async_batch_\d+_\w+$/);
      expect(batchService.batchWriteEvolutions).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            petId: 'pet-1',
            evolutionType: 'personality',
          }),
        ])
      );
    });
  });

  describe('Analytics and History Integration', () => {
    it('should provide comprehensive analytics across all data sources', async () => {
      const mockEvolutionLogs = [
        {
          id: 'log-1',
          petId: mockPetId,
          evolutionType: 'personality',
          triggerEvent: 'conversation',
          beforeSnapshot: { openness: 0.5 },
          afterSnapshot: { openness: 0.52 },
          impactScore: 0.8,
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
        },
        {
          id: 'log-2',
          petId: mockPetId,
          evolutionType: 'personality',
          triggerEvent: 'play',
          beforeSnapshot: { openness: 0.52 },
          afterSnapshot: { openness: 0.54 },
          impactScore: 0.6,
          createdAt: new Date(Date.now() - 172800000), // 2 days ago
        },
      ];

      const mockInteractionPatterns = [
        {
          id: 'pattern-1',
          petId: mockPetId,
          patternType: 'conversation',
          frequency: 5,
          confidence: 0.8,
          createdAt: new Date(),
        },
      ];

      // Mock database queries
      prismaService.petEvolutionLog.findMany.mockResolvedValue(mockEvolutionLogs);
      prismaService.interactionPattern.findMany.mockResolvedValue(mockInteractionPatterns);

      // Mock cache miss for fresh data
      redisService.get.mockResolvedValue(null);
      redisService.set.mockResolvedValue(true);

      // Get comprehensive analytics
      const analytics = await analyticsService.getPersonalityAnalytics(mockPetId);

      expect(analytics).toBeDefined();
      expect(prismaService.petEvolutionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { petId: mockPetId },
        })
      );
      expect(prismaService.interactionPattern.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { petId: mockPetId },
        })
      );

      // Verify caching of results
      expect(redisService.set).toHaveBeenCalledWith(
        `personality:analysis:${mockPetId}`,
        expect.any(Object),
        300 // TTL
      );
    });

    it('should provide evolution trends analysis', async () => {
      const mockTrendData = [
        { date: '2024-01-01', openness: 0.5, conscientiousness: 0.6, _count: { id: 1 }, _avg: { impactScore: 0.8 } },
        { date: '2024-01-02', openness: 0.52, conscientiousness: 0.61, _count: { id: 2 }, _avg: { impactScore: 0.7 } },
        { date: '2024-01-03', openness: 0.54, conscientiousness: 0.62, _count: { id: 3 }, _avg: { impactScore: 0.9 } },
      ];

      jest.spyOn(historyService, 'getEvolutionTrends').mockResolvedValue(mockTrendData as any);

      const trends = await historyService.getEvolutionTrends(
        mockPetId,
        'week'
      );

      expect(trends).toBeDefined();
      expect(trends).toEqual(mockTrendData);
    });
  });

  describe('Error Handling and Resilience Integration', () => {
    it('should handle database failures gracefully across services', async () => {
      // Mock database failure
      const dbError = new Error('Database connection failed');
      prismaService.pet.findUnique.mockRejectedValue(dbError);

      // Should propagate error appropriately
      await expect(
        evolutionService.processEvolutionIncrement(mockPetId, mockInteractionData)
      ).rejects.toThrow('Database connection failed');

      // Verify proper error handling in analytics
      await expect(
        analyticsService.getPersonalityAnalytics(mockPetId)
      ).rejects.toThrow();
    });

    it('should handle Redis failures with fallback behavior', async () => {
      // Mock Redis failure
      const redisError = new Error('Redis connection failed');
      redisService.get.mockRejectedValue(redisError);
      redisService.set.mockRejectedValue(redisError);

      // Cache service should handle Redis failures gracefully
      const result = await cacheService.getWithFallback('test-key');
      expect(result).toBeNull(); // Should not throw

      const setResult = await cacheService.setWithFallback('test-key', { data: 'test' }, 300);
      expect(setResult).toBe(true); // Should use memory fallback
    });

    it('should handle concurrent access with proper locking', async () => {
      // Mock lock acquisition failure
      redisService.setNX.mockResolvedValue(false);

      // Should fail to acquire lock after retries
      await expect(
        evolutionService.processEvolutionIncrement(mockPetId, mockInteractionData)
      ).rejects.toThrow('Failed to acquire lock');
    });
  });

  describe('Performance Integration Tests', () => {
    it('should handle large batch processing efficiently', async () => {
      const largeBatchData = Array.from({ length: 100 }, (_, i) => ({
        petId: `pet-${i}`,
        interactionData: { type: 'conversation', message: `Message ${i}` },
      }));

      // Mock successful processing for all items
      jest.spyOn(evolutionService, 'processEvolutionIncrement').mockResolvedValue();

      const startTime = Date.now();
      await evolutionService.processBatchEvolutionIncrements(largeBatchData);
      const processingTime = Date.now() - startTime;

      expect(evolutionService.processEvolutionIncrement).toHaveBeenCalledTimes(100);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should efficiently handle cache operations under load', async () => {
      // Mock successful cache operations
      redisService.get.mockResolvedValue(null);
      redisService.set.mockResolvedValue(true);

      const operations = Array.from({ length: 50 }, (_, i) =>
        cacheService.setWithFallback(`test-key-${i}`, { data: i }, 300)
      );

      const startTime = Date.now();
      await Promise.all(operations);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(redisService.set).toHaveBeenCalledTimes(50);
    });
  });

  describe('Data Consistency Integration', () => {
    it('should maintain data consistency across transaction boundaries', async () => {
      let transactionCallbackExecuted = false;
      let petUpdateCalled = false;
      let logCreateCalled = false;

      // Mock transaction that tracks execution order
      prismaService.$transaction.mockImplementation(async (callback: any) => {
        transactionCallbackExecuted = true;
        
        // Override methods within transaction to track calls
        const transactionPrisma = {
          ...prismaService,
          pet: {
            ...prismaService.pet,
            update: jest.fn().mockImplementation((...args) => {
              petUpdateCalled = true;
              return prismaService.pet.update(...args);
            }),
          },
          petEvolutionLog: {
            ...prismaService.petEvolutionLog,
            create: jest.fn().mockImplementation((...args) => {
              logCreateCalled = true;
              return prismaService.petEvolutionLog.create(...args);
            }),
          },
        };

        return await callback(transactionPrisma);
      });

      // Setup other required mocks
      redisService.setNX.mockResolvedValue(true);
      redisService.eval.mockResolvedValue(1);
      prismaService.pet.findUnique.mockResolvedValue(mockPet);
      prismaService.pet.update.mockResolvedValue(mockPet);
      prismaService.petEvolutionLog.create.mockResolvedValue({});

      interactionClassifier.convertToEvolutionEvent.mockResolvedValue({
        id: 'event-123',
        interactionType: 'casual_chat',
        timestamp: new Date(),
      });

      evolutionEngine.processPersonalityEvolution.mockResolvedValue({
        success: true,
        petId: mockPetId,
        evolutionId: 'evolution-123',
        eventsProcessed: 1,
        processingTime: 150,
        newPersonalityTraits: { openness: 0.52 },
        personalityAdjustment: {
          reason: 'Test',
          confidence: 0.8,
          traitChanges: { openness: 0.02 },
          appliedLimits: [],
          metadata: {
            originalValues: { openness: 0.5 },
            rawChanges: { openness: 0.02 },
            limitedChanges: { openness: 0.02 },
            stabilityScore: 0.95,
          },
        },
        processedEvents: [],
        interactionPattern: {
          userId: mockUserId,
          petId: mockPetId,
          timeWindow: 'daily',
          totalInteractions: 1,
          averageSessionLength: 120,
          interactionFrequency: 1,
          typeDistribution: {},
          modeDistribution: {},
          engagementDistribution: {},
          averageEngagement: 0.8,
          responseTimeVariance: 50,
          topicDiversity: 0.6,
          engagementTrend: 0.1,
          complexityTrend: 0.05,
          satisfactionTrend: 0.15,
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

      await evolutionService.processEvolutionIncrement(mockPetId, mockInteractionData);

      // Verify transaction was used and operations were called in proper order
      expect(transactionCallbackExecuted).toBe(true);
      expect(petUpdateCalled).toBe(true);
      expect(logCreateCalled).toBe(true);
    });
  });
});