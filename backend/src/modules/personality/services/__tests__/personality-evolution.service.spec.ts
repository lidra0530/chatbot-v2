import { Test, TestingModule } from '@nestjs/testing';
import { PersonalityEvolutionService } from '../personality-evolution.service';
import { PrismaService } from '../../../../common/prisma.service';
import { PersonalityEvolutionEngine } from '../../../../algorithms/personality-evolution';
import { InteractionClassifier } from '../../../../algorithms/interaction-classifier';
import { PersonalityCacheService } from '../personality-cache.service';
import { EvolutionBatchService } from '../evolution-batch.service';
import { EvolutionHistoryService } from '../evolution-history.service';
import { DistributedLockService, RateLimitService } from '../../utils/concurrency-control';
import { PetNotFoundError } from '../../errors/personality.errors';

describe('PersonalityEvolutionService', () => {
  let service: PersonalityEvolutionService;
  let prismaService: any;
  let evolutionEngine: any;
  let interactionClassifier: any;
  let cacheService: any;
  let batchService: any;
  let historyService: any;
  let lockService: any;
  let rateLimitService: any;

  // Mock data
  const mockPetId = 'test-pet-123';
  const mockPet = {
    id: mockPetId,
    name: 'TestPet',
    userId: 'user-123',
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
    createdAt: new Date(),
  };

  const mockInteractionData = {
    userMessage: 'Hello pet!',
    botResponse: 'Hello user!',
    type: 'conversation',
    timestamp: new Date(),
  };

  const mockEvolutionResult = {
    success: true,
    petId: mockPetId,
    evolutionId: 'evolution-123',
    eventsProcessed: 1,
    processingTime: 150,
    newPersonalityTraits: {
      openness: 0.52,
      conscientiousness: 0.61,
      extraversion: 0.41,
      agreeableness: 0.71,
      neuroticism: 0.29,
    },
    personalityAdjustment: {
      reason: 'Positive interaction',
      confidence: 0.8,
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
      userId: 'user-123',
      petId: mockPetId,
      timeWindow: 'daily',
      totalInteractions: 1,
      averageSessionLength: 300,
      interactionFrequency: 1,
      typeDistribution: {},
      modeDistribution: {},
      engagementDistribution: {},
      averageEngagement: 0.7,
      responseTimeVariance: 100,
      topicDiversity: 0.5,
      engagementTrend: 0.1,
      complexityTrend: 0.05,
      satisfactionTrend: 0.15,
      preferredTimeSlots: [9, 10, 11],
      weekdayPattern: [1, 1, 1, 1, 1, 0.5, 0.5],
      seasonalPattern: {},
    },
    timestamp: new Date(),
    algorithmVersion: '1.0',
    configSnapshot: '{}',
    warnings: [],
    errors: [],
  };

  beforeEach(async () => {
    // Create mock services with proper Jest mocks
    const mockPrismaService = {
      pet: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      petEvolutionLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      interactionPattern: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockEvolutionEngine = {
      processPersonalityEvolution: jest.fn(),
    };

    const mockInteractionClassifier = {
      convertToEvolutionEvent: jest.fn(),
    };

    const mockCacheService = {
      setWithFallback: jest.fn(),
      getWithFallback: jest.fn(),
      invalidatePersonalityCache: jest.fn(),
      getPersonalityAnalysis: jest.fn(),
      getEvolutionStats: jest.fn(),
      getEvolutionTrends: jest.fn(),
      cacheBatchEvolution: jest.fn(),
      getBatchEvolution: jest.fn(),
      invalidateAllBatchCache: jest.fn(),
    };

    const mockBatchService = {
      batchWriteEvolutions: jest.fn(),
      getBatchInfo: jest.fn(),
      batchAnalyzeEvolutions: jest.fn(),
    };

    const mockHistoryService = {
      getEvolutionHistory: jest.fn(),
      analyzeEvolutionTrends: jest.fn(),
    };

    const mockLockService = {
      executeWithLock: jest.fn(),
    };

    const mockRateLimitService = {
      checkRateLimit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalityEvolutionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PersonalityEvolutionEngine,
          useValue: mockEvolutionEngine,
        },
        {
          provide: InteractionClassifier,
          useValue: mockInteractionClassifier,
        },
        {
          provide: PersonalityCacheService,
          useValue: mockCacheService,
        },
        {
          provide: EvolutionBatchService,
          useValue: mockBatchService,
        },
        {
          provide: EvolutionHistoryService,
          useValue: mockHistoryService,
        },
        {
          provide: DistributedLockService,
          useValue: mockLockService,
        },
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
      ],
    }).compile();

    service = module.get<PersonalityEvolutionService>(PersonalityEvolutionService);
    prismaService = module.get(PrismaService);
    evolutionEngine = module.get(PersonalityEvolutionEngine);
    interactionClassifier = module.get(InteractionClassifier);
    cacheService = module.get(PersonalityCacheService);
    batchService = module.get(EvolutionBatchService);
    historyService = module.get(EvolutionHistoryService);
    lockService = module.get(DistributedLockService);
    rateLimitService = module.get(RateLimitService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with all dependencies', () => {
      expect(service).toBeInstanceOf(PersonalityEvolutionService);
    });
  });

  describe('processEvolutionIncrement', () => {
    beforeEach(() => {
      // Setup default mocks for successful flow
      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
      });

      lockService.executeWithLock.mockImplementation(async (resource: string, operation: any) => {
        return await operation();
      });

      prismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaService);
      });

      prismaService.pet.findUnique.mockResolvedValue(mockPet);
      interactionClassifier.convertToEvolutionEvent.mockResolvedValue({
        id: 'event-123',
        interactionType: 'casual_chat',
        intensity: 0.5,
        context: {},
        timestamp: new Date(),
      });

      evolutionEngine.processPersonalityEvolution.mockResolvedValue(mockEvolutionResult);
      prismaService.pet.update.mockResolvedValue(mockPet);
      prismaService.petEvolutionLog.create.mockResolvedValue({});
      cacheService.setWithFallback.mockResolvedValue(undefined);
    });

    it('should successfully process evolution increment', async () => {
      await service.processEvolutionIncrement(mockPetId, mockInteractionData);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        `evolution:${mockPetId}`,
        10,
        60000,
      );
      expect(lockService.executeWithLock).toHaveBeenCalled();
      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.pet.findUnique).toHaveBeenCalledWith({
        where: { id: mockPetId },
        include: {
          evolutionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });
      expect(interactionClassifier.convertToEvolutionEvent).toHaveBeenCalled();
      expect(evolutionEngine.processPersonalityEvolution).toHaveBeenCalled();
      expect(prismaService.pet.update).toHaveBeenCalled();
      expect(prismaService.petEvolutionLog.create).toHaveBeenCalled();
    });

    it('should validate input parameters', async () => {
      await expect(
        service.processEvolutionIncrement('', mockInteractionData),
      ).rejects.toThrow();

      await expect(
        service.processEvolutionIncrement(mockPetId, null),
      ).rejects.toThrow();

      await expect(
        service.processEvolutionIncrement('invalid-pet-id!@#', mockInteractionData),
      ).rejects.toThrow();
    });

    it('should handle rate limiting', async () => {
      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
      });

      await expect(
        service.processEvolutionIncrement(mockPetId, mockInteractionData),
      ).rejects.toThrow('Rate limit exceeded');

      expect(lockService.executeWithLock).not.toHaveBeenCalled();
    });

    it('should handle pet not found', async () => {
      prismaService.pet.findUnique.mockResolvedValue(null);

      await expect(
        service.processEvolutionIncrement(mockPetId, mockInteractionData),
      ).rejects.toThrow(PetNotFoundError);
    });

    it('should handle evolution engine failure', async () => {
      evolutionEngine.processPersonalityEvolution.mockResolvedValue({
        ...mockEvolutionResult,
        success: false,
      });

      await service.processEvolutionIncrement(mockPetId, mockInteractionData);

      expect(prismaService.pet.update).not.toHaveBeenCalled();
      expect(prismaService.petEvolutionLog.create).not.toHaveBeenCalled();
    });

    it('should handle transaction failure', async () => {
      const transactionError = new Error('Transaction failed');
      prismaService.$transaction.mockRejectedValue(transactionError);

      await expect(
        service.processEvolutionIncrement(mockPetId, mockInteractionData),
      ).rejects.toThrow('Transaction failed');
    });

    it('should handle distributed lock failure', async () => {
      lockService.executeWithLock.mockRejectedValue(new Error('Lock acquisition failed'));

      await expect(
        service.processEvolutionIncrement(mockPetId, mockInteractionData),
      ).rejects.toThrow('Lock acquisition failed');
    });
  });

  describe('recordInteractionEvent', () => {
    beforeEach(() => {
      prismaService.pet.findUnique.mockResolvedValue(mockPet);
      prismaService.interactionPattern.create.mockResolvedValue({});
    });

    it('should successfully record interaction event', async () => {
      await service.recordInteractionEvent(mockPetId, mockInteractionData);

      expect(prismaService.pet.findUnique).toHaveBeenCalledWith({
        where: { id: mockPetId },
      });
      expect(prismaService.interactionPattern.create).toHaveBeenCalledWith({
        data: {
          petId: mockPetId,
          patternType: mockInteractionData.type,
          patternName: `${mockInteractionData.type}_pattern`,
          description: 'Recorded interaction pattern',
          patternData: mockInteractionData,
          frequency: 1,
          confidence: 0.5,
        },
      });
    });

    it('should validate input parameters', async () => {
      await expect(
        service.recordInteractionEvent('', mockInteractionData),
      ).rejects.toThrow('Invalid petId provided');

      await expect(
        service.recordInteractionEvent(mockPetId, null),
      ).rejects.toThrow('Invalid interaction data provided');
    });

    it('should handle pet not found', async () => {
      prismaService.pet.findUnique.mockResolvedValue(null);

      await expect(
        service.recordInteractionEvent(mockPetId, mockInteractionData),
      ).rejects.toThrow(`Pet with id ${mockPetId} not found`);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      prismaService.interactionPattern.create.mockRejectedValue(dbError);

      await expect(
        service.recordInteractionEvent(mockPetId, mockInteractionData),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('updateEvolutionSettings', () => {
    const mockSettings = {
      enabled: true,
      evolutionRate: 1.2,
      stabilityThreshold: 0.9,
      maxDailyChange: 6.0,
      maxWeeklyChange: 18.0,
      maxMonthlyChange: 36.0,
      traitLimits: {
        openness: { min: 0, max: 100 },
        conscientiousness: { min: 0, max: 100 },
        extraversion: { min: 0, max: 100 },
        agreeableness: { min: 0, max: 100 },
        neuroticism: { min: 0, max: 100 },
      },
      triggers: {
        conversation: { enabled: true, weight: 1.1 },
        interaction: { enabled: true, weight: 0.9 },
        time_decay: { enabled: true, weight: 0.4 },
      },
    };

    beforeEach(() => {
      prismaService.pet.findUnique.mockResolvedValue(mockPet);
      prismaService.pet.update.mockResolvedValue(mockPet);
      cacheService.setWithFallback.mockResolvedValue(undefined);
    });

    it('should successfully update evolution settings', async () => {
      const result = await service.updateEvolutionSettings(mockPetId, mockSettings);

      expect(prismaService.pet.findUnique).toHaveBeenCalledWith({
        where: { id: mockPetId },
      });
      expect(prismaService.pet.update).toHaveBeenCalledWith({
        where: { id: mockPetId },
        data: {
          personality: {
            ...mockPet.personality,
            evolutionSettings: mockSettings,
          },
        },
      });
      expect(cacheService.setWithFallback).toHaveBeenCalledWith(
        `evolution_settings_${mockPetId}`,
        mockSettings,
        3600,
      );
      expect(result).toEqual(mockSettings);
    });

    it('should validate input parameters', async () => {
      await expect(
        service.updateEvolutionSettings('', mockSettings),
      ).rejects.toThrow('Invalid petId provided');

      await expect(
        service.updateEvolutionSettings(mockPetId, null as any),
      ).rejects.toThrow('Invalid settings provided');
    });

    it('should handle pet not found', async () => {
      prismaService.pet.findUnique.mockResolvedValue(null);

      await expect(
        service.updateEvolutionSettings(mockPetId, mockSettings),
      ).rejects.toThrow(`Pet with id ${mockPetId} not found`);
    });
  });

  describe('getEvolutionSettings', () => {
    beforeEach(() => {
      cacheService.getWithFallback.mockResolvedValue(null);
      prismaService.pet.findUnique.mockResolvedValue(mockPet);
      cacheService.setWithFallback.mockResolvedValue(undefined);
      cacheService.getPersonalityAnalysis.mockResolvedValue({});
      cacheService.getEvolutionStats.mockResolvedValue({});
      cacheService.getEvolutionTrends.mockResolvedValue({});
    });

    it('should retrieve evolution settings from database when cache miss', async () => {
      const settings = await service.getEvolutionSettings(mockPetId);

      expect(cacheService.getWithFallback).toHaveBeenCalledWith(
        `evolution_settings_${mockPetId}`,
      );
      expect(prismaService.pet.findUnique).toHaveBeenCalledWith({
        where: { id: mockPetId },
      });
      expect(settings).toBeDefined();
      expect(settings.enabled).toBe(true);
    });

    it('should retrieve evolution settings from cache when cache hit', async () => {
      const cachedSettings = {
        settings: {
          enabled: true,
          evolutionRate: 1.0,
        },
        timestamp: Date.now(),
        version: '1.0',
        metadata: {
          hasCustomSettings: true,
          lastModified: new Date().toISOString(),
        },
      };
      cacheService.getWithFallback.mockResolvedValue(cachedSettings);

      const settings = await service.getEvolutionSettings(mockPetId);

      expect(cacheService.getWithFallback).toHaveBeenCalledWith(
        `evolution_settings_${mockPetId}`,
      );
      expect(prismaService.pet.findUnique).not.toHaveBeenCalled();
      expect(settings).toEqual(cachedSettings);
    });

    it('should validate input parameters', async () => {
      await expect(
        service.getEvolutionSettings(''),
      ).rejects.toThrow('Invalid petId provided');
    });

    it('should handle pet not found', async () => {
      prismaService.pet.findUnique.mockResolvedValue(null);

      await expect(
        service.getEvolutionSettings(mockPetId),
      ).rejects.toThrow(`Pet with id ${mockPetId} not found`);
    });

    it('should return default settings when pet has no custom settings', async () => {
      const petWithoutSettings = {
        ...mockPet,
        personality: {
          traits: mockPet.personality.traits,
        },
      };
      prismaService.pet.findUnique.mockResolvedValue(petWithoutSettings);

      const settings = await service.getEvolutionSettings(mockPetId);

      expect(settings).toBeDefined();
      expect(settings.enabled).toBe(true);
      expect(settings.evolutionRate).toBe(1.0);
      expect(settings.stabilityThreshold).toBe(0.8);
    });
  });

  describe('processBatchEvolutionIncrements', () => {
    const mockBatchData = [
      { petId: 'pet-1', interactionData: { type: 'conversation' } },
      { petId: 'pet-2', interactionData: { type: 'interaction' } },
      { petId: 'pet-3', interactionData: { type: 'conversation' } },
    ];

    beforeEach(() => {
      // Mock successful individual processing
      jest.spyOn(service, 'processEvolutionIncrement').mockResolvedValue();
      cacheService.invalidateAllBatchCache.mockResolvedValue(undefined);
    });

    it('should successfully process batch evolution increments', async () => {
      await service.processBatchEvolutionIncrements(mockBatchData);

      expect(service.processEvolutionIncrement).toHaveBeenCalledTimes(3);
      expect(service.processEvolutionIncrement).toHaveBeenCalledWith(
        'pet-1',
        { type: 'conversation' },
      );
    });

    it('should filter out invalid batch data', async () => {
      const invalidBatchData = [
        { petId: 'pet-1', interactionData: { type: 'conversation' } },
        { petId: '', interactionData: { type: 'interaction' } }, // Invalid petId
        { petId: 'pet-3', interactionData: null }, // Invalid interaction data
      ];

      await service.processBatchEvolutionIncrements(invalidBatchData);

      expect(service.processEvolutionIncrement).toHaveBeenCalledTimes(1);
      expect(service.processEvolutionIncrement).toHaveBeenCalledWith(
        'pet-1',
        { type: 'conversation' },
      );
    });

    it('should handle individual processing failures gracefully', async () => {
      jest.spyOn(service, 'processEvolutionIncrement')
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce();

      await service.processBatchEvolutionIncrements(mockBatchData);

      expect(service.processEvolutionIncrement).toHaveBeenCalledTimes(3);
    });

    it('should handle empty batch data', async () => {
      await expect(
        service.processBatchEvolutionIncrements([]),
      ).rejects.toThrow('No valid batch data provided');
    });

    it('should process large batches in controlled chunks', async () => {
      const largeBatchData = Array.from({ length: 25 }, (_, i) => ({
        petId: `pet-${i}`,
        interactionData: { type: 'conversation' },
      }));

      await service.processBatchEvolutionIncrements(largeBatchData);

      expect(service.processEvolutionIncrement).toHaveBeenCalledTimes(25);
    });
  });

  describe('scheduleAsyncBatchEvolution', () => {
    const mockBatchData = [
      { petId: 'pet-1', interactionData: { type: 'conversation' } },
      { petId: 'pet-2', interactionData: { type: 'interaction' } },
    ];

    beforeEach(() => {
      batchService.batchWriteEvolutions.mockResolvedValue({
        batchId: 'batch-123',
        successCount: 2,
        failureCount: 0,
        errors: [],
      });
      cacheService.cacheBatchEvolution.mockResolvedValue(undefined);
    });

    it('should successfully schedule async batch evolution', async () => {
      const batchId = await service.scheduleAsyncBatchEvolution(mockBatchData);

      expect(batchId).toMatch(/^async_batch_\d+_\w+$/);
      expect(batchService.batchWriteEvolutions).toHaveBeenCalled();
      expect(cacheService.cacheBatchEvolution).toHaveBeenCalled();
    });

    it('should handle batch service failures', async () => {
      batchService.batchWriteEvolutions.mockRejectedValue(new Error('Batch write failed'));

      await expect(
        service.scheduleAsyncBatchEvolution(mockBatchData),
      ).rejects.toThrow('Batch write failed');
    });
  });

  describe('getBatchEvolutionStatus', () => {
    const mockBatchId = 'batch-123';
    const mockBatchInfo = {
      status: 'completed',
      totalItems: 10,
      processedItems: 10,
      successful: 9,
      failed: 1,
      petIds: ['pet-1', 'pet-2'],
      startedAt: new Date(),
      completedAt: new Date(),
    };

    beforeEach(() => {
      batchService.getBatchInfo.mockResolvedValue(mockBatchInfo);
      cacheService.getBatchEvolution.mockResolvedValue({
        scheduledAt: Date.now() - 30000,
      });
    });

    it('should retrieve batch evolution status', async () => {
      const status = await service.getBatchEvolutionStatus(mockBatchId);

      expect(status).toBeDefined();
      expect(status.batchId).toBe(mockBatchId);
      expect(status.status).toBe('completed');
      expect(status.progress.total).toBe(10);
      expect(status.progress.successful).toBe(9);
      expect(status.progress.failed).toBe(1);
    });

    it('should handle batch service errors', async () => {
      batchService.getBatchInfo.mockRejectedValue(new Error('Batch not found'));

      await expect(
        service.getBatchEvolutionStatus(mockBatchId),
      ).rejects.toThrow('Batch not found');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent processing requests', async () => {
      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
      });

      lockService.executeWithLock.mockImplementation(async (resource: string, operation: any) => {
        // Simulate concurrent processing
        await new Promise(resolve => setTimeout(resolve, 100));
        return await operation();
      });

      prismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaService);
      });

      prismaService.pet.findUnique.mockResolvedValue(mockPet);
      interactionClassifier.convertToEvolutionEvent.mockResolvedValue({
        id: 'event-123',
        interactionType: 'casual_chat',
        intensity: 0.5,
        context: {},
        timestamp: new Date(),
      });

      evolutionEngine.processPersonalityEvolution.mockResolvedValue(mockEvolutionResult);
      prismaService.pet.update.mockResolvedValue(mockPet);
      prismaService.petEvolutionLog.create.mockResolvedValue({});

      // Start multiple concurrent requests
      const requests = Array.from({ length: 3 }, () =>
        service.processEvolutionIncrement(mockPetId, mockInteractionData),
      );

      await Promise.all(requests);

      expect(lockService.executeWithLock).toHaveBeenCalledTimes(3);
    });

    it('should handle memory pressure gracefully', async () => {
      // Simulate large interaction data
      const largeInteractionData = {
        ...mockInteractionData,
        conversationHistory: Array.from({ length: 1000 }, (_, i) => ({
          message: `Message ${i}`,
          timestamp: new Date(),
        })),
      };

      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
      });

      lockService.executeWithLock.mockImplementation(async (resource: string, operation: any) => {
        return await operation();
      });

      prismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaService);
      });

      prismaService.pet.findUnique.mockResolvedValue(mockPet);
      interactionClassifier.convertToEvolutionEvent.mockResolvedValue({
        id: 'event-123',
        interactionType: 'casual_chat',
        intensity: 0.5,
        context: {},
        timestamp: new Date(),
      });

      evolutionEngine.processPersonalityEvolution.mockResolvedValue(mockEvolutionResult);
      prismaService.pet.update.mockResolvedValue(mockPet);
      prismaService.petEvolutionLog.create.mockResolvedValue({});

      await service.processEvolutionIncrement(mockPetId, largeInteractionData);

      expect(interactionClassifier.convertToEvolutionEvent).toHaveBeenCalled();
    });
  });

  describe('Performance and Metrics', () => {
    it('should complete evolution processing within reasonable time', async () => {
      const startTime = Date.now();

      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
      });

      lockService.executeWithLock.mockImplementation(async (resource: string, operation: any) => {
        return await operation();
      });

      prismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaService);
      });

      prismaService.pet.findUnique.mockResolvedValue(mockPet);
      interactionClassifier.convertToEvolutionEvent.mockResolvedValue({
        id: 'event-123',
        interactionType: 'casual_chat',
        intensity: 0.5,
        context: {},
        timestamp: new Date(),
      });

      evolutionEngine.processPersonalityEvolution.mockResolvedValue(mockEvolutionResult);
      prismaService.pet.update.mockResolvedValue(mockPet);
      prismaService.petEvolutionLog.create.mockResolvedValue({});

      await service.processEvolutionIncrement(mockPetId, mockInteractionData);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});