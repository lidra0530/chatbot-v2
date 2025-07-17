import { PersonalityEvolutionEngine } from './personality-evolution';
import {
  PersonalityTrait,
  InteractionType,
  InteractionMode,
  EngagementLevel,
  EvolutionEvent,
  TimeWindow,
  DEFAULT_PERSONALITY_TRAITS,
  EvolutionContext,
} from './types/personality.types';

describe('PersonalityEvolution Boundary Tests', () => {
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
      timeOfDay: 'morning' as const,
      dayOfWeek: 1,
      season: 'spring' as const,
      isHoliday: false,
    },
    systemState: {
      serverLoad: 0.5,
      apiQuotaRemaining: 1000,
      experimentalFeatures: [],
    },
  });

  describe('特质值边界测试', () => {
    it('应该处理特质值为0的情况', async () => {
      const events = [createMockEvent()];
      const currentTraits = {
        ...DEFAULT_PERSONALITY_TRAITS,
        [PersonalityTrait.OPENNESS]: 0,
        [PersonalityTrait.CONSCIENTIOUSNESS]: 0,
      };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      
      // 验证特质值不会低于0
      Object.values(result.newPersonalityTraits).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });

    it('应该处理特质值为1的情况', async () => {
      const events = [createMockEvent({
        interactionType: InteractionType.CREATIVE_WORK,
        emotionalIntensity: 1.0,
        topicComplexity: 1.0,
        userSatisfaction: 1.0,
      })];
      const currentTraits = {
        ...DEFAULT_PERSONALITY_TRAITS,
        [PersonalityTrait.OPENNESS]: 1,
        [PersonalityTrait.CREATIVITY]: 1,
      };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      
      // 验证特质值不会超过1
      Object.values(result.newPersonalityTraits).forEach(value => {
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('应该处理接近边界的特质值', async () => {
      const events = [createMockEvent()];
      const currentTraits = {
        ...DEFAULT_PERSONALITY_TRAITS,
        [PersonalityTrait.OPENNESS]: 0.001,
        [PersonalityTrait.CONSCIENTIOUSNESS]: 0.999,
      };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.newPersonalityTraits[PersonalityTrait.OPENNESS]).toBeGreaterThanOrEqual(0);
      expect(result.newPersonalityTraits[PersonalityTrait.CONSCIENTIOUSNESS]).toBeLessThanOrEqual(1);
    });
  });

  describe('事件参数边界测试', () => {
    it('应该处理极短的互动持续时间', async () => {
      const events = [createMockEvent({
        duration: 1, // 1秒
        messageCount: 1,
      })];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理极长的互动持续时间', async () => {
      const events = [createMockEvent({
        duration: 86400, // 24小时
        messageCount: 10000,
      })];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理零消息数量', async () => {
      const events = [createMockEvent({
        messageCount: 0,
        duration: 60,
      })];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理极端的情感强度值', async () => {
      const events = [
        createMockEvent({
          emotionalIntensity: 0,
          topicComplexity: 0,
        }),
        createMockEvent({
          emotionalIntensity: 1,
          topicComplexity: 1,
        }),
      ];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(2);
    });

    it('应该处理缺失的用户满意度', async () => {
      const events = [createMockEvent({
        userSatisfaction: undefined,
      })];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });
  });

  describe('时间相关边界测试', () => {
    it('应该处理未来的时间戳', async () => {
      const events = [createMockEvent({
        timestamp: new Date(Date.now() + 86400000), // 明天
      })];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理非常旧的时间戳', async () => {
      const events = [createMockEvent({
        timestamp: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 一年前
      })];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理极短的宠物年龄', async () => {
      const events = [createMockEvent()];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();
      
      // 设置宠物刚刚创建
      context.pet.createdAt = new Date(Date.now() - 60000); // 1分钟前

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理极长的宠物年龄', async () => {
      const events = [createMockEvent()];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();
      
      // 设置宠物创建很久
      context.pet.createdAt = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 一年前

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });
  });

  describe('配置参数边界测试', () => {
    it('应该处理极低的锚定强度', async () => {
      const customEngine = new PersonalityEvolutionEngine({
        baselineAnchoring: {
          anchoringStrength: 0.001,
          personalityBaseline: { ...DEFAULT_PERSONALITY_TRAITS },
          timeDecayConfig: {
            decayRate: 0.1,
            decayFunction: 'linear',
            minimumInfluence: 0.1,
          },
          adaptiveConfig: {
            learningRate: 0.01,
            adaptationThreshold: 0.1,
            maxBaslineShift: 0.05,
            stabilizationPeriod: 30,
          },
        },
      });

      const events = [createMockEvent()];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await customEngine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理极高的锚定强度', async () => {
      const customEngine = new PersonalityEvolutionEngine({
        baselineAnchoring: {
          anchoringStrength: 0.999,
          personalityBaseline: { ...DEFAULT_PERSONALITY_TRAITS },
          timeDecayConfig: {
            decayRate: 0.1,
            decayFunction: 'linear',
            minimumInfluence: 0.1,
          },
          adaptiveConfig: {
            learningRate: 0.01,
            adaptationThreshold: 0.1,
            maxBaslineShift: 0.05,
            stabilizationPeriod: 30,
          },
        },
      });

      const events = [createMockEvent()];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await customEngine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理极严格的演化限制', async () => {
      const customEngine = new PersonalityEvolutionEngine({
        evolutionLimits: {
          dailyLimits: {
            maxChange: 0.001,
            maxEvents: 1,
            coolingPeriod: 23,
          },
          weeklyLimits: {
            maxChange: 0.005,
            maxCumulativeChange: 0.01,
          },
          monthlyLimits: {
            maxChange: 0.02,
            maxCumulativeChange: 0.05,
          },
          traitLimits: Object.values(PersonalityTrait).reduce((acc, trait) => {
            acc[trait] = {
              minValue: 0.1,
              maxValue: 0.9,
              changeResistance: 0.9,
              volatility: 0.1,
            };
            return acc;
          }, {} as any),
          globalConstraints: {
            maxSimultaneousChanges: 1,
            stabilityThreshold: 0.95,
            emergencyBrake: 0.001,
          },
        },
      });

      const events = [createMockEvent()];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await customEngine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.personalityAdjustment.appliedLimits.length).toBeGreaterThan(0);
    });

    it('应该处理极宽松的演化限制', async () => {
      const customEngine = new PersonalityEvolutionEngine({
        evolutionLimits: {
          dailyLimits: {
            maxChange: 1.0,
            maxEvents: 10000,
            coolingPeriod: 0,
          },
          weeklyLimits: {
            maxChange: 1.0,
            maxCumulativeChange: 1.0,
          },
          monthlyLimits: {
            maxChange: 1.0,
            maxCumulativeChange: 1.0,
          },
          traitLimits: Object.values(PersonalityTrait).reduce((acc, trait) => {
            acc[trait] = {
              minValue: 0,
              maxValue: 1,
              changeResistance: 0,
              volatility: 1,
            };
            return acc;
          }, {} as any),
          globalConstraints: {
            maxSimultaneousChanges: 10,
            stabilityThreshold: 0,
            emergencyBrake: 1.0,
          },
        },
      });

      const events = [createMockEvent()];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await customEngine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });
  });

  describe('极端负载测试', () => {
    it('应该处理空的话题标签', async () => {
      const events = [createMockEvent({
        metadata: {
          messageLength: 50,
          responseTime: 100,
          topicTags: [],
          moodIndicators: [],
          skillsUsed: [],
          contextSwitches: 0,
          userInitiated: true,
          feedbackGiven: false,
          specialEvents: [],
        },
      })];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理极大的话题标签数量', async () => {
      const manyTags = Array.from({ length: 1000 }, (_, i) => `tag-${i}`);
      const events = [createMockEvent({
        metadata: {
          messageLength: 50,
          responseTime: 100,
          topicTags: manyTags,
          moodIndicators: ['neutral'],
          skillsUsed: ['conversation'],
          contextSwitches: 0,
          userInitiated: true,
          feedbackGiven: false,
          specialEvents: [],
        },
      })];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理极端的响应时间', async () => {
      const events = [
        createMockEvent({
          metadata: {
            messageLength: 50,
            responseTime: 0, // 即时响应
            topicTags: ['test'],
            moodIndicators: ['neutral'],
            skillsUsed: ['conversation'],
            contextSwitches: 0,
            userInitiated: true,
            feedbackGiven: false,
            specialEvents: [],
          },
        }),
        createMockEvent({
          metadata: {
            messageLength: 50,
            responseTime: 300000, // 5分钟
            topicTags: ['test'],
            moodIndicators: ['neutral'],
            skillsUsed: ['conversation'],
            contextSwitches: 0,
            userInitiated: true,
            feedbackGiven: false,
            specialEvents: [],
          },
        }),
      ];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(2);
    });

    it('应该处理极端的上下文切换数量', async () => {
      const events = [createMockEvent({
        metadata: {
          messageLength: 50,
          responseTime: 100,
          topicTags: ['test'],
          moodIndicators: ['neutral'],
          skillsUsed: ['conversation'],
          contextSwitches: 1000, // 极多的上下文切换
          userInitiated: true,
          feedbackGiven: false,
          specialEvents: [],
        },
      })];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });
  });

  describe('系统状态边界测试', () => {
    it('应该处理高服务器负载', async () => {
      const events = [createMockEvent()];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();
      
      context.systemState.serverLoad = 0.99; // 99%负载

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理低API配额', async () => {
      const events = [createMockEvent()];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();
      
      context.systemState.apiQuotaRemaining = 1; // 只剩1个配额

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理空的实验功能列表', async () => {
      const events = [createMockEvent()];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();
      
      context.systemState.experimentalFeatures = [];

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });
  });

  describe('数据完整性边界测试', () => {
    it('应该处理缺失的宠物ID', async () => {
      const events = [createMockEvent({ petId: '' })];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        '',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理缺失的用户ID', async () => {
      const events = [createMockEvent({ userId: '' })];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        '',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('应该处理不一致的ID', async () => {
      const events = [createMockEvent({
        petId: 'different-pet',
        userId: 'different-user',
      })];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });
  });

  describe('时间窗口边界测试', () => {
    it('应该处理所有时间窗口类型', async () => {
      const events = [createMockEvent()];
      const timeWindows = [
        TimeWindow.DAILY,
        TimeWindow.WEEKLY,
        TimeWindow.MONTHLY,
        TimeWindow.QUARTERLY,
      ];

      for (const timeWindow of timeWindows) {
        const pattern = engine.analyzeInteractionPatterns(events, timeWindow);
        expect(pattern.timeWindow).toBe(timeWindow);
        expect(pattern.totalInteractions).toBe(1);
      }
    });
  });

  describe('缓存边界测试', () => {
    it('应该处理缓存过期', async () => {
      const shortCacheEngine = new PersonalityEvolutionEngine({
        timeDecay: {
          cacheExpiry: {
            interactionPatterns: 0.001, // 1毫秒过期
            personalityAnalytics: 0.001,
            evolutionResults: 0.001,
          },
          eventDecay: {
            halfLife: 7,
            minimumWeight: 0.1,
            decayFunction: 'exponential' as const,
          },
          personalityDecay: {
            dailyDecayRate: 0.02,
            weeklyDecayRate: 0.1,
            monthlyDecayRate: 0.25,
          },
        },
      });

      const events = [createMockEvent()];
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      // 第一次运行
      const result1 = await shortCacheEngine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      // 等待缓存过期
      await new Promise(resolve => setTimeout(resolve, 10));

      // 第二次运行
      const result2 = await shortCacheEngine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        currentTraits,
        context
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.evolutionId).not.toBe(result2.evolutionId);
    });
  });
});