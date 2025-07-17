import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PersonalityModule } from '../personality.module';
// import { PersonalityController } from '../personality.controller';
import { PersonalityService } from '../personality.service';
import { PrismaService } from '../../../common/prisma.service';
import { RedisService } from '../../../common/redis.service';
import { PersonalityEvolutionEngine } from '../../../algorithms/personality-evolution';
import { InteractionClassifier } from '../../../algorithms/interaction-classifier';
import * as request from 'supertest';

describe('Personality API Compatibility Tests', () => {
  let app: INestApplication;
  let module: TestingModule;
  // let personalityController: PersonalityController;
  let personalityService: PersonalityService;
  let prismaService: any;
  let redisService: any;

  // Mock data that matches existing API contracts
  const mockUser = {
    id: 'api-test-user-123',
    email: 'test@example.com',
    username: 'apitest',
  };

  const mockPet = {
    id: 'api-test-pet-123',
    name: 'APITestPet',
    species: 'cat',
    userId: mockUser.id,
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPersonalityTraits = {
    openness: 50,
    conscientiousness: 60,
    extraversion: 40,
    agreeableness: 70,
    neuroticism: 30,
  };

  beforeAll(async () => {
    const mockPrismaService = {
      pet: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
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

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      keys: jest.fn(),
      flushPattern: jest.fn(),
      setNX: jest.fn(),
      eval: jest.fn(),
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

    app = module.createNestApplication();
    await app.init();

    // personalityController = module.get<PersonalityController>(PersonalityController);
    personalityService = module.get<PersonalityService>(PersonalityService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Existing API Endpoints Compatibility', () => {
    describe('GET /personality/pets/:petId/traits', () => {
      it('should maintain exact response format for pet traits retrieval', async () => {
        prismaService.pet.findUnique.mockResolvedValue(mockPet);

        const response = await request(app.getHttpServer())
          .get(`/personality/pets/${mockPet.id}/traits`)
          .expect(200);

        // Verify exact response structure matches existing API
        expect(response.body).toEqual({
          petId: mockPet.id,
          traits: mockPersonalityTraits,
          lastUpdated: expect.any(String),
        });

        // Verify response has all required fields
        expect(response.body).toHaveProperty('petId');
        expect(response.body).toHaveProperty('traits');
        expect(response.body).toHaveProperty('lastUpdated');
        expect(response.body.traits).toHaveProperty('openness');
        expect(response.body.traits).toHaveProperty('conscientiousness');
        expect(response.body.traits).toHaveProperty('extraversion');
        expect(response.body.traits).toHaveProperty('agreeableness');
        expect(response.body.traits).toHaveProperty('neuroticism');
      });

      it('should handle non-existent pet with proper error format', async () => {
        prismaService.pet.findUnique.mockResolvedValue(null);

        const response = await request(app.getHttpServer())
          .get('/personality/pets/non-existent-pet/traits')
          .expect(404);

        expect(response.body).toEqual({
          statusCode: 404,
          message: 'Pet not found',
          error: 'Not Found',
        });
      });
    });

    describe('PUT /personality/pets/:petId/traits', () => {
      it('should maintain exact request/response format for traits update', async () => {
        const updateTraitsDto = {
          traits: {
            openness: 55,
            conscientiousness: 65,
            extraversion: 45,
            agreeableness: 75,
            neuroticism: 25,
          },
        };

        const updatedPet = {
          ...mockPet,
          personality: {
            ...mockPet.personality,
            traits: updateTraitsDto.traits,
          },
        };

        prismaService.pet.findUnique.mockResolvedValue(mockPet);
        prismaService.pet.update.mockResolvedValue(updatedPet);

        const response = await request(app.getHttpServer())
          .put(`/personality/pets/${mockPet.id}/traits`)
          .send(updateTraitsDto)
          .expect(200);

        expect(response.body).toEqual({
          petId: mockPet.id,
          traits: updateTraitsDto.traits,
          lastUpdated: expect.any(String),
        });
      });

      it('should validate traits data format', async () => {
        const invalidTraitsDto = {
          traits: {
            openness: 150, // Invalid: over 100
            conscientiousness: -10, // Invalid: under 0
            extraversion: 'invalid', // Invalid: not a number
          },
        };

        const response = await request(app.getHttpServer())
          .put(`/personality/pets/${mockPet.id}/traits`)
          .send(invalidTraitsDto)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /personality/pets/:petId/analysis', () => {
      it('should maintain exact response format for personality analysis', async () => {
        const mockAnalysis = {
          trends: {
            openness: {
              direction: 'stable' as const,
              changeRate: 0.1,
              significance: 0.8,
            },
            conscientiousness: {
              direction: 'increasing' as const,
              changeRate: 0.2,
              significance: 0.9,
            },
          },
          stability: {
            overall: 0.85,
            individual: {
              openness: 0.8,
              conscientiousness: 0.9,
            },
          },
          evolution: {
            speed: 0.3,
            volatility: 0.2,
            consistency: 0.8,
          },
          patterns: [
            {
              type: 'conversation',
              frequency: 5,
              impact: 0.8,
            },
            {
              type: 'learning',
              frequency: 3,
              impact: 0.6,
            },
          ],
          predictions: {
            shortTerm: {
              openness: 0.52,
              conscientiousness: 0.62,
            },
            confidence: 0.8,
            timeframe: '7days',
          },
          metadata: {
            analysisDate: new Date(),
            version: '1.0',
            dataPoints: 100,
          },
          recommendations: [
            {
              type: 'interaction',
              priority: 'high' as const,
              description: 'Increase conversation interactions to boost openness',
            },
            {
              type: 'activity',
              priority: 'medium' as const,
              description: 'Engage in learning activities to enhance conscientiousness',
            },
          ],
        };

        prismaService.pet.findUnique.mockResolvedValue(mockPet);
        jest.spyOn(personalityService, 'getPersonalityAnalytics').mockResolvedValue(mockAnalysis);

        const response = await request(app.getHttpServer())
          .get(`/personality/pets/${mockPet.id}/analysis`)
          .expect(200);

        expect(response.body).toEqual(mockAnalysis);
        expect(response.body).toHaveProperty('petId');
        expect(response.body).toHaveProperty('traitAnalysis');
        expect(response.body).toHaveProperty('summary');
        expect(response.body).toHaveProperty('lastAnalyzed');
      });
    });

    describe('POST /personality/pets/:petId/evolve', () => {
      it('should maintain exact request/response format for personality evolution', async () => {
        const evolutionDto = {
          interactionData: {
            userMessage: 'Hello pet!',
            botResponse: 'Hello human!',
            interactionType: 'conversation',
            duration: 120,
            emotionalTone: 'positive',
          },
        };

        const mockEvolutionResult = {
          success: true,
          petId: mockPet.id,
          changesApplied: {
            openness: 2,
            conscientiousness: 1,
            extraversion: 0,
            agreeableness: 1,
            neuroticism: -1,
          },
          newTraits: {
            openness: 52,
            conscientiousness: 61,
            extraversion: 40,
            agreeableness: 71,
            neuroticism: 29,
          },
          confidence: 0.85,
          reason: 'Positive interaction detected',
          timestamp: expect.any(String),
        };

        prismaService.pet.findUnique.mockResolvedValue(mockPet);
        redisService.setNX.mockResolvedValue(true);
        redisService.eval.mockResolvedValue(1);
        prismaService.$transaction.mockImplementation(async (callback: any) => {
          return await callback(prismaService);
        });

        jest.spyOn(personalityService, 'processEvolutionIncrement').mockResolvedValue();

        const response = await request(app.getHttpServer())
          .post(`/personality/pets/${mockPet.id}/evolve`)
          .send(evolutionDto)
          .expect(200);

        expect(response.body).toEqual(mockEvolutionResult);
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('petId');
        expect(response.body).toHaveProperty('changesApplied');
        expect(response.body).toHaveProperty('newTraits');
        expect(response.body).toHaveProperty('confidence');
        expect(response.body).toHaveProperty('reason');
        expect(response.body).toHaveProperty('timestamp');
      });

      it('should handle invalid interaction data format', async () => {
        const invalidEvolutionDto = {
          interactionData: {
            // Missing required fields
            userMessage: '',
            duration: -1,
          },
        };

        const response = await request(app.getHttpServer())
          .post(`/personality/pets/${mockPet.id}/evolve`)
          .send(invalidEvolutionDto)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('GET /personality/pets/:petId/history', () => {
      it('should maintain exact response format for evolution history', async () => {
        const mockHistory = {
          petId: mockPet.id,
          totalEvolutions: 15,
          history: [
            {
              id: 'evolution-1',
              timestamp: '2024-01-15T10:00:00Z',
              triggerEvent: 'conversation',
              changesApplied: {
                openness: 1,
                conscientiousness: 0,
                extraversion: 1,
                agreeableness: 0,
                neuroticism: -1,
              },
              confidence: 0.8,
              reason: 'Positive social interaction',
            },
            {
              id: 'evolution-2',
              timestamp: '2024-01-14T15:30:00Z',
              triggerEvent: 'play',
              changesApplied: {
                openness: 0,
                conscientiousness: -1,
                extraversion: 2,
                agreeableness: 1,
                neuroticism: 0,
              },
              confidence: 0.7,
              reason: 'Playful interaction increased extraversion',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 15,
            hasNext: false,
            hasPrevious: false,
          },
        };

        prismaService.pet.findUnique.mockResolvedValue(mockPet);
        jest.spyOn(personalityService, 'getEvolutionHistory').mockResolvedValue(mockHistory);

        const response = await request(app.getHttpServer())
          .get(`/personality/pets/${mockPet.id}/history`)
          .expect(200);

        expect(response.body).toEqual(mockHistory);
        expect(response.body).toHaveProperty('petId');
        expect(response.body).toHaveProperty('totalEvolutions');
        expect(response.body).toHaveProperty('history');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.history)).toBe(true);
      });

      it('should support pagination parameters', async () => {
        const page = 2;
        const limit = 10;

        prismaService.pet.findUnique.mockResolvedValue(mockPet);
        jest.spyOn(personalityService, 'getEvolutionHistory').mockResolvedValue({
          petId: mockPet.id,
          totalEvolutions: 25,
          history: [],
          pagination: {
            page,
            limit,
            total: 25,
            hasNext: true,
            hasPrevious: true,
          },
        });

        const response = await request(app.getHttpServer())
          .get(`/personality/pets/${mockPet.id}/history`)
          .query({ page, limit })
          .expect(200);

        expect(response.body.pagination.page).toBe(page);
        expect(response.body.pagination.limit).toBe(limit);
      });
    });
  });

  describe('Error Handling Compatibility', () => {
    it('should maintain consistent error response format', async () => {
      // Test various error scenarios
      const errorScenarios = [
        {
          url: '/personality/pets/invalid-id/traits',
          expectedStatus: 404,
          expectedError: 'Not Found',
        },
        {
          url: '/personality/pets//traits', // Empty pet ID
          expectedStatus: 400,
          expectedError: 'Bad Request',
        },
      ];

      for (const scenario of errorScenarios) {
        prismaService.pet.findUnique.mockResolvedValue(null);

        const response = await request(app.getHttpServer())
          .get(scenario.url)
          .expect(scenario.expectedStatus);

        expect(response.body).toHaveProperty('statusCode', scenario.expectedStatus);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('error', scenario.expectedError);
      }
    });

    it('should handle internal server errors consistently', async () => {
      prismaService.pet.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app.getHttpServer())
        .get(`/personality/pets/${mockPet.id}/traits`)
        .expect(500);

      expect(response.body).toHaveProperty('statusCode', 500);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error', 'Internal Server Error');
    });
  });

  describe('Request Validation Compatibility', () => {
    it('should maintain existing validation rules for trait updates', async () => {
      const testCases = [
        {
          input: { traits: { openness: 101 } },
          description: 'trait value over maximum',
        },
        {
          input: { traits: { openness: -1 } },
          description: 'trait value under minimum',
        },
        {
          input: { traits: { invalidTrait: 50 } },
          description: 'invalid trait name',
        },
        {
          input: { traits: {} },
          description: 'empty traits object',
        },
        {
          input: {},
          description: 'missing traits field',
        },
      ];

      for (const testCase of testCases) {
        const response = await request(app.getHttpServer())
          .put(`/personality/pets/${mockPet.id}/traits`)
          .send(testCase.input)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
        
        console.log(`Validation test passed for: ${testCase.description}`);
      }
    });

    it('should validate evolution interaction data format', async () => {
      const invalidInputs = [
        {
          interactionData: null,
          description: 'null interaction data',
        },
        {
          interactionData: {},
          description: 'empty interaction data',
        },
        {
          interactionData: {
            userMessage: '',
            duration: 'invalid',
          },
          description: 'invalid duration type',
        },
        {
          // Missing interactionData field entirely
          description: 'missing interaction data field',
        },
      ];

      for (const input of invalidInputs) {
        const response = await request(app.getHttpServer())
          .post(`/personality/pets/${mockPet.id}/evolve`)
          .send(input)
          .expect(400);

        expect(response.body).toHaveProperty('statusCode', 400);
        
        console.log(`Evolution validation test passed for: ${input.description}`);
      }
    });
  });

  describe('Content-Type and Headers Compatibility', () => {
    it('should accept and return JSON content type', async () => {
      prismaService.pet.findUnique.mockResolvedValue(mockPet);

      const response = await request(app.getHttpServer())
        .get(`/personality/pets/${mockPet.id}/traits`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.header['content-type']).toMatch(/application\/json/);
    });

    it('should handle missing Content-Type for POST requests', async () => {
      const response = await request(app.getHttpServer())
        .post(`/personality/pets/${mockPet.id}/evolve`)
        .send({
          interactionData: {
            userMessage: 'test',
            botResponse: 'test response',
          },
        })
        .expect(400); // Should fail validation due to missing fields, but not due to content-type

      expect(response.body).toHaveProperty('statusCode');
    });
  });

  describe('Query Parameters Compatibility', () => {
    it('should maintain support for existing query parameters', async () => {
      prismaService.pet.findUnique.mockResolvedValue(mockPet);
      jest.spyOn(personalityService, 'getEvolutionHistory').mockResolvedValue({
        petId: mockPet.id,
        totalEvolutions: 0,
        history: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          hasNext: false,
          hasPrevious: false,
        },
      });

      // Test with various query parameter combinations
      const queryTests = [
        { query: { page: 1, limit: 10 }, description: 'basic pagination' },
        { query: { page: '2', limit: '25' }, description: 'string numbers' },
        { query: { startDate: '2024-01-01' }, description: 'date filtering' },
        { query: { includeDetails: 'true' }, description: 'boolean flags' },
      ];

      for (const test of queryTests) {
        const response = await request(app.getHttpServer())
          .get(`/personality/pets/${mockPet.id}/history`)
          .query(test.query)
          .expect(200);

        expect(response.body).toHaveProperty('petId');
        
        console.log(`Query parameter test passed for: ${test.description}`);
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should support legacy field names in responses', async () => {
      prismaService.pet.findUnique.mockResolvedValue(mockPet);

      const response = await request(app.getHttpServer())
        .get(`/personality/pets/${mockPet.id}/traits`)
        .expect(200);

      // Ensure both new and legacy field names are present if needed
      expect(response.body).toHaveProperty('petId');
      expect(response.body).toHaveProperty('traits');
      expect(response.body).toHaveProperty('lastUpdated');

      // Verify traits structure matches exactly
      const traits = response.body.traits;
      expect(traits).toHaveProperty('openness');
      expect(traits).toHaveProperty('conscientiousness');
      expect(traits).toHaveProperty('extraversion');
      expect(traits).toHaveProperty('agreeableness');
      expect(traits).toHaveProperty('neuroticism');

      // Verify all trait values are numbers
      Object.values(traits).forEach(value => {
        expect(typeof value).toBe('number');
      });
    });

    it('should maintain response timing expectations', async () => {
      prismaService.pet.findUnique.mockResolvedValue(mockPet);

      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get(`/personality/pets/${mockPet.id}/traits`)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // API should respond within reasonable time (under 1 second for simple operations)
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('Data Format Consistency', () => {
    it('should maintain consistent date formats across endpoints', async () => {
      prismaService.pet.findUnique.mockResolvedValue(mockPet);

      const response = await request(app.getHttpServer())
        .get(`/personality/pets/${mockPet.id}/traits`)
        .expect(200);

      const lastUpdated = response.body.lastUpdated;
      
      // Should be ISO 8601 format
      expect(lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(lastUpdated)).toBeInstanceOf(Date);
      expect(isNaN(new Date(lastUpdated).getTime())).toBe(false);
    });

    it('should maintain consistent numeric formats for traits', async () => {
      prismaService.pet.findUnique.mockResolvedValue(mockPet);

      const response = await request(app.getHttpServer())
        .get(`/personality/pets/${mockPet.id}/traits`)
        .expect(200);

      const traits = response.body.traits;

      // All trait values should be integers between 0 and 100
      Object.values(traits).forEach(value => {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });
  });
});