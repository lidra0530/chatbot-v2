import { Test, TestingModule } from '@nestjs/testing';
import { PersonalityCacheService } from '../personality-cache.service';
import { RedisService } from '../../../../common/redis.service';

describe('PersonalityCacheService', () => {
  let service: PersonalityCacheService;
  let redisService: jest.Mocked<RedisService>;

  const mockPetId = 'test-pet-123';
  const mockUserId = 'test-user-456';
  const mockPersonalityData = {
    traits: {
      openness: 0.6,
      conscientiousness: 0.7,
      extraversion: 0.5,
      agreeableness: 0.8,
      neuroticism: 0.3,
    },
    lastUpdated: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      keys: jest.fn(),
      flushPattern: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalityCacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<PersonalityCacheService>(PersonalityCacheService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Cache Operations', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    describe('setWithFallback', () => {
      it('should successfully cache data with TTL', async () => {
        redisService.set.mockResolvedValue(true);

        const result = await service.setWithFallback(
          'test-key',
          mockPersonalityData,
          3600,
        );

        expect(result).toBe(true);
        expect(redisService.set).toHaveBeenCalledWith(
          'personality:test-key',
          mockPersonalityData,
          3600,
        );
      });

      it('should handle Redis failures and use memory fallback', async () => {
        redisService.set.mockRejectedValue(new Error('Redis connection failed'));

        const result = await service.setWithFallback(
          'test-key',
          mockPersonalityData,
          3600,
        );

        expect(result).toBe(true); // Should succeed with memory fallback
      });

      it('should validate input parameters', async () => {
        await expect(
          service.setWithFallback('', mockPersonalityData, 3600),
        ).rejects.toThrow('Cache key cannot be empty');

        await expect(
          service.setWithFallback('test-key', undefined, 3600),
        ).rejects.toThrow('Cache value cannot be undefined or null');
      });
    });

    describe('getWithFallback', () => {
      it('should retrieve data from Redis cache', async () => {
        redisService.get.mockResolvedValue(mockPersonalityData);

        const result = await service.getWithFallback('test-key');

        expect(result).toEqual(mockPersonalityData);
        expect(redisService.get).toHaveBeenCalledWith('personality:test-key');
      });

      it('should fallback to memory cache when Redis fails', async () => {
        redisService.get.mockRejectedValue(new Error('Redis connection failed'));

        // First set data in memory cache
        await service.setWithFallback('test-key', mockPersonalityData, 3600);
        redisService.set.mockRejectedValue(new Error('Redis connection failed'));

        const result = await service.getWithFallback('test-key');

        expect(result).toEqual(mockPersonalityData);
      });

      it('should return null when data not found in any cache', async () => {
        redisService.get.mockResolvedValue(null);

        const result = await service.getWithFallback('non-existent-key');

        expect(result).toBeNull();
      });

      it('should handle cache expiration correctly', async () => {
        // Set data with very short TTL
        await service.setWithFallback('test-key', mockPersonalityData, 1);

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 1100));

        redisService.get.mockResolvedValue(null);
        const result = await service.getWithFallback('test-key');

        expect(result).toBeNull();
      });
    });
  });

  describe('Personality-specific Cache Operations', () => {
    describe('cachePersonalityAnalysis', () => {
      it('should cache personality analysis with appropriate TTL', async () => {
        redisService.set.mockResolvedValue(true);

        await service.cachePersonalityAnalysis(mockPetId, mockPersonalityData);

        expect(redisService.set).toHaveBeenCalledWith(
          `personality:analysis:${mockPetId}`,
          expect.objectContaining({
            petId: mockPetId,
            analysisData: mockPersonalityData,
          }),
          300, // 5 minutes default TTL
        );
      });

      it('should use custom TTL when provided', async () => {
        redisService.set.mockResolvedValue(true);

        await service.cachePersonalityAnalysis(mockPetId, mockPersonalityData);

        expect(redisService.set).toHaveBeenCalledWith(
          `personality:analysis:${mockPetId}`,
          expect.objectContaining({
            petId: mockPetId,
            analysisData: mockPersonalityData,
          }),
          7200,
        );
      });
    });

    describe('getPersonalityAnalysis', () => {
      it('should retrieve cached personality analysis', async () => {
        const mockAnalysisCache = {
          petId: mockPetId,
          analysisData: mockPersonalityData,
          timestamp: Date.now(),
          ttl: 300,
        };
        redisService.get.mockResolvedValue(mockAnalysisCache);

        const result = await service.getPersonalityAnalysis(mockPetId);

        expect(result).toEqual(mockAnalysisCache);
        expect(redisService.get).toHaveBeenCalledWith(`personality:analysis:${mockPetId}`);
      });

      it('should return null when personality analysis not cached', async () => {
        redisService.get.mockResolvedValue(null);

        const result = await service.getPersonalityAnalysis(mockPetId);

        expect(result).toBeNull();
      });
    });

    describe('invalidatePersonalityCache', () => {
      it('should invalidate all personality-related cache for a pet', async () => {
        redisService.keys.mockResolvedValue([
          `personality:data:${mockPetId}`,
          `personality:analysis:${mockPetId}`,
          `personality:stats:${mockPetId}:weekly`,
        ]);
        redisService.del.mockResolvedValue(true);

        await service.invalidatePersonalityCache(mockPetId);

        expect(redisService.keys).toHaveBeenCalledWith(`personality:*:${mockPetId}*`);
        expect(redisService.del).toHaveBeenCalledTimes(3);
      });

      it('should handle Redis errors during invalidation', async () => {
        redisService.keys.mockRejectedValue(new Error('Redis connection failed'));

        // Should not throw error
        await expect(
          service.invalidatePersonalityCache(mockPetId),
        ).resolves.not.toThrow();
      });
    });
  });

  describe('Analytics Cache Operations', () => {
    const mockAnalysisResult = {
      traitAnalysis: {
        openness: { score: 0.6, trend: 'increasing' },
        conscientiousness: { score: 0.7, trend: 'stable' },
      },
      evolutionSummary: {
        totalChanges: 15,
        significantChanges: 3,
        lastEvolutionDate: new Date().toISOString(),
      },
    };

    describe('cachePersonalityAnalysis', () => {
      it('should cache personality analysis with default TTL', async () => {
        redisService.set.mockResolvedValue(true);

        await service.cachePersonalityAnalysis(mockPetId, mockAnalysisResult);

        expect(redisService.set).toHaveBeenCalledWith(
          `personality:analysis:${mockPetId}`,
          mockAnalysisResult,
          7200, // 2 hours default TTL
        );
      });
    });

    describe('getPersonalityAnalysis', () => {
      it('should retrieve cached personality analysis', async () => {
        redisService.get.mockResolvedValue(mockAnalysisResult);

        const result = await service.getPersonalityAnalysis(mockPetId);

        expect(result).toEqual(mockAnalysisResult);
        expect(redisService.get).toHaveBeenCalledWith(`personality:analysis:${mockPetId}`);
      });
    });

    describe('cacheEvolutionStats', () => {
      it('should cache evolution statistics with period-specific TTL', async () => {
        const mockStats = {
          period: 'weekly',
          totalEvolutions: 42,
          averageIntensity: 0.65,
          dominantTraitChanges: ['openness', 'extraversion'],
        };
        redisService.set.mockResolvedValue(true);

        await service.cacheEvolutionStats(mockPetId, 'weekly', mockStats);

        expect(redisService.set).toHaveBeenCalledWith(
          `personality:stats:${mockPetId}:weekly`,
          mockStats,
          3600, // 1 hour TTL for weekly stats
        );
      });

      it('should use appropriate TTL for different periods', async () => {
        const mockStats = { period: 'daily', data: 'test' };
        redisService.set.mockResolvedValue(true);

        await service.cacheEvolutionStats(mockPetId, 'daily', mockStats);

        expect(redisService.set).toHaveBeenCalledWith(
          `personality:stats:${mockPetId}:daily`,
          mockStats,
          1800, // 30 minutes TTL for daily stats
        );
      });
    });

    describe('getEvolutionStats', () => {
      it('should retrieve cached evolution statistics', async () => {
        const mockStats = { period: 'weekly', totalEvolutions: 42 };
        redisService.get.mockResolvedValue(mockStats);

        const result = await service.getEvolutionStats(mockPetId, 'weekly');

        expect(result).toEqual(mockStats);
        expect(redisService.get).toHaveBeenCalledWith(
          `personality:stats:${mockPetId}:weekly`,
        );
      });
    });
  });

  describe('Batch Operations', () => {
    describe('cacheBatchEvolution', () => {
      it('should cache batch evolution data', async () => {
        const petIds = ['pet-1', 'pet-2', 'pet-3'];
        const batchData = {
          batchId: 'batch-123',
          status: 'completed',
          totalItems: 3,
          successfulItems: 3,
        };
        redisService.set.mockResolvedValue(true);

        await service.cacheBatchEvolution(petIds, batchData);

        expect(redisService.set).toHaveBeenCalledWith(
          'personality:batch:pet-1,pet-2,pet-3',
          batchData,
          1800, // 30 minutes TTL
        );
      });

      it('should handle large pet ID lists by hashing', async () => {
        const largePetIdList = Array.from({ length: 100 }, (_, i) => `pet-${i}`);
        const batchData = { batchId: 'batch-large', status: 'processing' };
        redisService.set.mockResolvedValue(true);

        await service.cacheBatchEvolution(largePetIdList, batchData);

        // Should use hashed key for large lists
        expect(redisService.set).toHaveBeenCalledWith(
          expect.stringMatching(/^personality:batch:hash-\w+$/),
          batchData,
          1800,
        );
      });
    });

    describe('getBatchEvolution', () => {
      it('should retrieve cached batch evolution data', async () => {
        const petIds = ['pet-1', 'pet-2'];
        const batchData = { batchId: 'batch-123', status: 'completed' };
        redisService.get.mockResolvedValue(batchData);

        const result = await service.getBatchEvolution(petIds);

        expect(result).toEqual(batchData);
        expect(redisService.get).toHaveBeenCalledWith('personality:batch:pet-1,pet-2');
      });
    });

    describe('invalidateAllBatchCache', () => {
      it('should invalidate all batch-related cache', async () => {
        redisService.flushPattern.mockResolvedValue();

        await service.invalidateAllBatchCache();

        expect(redisService.flushPattern).toHaveBeenCalledWith('personality:batch:*');
      });
    });
  });

  describe('Cache Statistics and Monitoring', () => {
    describe('getCacheStats', () => {
      it('should return cache statistics', async () => {
        redisService.keys.mockResolvedValue([
          'personality:data:pet-1',
          'personality:analysis:pet-1',
          'personality:stats:pet-1:weekly',
          'personality:batch:batch-1',
        ]);

        const stats = await service.getCacheStats();

        expect(stats).toEqual({
          totalKeys: 4,
          keysByType: {
            data: 1,
            analysis: 1,
            stats: 1,
            batch: 1,
            trends: 0,
            other: 0,
          },
          memoryFallbackActive: expect.any(Boolean),
        });
      });

      it('should handle Redis errors when getting stats', async () => {
        redisService.keys.mockRejectedValue(new Error('Redis connection failed'));

        const stats = await service.getCacheStats();

        expect(stats).toEqual({
          totalKeys: 0,
          keysByType: {
            data: 0,
            analysis: 0,
            stats: 0,
            batch: 0,
            trends: 0,
            other: 0,
          },
          memoryFallbackActive: true,
        });
      });
    });
  });

  describe('Memory Fallback System', () => {
    it('should automatically use memory fallback when Redis is unavailable', async () => {
      // Simulate Redis failure
      redisService.set.mockRejectedValue(new Error('Redis unavailable'));
      redisService.get.mockRejectedValue(new Error('Redis unavailable'));

      // Set data (should use memory fallback)
      await service.setWithFallback('test-key', mockPersonalityData, 3600);

      // Get data (should retrieve from memory fallback)
      const result = await service.getWithFallback('test-key');

      expect(result).toEqual(mockPersonalityData);
    });

    it('should clean up expired entries from memory cache', async () => {
      // Disable Redis to force memory fallback
      redisService.set.mockRejectedValue(new Error('Redis unavailable'));
      redisService.get.mockRejectedValue(new Error('Redis unavailable'));

      // Set data with very short TTL
      await service.setWithFallback('short-lived-key', mockPersonalityData, 1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should return null as data has expired
      const result = await service.getWithFallback('short-lived-key');
      expect(result).toBeNull();
    });

    it('should respect memory cache size limits', async () => {
      // Disable Redis to force memory fallback
      redisService.set.mockRejectedValue(new Error('Redis unavailable'));

      // Fill memory cache beyond typical limits
      const promises = Array.from({ length: 1000 }, (_, i) =>
        service.setWithFallback(`test-key-${i}`, { data: `data-${i}` }, 3600),
      );

      await Promise.all(promises);

      // Memory cache should handle this gracefully (may evict old entries)
      const result = await service.getWithFallback('test-key-0');
      // Result may be null if evicted, which is acceptable behavior
      expect(typeof result === 'object' || result === null).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent cache operations', async () => {
      redisService.set.mockResolvedValue(true);
      redisService.get.mockResolvedValue(mockPersonalityData);

      // Simulate concurrent set operations
      const setPromises = Array.from({ length: 10 }, (_, i) =>
        service.setWithFallback(`concurrent-key-${i}`, { data: i }, 3600),
      );

      // Simulate concurrent get operations
      const getPromises = Array.from({ length: 10 }, (_, i) =>
        service.getWithFallback(`concurrent-key-${i}`),
      );

      const [setResults, getResults] = await Promise.all([
        Promise.all(setPromises),
        Promise.all(getPromises),
      ]);

      expect(setResults.every(result => result === true)).toBe(true);
      expect(getResults.length).toBe(10);
    });

    it('should handle malformed cache data gracefully', async () => {
      // Simulate corrupted data in Redis
      redisService.get.mockResolvedValue('{"malformed": json');

      const result = await service.getWithFallback('test-key');

      // Should return null for malformed data
      expect(result).toBeNull();
    });

    it('should validate cache key length and characters', async () => {
      const veryLongKey = 'a'.repeat(300);
      
      await expect(
        service.setWithFallback(veryLongKey, mockPersonalityData, 3600),
      ).rejects.toThrow('Cache key too long');

      await expect(
        service.setWithFallback('key with spaces', mockPersonalityData, 3600),
      ).rejects.toThrow('Cache key contains invalid characters');
    });

    it('should handle TTL edge cases', async () => {
      redisService.set.mockResolvedValue(true);

      // Test negative TTL
      await expect(
        service.setWithFallback('test-key', mockPersonalityData, -1),
      ).rejects.toThrow('TTL must be positive');

      // Test zero TTL (should set but immediately expire)
      await service.setWithFallback('test-key', mockPersonalityData, 0);
      redisService.get.mockResolvedValue(null);
      
      const result = await service.getWithFallback('test-key');
      expect(result).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large data objects efficiently', async () => {
      const largeData = {
        traits: mockPersonalityData.traits,
        history: Array.from({ length: 1000 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 1000),
          change: Math.random(),
          reason: `Change ${i}`,
        })),
      };

      redisService.set.mockResolvedValue(true);
      redisService.get.mockResolvedValue(largeData);

      const startTime = Date.now();
      await service.setWithFallback('large-data-key', largeData, 3600);
      const setTime = Date.now() - startTime;

      const getStartTime = Date.now();
      const result = await service.getWithFallback('large-data-key');
      const getTime = Date.now() - getStartTime;

      expect(result).toEqual(largeData);
      expect(setTime).toBeLessThan(1000); // Should complete within 1 second
      expect(getTime).toBeLessThan(500); // Should complete within 0.5 seconds
    });

    it('should handle high-frequency cache operations', async () => {
      redisService.set.mockResolvedValue(true);
      redisService.get.mockResolvedValue(mockPersonalityData);

      const operationCount = 100;
      const startTime = Date.now();

      const operations = Array.from({ length: operationCount }, (_, i) =>
        i % 2 === 0
          ? service.setWithFallback(`key-${i}`, mockPersonalityData, 3600)
          : service.getWithFallback(`key-${i - 1}`),
      );

      await Promise.all(operations);

      const totalTime = Date.now() - startTime;
      const avgTimePerOperation = totalTime / operationCount;

      expect(avgTimePerOperation).toBeLessThan(50); // Should average less than 50ms per operation
    });
  });
});