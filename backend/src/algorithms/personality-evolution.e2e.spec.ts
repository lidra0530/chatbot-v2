import { Test, TestingModule } from '@nestjs/testing';
import { PersonalityEvolutionEngine } from './personality-evolution';
import { PersonalityService } from '../modules/personality/personality.service';
import { PrismaService } from '../common/prisma.service';
import {
  PersonalityTrait,
  InteractionType,
  InteractionMode,
  EngagementLevel,
  EvolutionEvent,
  DEFAULT_PERSONALITY_TRAITS,
  EvolutionContext,
} from './types/personality.types';

describe('PersonalityEvolution E2E', () => {
  let engine: PersonalityEvolutionEngine;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalityEvolutionEngine,
        {
          provide: PersonalityService,
          useValue: {
            getPersonalityTraits: jest.fn(),
            updatePersonalityTraits: jest.fn(),
            getEvolutionHistory: jest.fn(),
            saveEvolutionResult: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            pet: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            evolutionEvent: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
            personalityEvolution: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    engine = module.get<PersonalityEvolutionEngine>(PersonalityEvolutionEngine);
  });

  describe('完整的个性演化流程', () => {
    const createMockEvents = (count: number): EvolutionEvent[] => {
      const events: EvolutionEvent[] = [];
      const baseTime = new Date();
      
      for (let i = 0; i < count; i++) {
        events.push({
          id: `event-${i}`,
          userId: 'user-123',
          petId: 'pet-456',
          timestamp: new Date(baseTime.getTime() - i * 60 * 60 * 1000), // 每小时一个事件
          interactionType: [
            InteractionType.CASUAL_CHAT,
            InteractionType.EMOTIONAL_SUPPORT,
            InteractionType.LEARNING,
            InteractionType.CREATIVE_WORK,
          ][i % 4],
          interactionMode: [
            InteractionMode.NORMAL,
            InteractionMode.EXTENDED,
          ][i % 2],
          engagementLevel: [
            EngagementLevel.LOW,
            EngagementLevel.MEDIUM,
            EngagementLevel.HIGH,
            EngagementLevel.INTENSE,
          ][i % 4],
          duration: 300 + (i * 100), // 递增的持续时间
          messageCount: 5 + i,
          emotionalIntensity: 0.3 + (i * 0.1),
          topicComplexity: 0.4 + (i * 0.05),
          userSatisfaction: 0.5 + (i * 0.1),
          metadata: {
            messageLength: 50 + (i * 10),
            responseTime: 100 + (i * 10),
            topicTags: [`topic-${i}`, `category-${i % 3}`],
            moodIndicators: ['neutral', 'positive'],
            skillsUsed: ['conversation', 'empathy'],
            contextSwitches: i % 2,
            userInitiated: i % 2 === 0,
            feedbackGiven: i % 3 === 0,
            specialEvents: [],
          },
        });
      }
      
      return events;
    };

    const createMockContext = (): EvolutionContext => ({
      pet: {
        id: 'pet-456',
        currentTraits: { ...DEFAULT_PERSONALITY_TRAITS },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
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

    it('应该处理单个高参与度事件', async () => {
      const events = createMockEvents(1);
      events[0].engagementLevel = EngagementLevel.INTENSE;
      events[0].emotionalIntensity = 0.9;
      events[0].userSatisfaction = 0.95;

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
      expect(result.personalityAdjustment.confidence).toBeGreaterThan(0.6);
      
      // 验证特质变化
      const hasSignificantChange = Object.values(result.personalityAdjustment.traitChanges)
        .some(change => Math.abs(change) > 0.01);
      expect(hasSignificantChange).toBe(true);
    });

    it('应该处理多个渐进式事件', async () => {
      const events = createMockEvents(10);
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
      expect(result.eventsProcessed).toBe(10);
      expect(result.personalityAdjustment.confidence).toBeGreaterThan(0.7);
      
      // 验证互动模式分析
      expect(result.interactionPattern.totalInteractions).toBe(10);
      expect(result.interactionPattern.averageEngagement).toBeGreaterThan(0);
      expect(result.interactionPattern.topicDiversity).toBeGreaterThan(0);
    });

    it('应该处理混合参与度的事件序列', async () => {
      const events = createMockEvents(5);
      // 创建递增的参与度模式
      events[0].engagementLevel = EngagementLevel.LOW;
      events[1].engagementLevel = EngagementLevel.MEDIUM;
      events[2].engagementLevel = EngagementLevel.HIGH;
      events[3].engagementLevel = EngagementLevel.INTENSE;
      events[4].engagementLevel = EngagementLevel.HIGH;

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
      expect(result.interactionPattern.engagementTrend).toBeGreaterThan(0); // 上升趋势
      
      // 验证特质调整反映了参与度增加
      const positiveChanges = Object.values(result.personalityAdjustment.traitChanges)
        .filter(change => change > 0);
      expect(positiveChanges.length).toBeGreaterThan(0);
    });

    it('应该处理时间衰减效应', async () => {
      const recentEvents = createMockEvents(3);
      const oldEvents = createMockEvents(3);
      
      // 设置旧事件的时间戳
      oldEvents.forEach((event, index) => {
        event.timestamp = new Date(Date.now() - (7 + index) * 24 * 60 * 60 * 1000); // 7-9天前
        event.id = `old-event-${index}`;
      });

      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      // 测试仅包含最近事件
      const recentResult = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        recentEvents,
        currentTraits,
        context
      );

      // 测试仅包含旧事件
      const oldResult = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        oldEvents,
        currentTraits,
        context
      );

      expect(recentResult.success).toBe(true);
      expect(oldResult.success).toBe(true);

      // 计算总的特质变化幅度
      const recentChangeTotal = Object.values(recentResult.personalityAdjustment.traitChanges)
        .reduce((sum, change) => sum + Math.abs(change), 0);
      const oldChangeTotal = Object.values(oldResult.personalityAdjustment.traitChanges)
        .reduce((sum, change) => sum + Math.abs(change), 0);

      // 最近的事件应该产生更大的影响
      expect(recentChangeTotal).toBeGreaterThan(oldChangeTotal);
    });

    it('应该处理极端个性状态', async () => {
      const events = createMockEvents(3);
      
      // 设置极端的当前特质值
      const extremeTraits = {
        ...DEFAULT_PERSONALITY_TRAITS,
        [PersonalityTrait.OPENNESS]: 0.95, // 非常开放
        [PersonalityTrait.CONSCIENTIOUSNESS]: 0.05, // 非常不认真
      };

      const context = createMockContext();

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        events,
        extremeTraits,
        context
      );

      expect(result.success).toBe(true);
      
      // 验证基线锚定效应
      expect(result.personalityAdjustment.appliedLimits.length).toBeGreaterThan(0);
      
      // 验证特质值仍在有效范围内
      Object.values(result.newPersonalityTraits).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('应该处理复杂的话题多样性', async () => {
      const events = createMockEvents(6);
      
      // 设置多样化的话题标签
      events[0].metadata.topicTags = ['science', 'technology', 'ai'];
      events[1].metadata.topicTags = ['art', 'creativity', 'music'];
      events[2].metadata.topicTags = ['philosophy', 'ethics', 'life'];
      events[3].metadata.topicTags = ['sports', 'health', 'fitness'];
      events[4].metadata.topicTags = ['food', 'cooking', 'culture'];
      events[5].metadata.topicTags = ['travel', 'adventure', 'exploration'];

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
      expect(result.interactionPattern.topicDiversity).toBeGreaterThan(0.8);
      
      // 话题多样性应该影响开放性特质
      expect(Math.abs(result.personalityAdjustment.traitChanges[PersonalityTrait.OPENNESS]))
        .toBeGreaterThan(0.005);
    });

    it('应该处理批量事件的性能', async () => {
      const largeEventSet = createMockEvents(100); // 大量事件
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = createMockContext();

      const startTime = Date.now();
      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        largeEventSet,
        currentTraits,
        context
      );
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.processingTime).toBeLessThan(5000); // 5秒内完成
      expect(endTime - startTime).toBeLessThan(10000); // 10秒内完成
      
      // 验证事件被正确处理（可能被限制数量）
      expect(result.eventsProcessed).toBeGreaterThan(0);
      expect(result.eventsProcessed).toBeLessThanOrEqual(100);
    });

    it('应该处理年龄相关的演化差异', async () => {
      const events = createMockEvents(3);
      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };

      // 创建年轻宠物的上下文
      const youngPetContext: EvolutionContext = {
        pet: {
          id: 'young-pet',
          currentTraits: { ...DEFAULT_PERSONALITY_TRAITS },
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
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
      };

      // 创建成熟宠物的上下文
      const maturePetContext: EvolutionContext = {
        pet: {
          id: 'mature-pet',
          currentTraits: { ...DEFAULT_PERSONALITY_TRAITS },
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60天前
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
      };

      const youngResult = await engine.processPersonalityEvolution(
        'young-pet',
        'user-123',
        events,
        currentTraits,
        youngPetContext
      );

      const matureResult = await engine.processPersonalityEvolution(
        'mature-pet',
        'user-123',
        events,
        currentTraits,
        maturePetContext
      );

      expect(youngResult.success).toBe(true);
      expect(matureResult.success).toBe(true);

      // 年轻宠物应该有更大的变化幅度
      const youngChangeTotal = Object.values(youngResult.personalityAdjustment.traitChanges)
        .reduce((sum, change) => sum + Math.abs(change), 0);
      const matureChangeTotal = Object.values(matureResult.personalityAdjustment.traitChanges)
        .reduce((sum, change) => sum + Math.abs(change), 0);

      expect(youngChangeTotal).toBeGreaterThan(matureChangeTotal);
    });

    it('应该处理不同的互动模式组合', async () => {
      const events = createMockEvents(8);
      
      // 设置多样化的互动模式
      events[0].interactionMode = InteractionMode.NORMAL;
      events[1].interactionMode = InteractionMode.EXTENDED;
      events[2].interactionMode = InteractionMode.NORMAL;
      events[3].interactionMode = InteractionMode.EXTENDED;
      events[4].interactionMode = InteractionMode.NORMAL;
      events[5].interactionMode = InteractionMode.NORMAL;
      events[6].interactionMode = InteractionMode.EXTENDED;
      events[7].interactionMode = InteractionMode.NORMAL;

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
      expect(result.interactionPattern.modeDistribution[InteractionMode.NORMAL]).toBeGreaterThan(0);
      expect(result.interactionPattern.modeDistribution[InteractionMode.EXTENDED]).toBeGreaterThan(0);
      
      // 扩展模式应该影响外向性特质
      expect(Math.abs(result.personalityAdjustment.traitChanges[PersonalityTrait.EXTRAVERSION]))
        .toBeGreaterThan(0.001);
    });

    it('应该生成有意义的调整原因', async () => {
      const events = createMockEvents(5);
      
      // 设置主要为情感支持类型的互动
      events.forEach(event => {
        event.interactionType = InteractionType.EMOTIONAL_SUPPORT;
        event.engagementLevel = EngagementLevel.HIGH;
      });

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
      expect(result.personalityAdjustment.reason).toContain('情感支持');
      expect(result.personalityAdjustment.reason).toContain('高');
      expect(result.personalityAdjustment.reason).toContain('5');
    });
  });

  describe('错误处理和边界条件', () => {
    it('应该处理无效的事件数据', async () => {
      const invalidEvents = [
        {
          id: 'invalid-event',
          userId: 'user-123',
          petId: 'pet-456',
          timestamp: null as any, // 无效的时间戳
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
            topicTags: ['greeting'],
            moodIndicators: ['neutral'],
            skillsUsed: ['conversation'],
            contextSwitches: 0,
            userInitiated: true,
            feedbackGiven: false,
            specialEvents: [],
          },
        },
      ];

      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = {
        pet: {
          id: 'pet-456',
          currentTraits: { ...DEFAULT_PERSONALITY_TRAITS },
          createdAt: new Date(),
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
      };

      const result = await engine.processPersonalityEvolution(
        'pet-456',
        'user-123',
        invalidEvents,
        currentTraits,
        context
      );

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(0); // 无效事件被过滤
    });

    it('应该处理空的用户上下文', async () => {
      const events = [
        {
          id: 'event-1',
          userId: '',
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
            topicTags: ['greeting'],
            moodIndicators: ['neutral'],
            skillsUsed: ['conversation'],
            contextSwitches: 0,
            userInitiated: true,
            feedbackGiven: false,
            specialEvents: [],
          },
        },
      ];

      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = {
        pet: {
          id: 'pet-456',
          currentTraits: { ...DEFAULT_PERSONALITY_TRAITS },
          createdAt: new Date(),
          lastEvolutionAt: new Date(),
        },
        user: {
          id: '',
          interactionHistory: [],
          preferences: { style: '' },
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
      };

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

    it('应该处理极端的时间戳', async () => {
      const events = [
        {
          id: 'future-event',
          userId: 'user-123',
          petId: 'pet-456',
          timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000), // 未来事件
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
            topicTags: ['greeting'],
            moodIndicators: ['neutral'],
            skillsUsed: ['conversation'],
            contextSwitches: 0,
            userInitiated: true,
            feedbackGiven: false,
            specialEvents: [],
          },
        },
        {
          id: 'ancient-event',
          userId: 'user-123',
          petId: 'pet-456',
          timestamp: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 一年前
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
            topicTags: ['greeting'],
            moodIndicators: ['neutral'],
            skillsUsed: ['conversation'],
            contextSwitches: 0,
            userInitiated: true,
            feedbackGiven: false,
            specialEvents: [],
          },
        },
      ];

      const currentTraits = { ...DEFAULT_PERSONALITY_TRAITS };
      const context = {
        pet: {
          id: 'pet-456',
          currentTraits: { ...DEFAULT_PERSONALITY_TRAITS },
          createdAt: new Date(),
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
      };

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
  });
});