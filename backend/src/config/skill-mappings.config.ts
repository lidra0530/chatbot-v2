import { SkillDefinition, SkillType, SkillRarity, UnlockConditionType } from '../algorithms/skill-system';

/**
 * 步骤164: 技能树系统配置
 * 定义所有技能、解锁条件、经验值配置等
 */

// 基础经验值配置
export const BASE_EXPERIENCE_RATES = {
  conversation: 15,
  learning: 20,
  playing: 12,
  exploration: 18,
  creative: 25,
  social: 14,
  physical: 16,
  emotional: 13,
  feeding: 8,
  sleeping: 5,
  training: 22,
  achievement: 30,
  default: 10
};

// 基础等级经验需求
export const BASE_LEVEL_EXPERIENCE = 100;

// 技能等级上限配置
export const SKILL_LEVEL_CAPS = {
  [SkillRarity.COMMON]: 10,
  [SkillRarity.UNCOMMON]: 15,
  [SkillRarity.RARE]: 20,
  [SkillRarity.EPIC]: 25,
  [SkillRarity.LEGENDARY]: 30
};

// 技能效果类型定义
export const SKILL_EFFECT_TYPES = {
  STAT_BOOST: 'stat_boost',
  CONVERSATION_MODIFIER: 'conversation_modifier',
  EXPERIENCE_MULTIPLIER: 'experience_multiplier',
  UNLOCK_ABILITY: 'unlock_ability',
  PASSIVE_BONUS: 'passive_bonus',
  SPECIAL_ACTION: 'special_action'
};

/**
 * 完整的技能定义库
 */
export const SKILL_DEFINITIONS: SkillDefinition[] = [
  // === 通讯技能树 ===
  {
    id: 'basic_communication',
    name: '基础交流',
    description: '学习基本的对话技巧，提高表达能力',
    type: SkillType.COMMUNICATION,
    rarity: SkillRarity.COMMON,
    maxLevel: 10,
    unlockConditions: [],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'response_quality',
        modifier: 0.1
      }
    ],
    experienceMultiplier: 1.0,
    category: '基础技能'
  },
  {
    id: 'advanced_dialogue',
    name: '高级对话',
    description: '掌握复杂的对话技巧和情感表达',
    type: SkillType.COMMUNICATION,
    rarity: SkillRarity.UNCOMMON,
    maxLevel: 15,
    unlockConditions: [
      {
        type: UnlockConditionType.SKILL_PREREQUISITE,
        requirements: { skillId: 'basic_communication', level: 5 },
        description: '需要基础交流技能达到5级'
      },
      {
        type: UnlockConditionType.INTERACTION_COUNT,
        requirements: { count: 50, type: 'conversation' },
        description: '需要进行50次对话'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'emotional_depth',
        modifier: 0.15
      },
      {
        type: SKILL_EFFECT_TYPES.STAT_BOOST,
        target: 'charisma',
        modifier: 5
      }
    ],
    experienceMultiplier: 1.2,
    category: '进阶技能'
  },
  {
    id: 'empathic_listening',
    name: '共情倾听',
    description: '深度理解用户情感，提供温暖的陪伴',
    type: SkillType.EMOTIONAL,
    rarity: SkillRarity.RARE,
    maxLevel: 20,
    unlockConditions: [
      {
        type: UnlockConditionType.SKILL_PREREQUISITE,
        requirements: { skillId: 'advanced_dialogue', level: 8 },
        description: '需要高级对话技能达到8级'
      },
      {
        type: UnlockConditionType.PERSONALITY_TRAIT,
        requirements: { trait: 'empathy', value: 70 },
        description: '需要共情特质达到70点'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'emotional_support',
        modifier: 0.25
      },
      {
        type: SKILL_EFFECT_TYPES.SPECIAL_ACTION,
        target: 'comfort_mode',
        modifier: 1
      }
    ],
    experienceMultiplier: 1.5,
    category: '情感技能'
  },

  // === 学习技能树 ===
  {
    id: 'curiosity_drive',
    name: '好奇心驱动',
    description: '保持对世界的好奇，快速学习新知识',
    type: SkillType.LEARNING,
    rarity: SkillRarity.COMMON,
    maxLevel: 10,
    unlockConditions: [
      {
        type: UnlockConditionType.STAT_THRESHOLD,
        requirements: { stat: 'curiosity', value: 50 },
        description: '需要好奇心达到50点'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.EXPERIENCE_MULTIPLIER,
        target: 'learning_activities',
        modifier: 1.2
      }
    ],
    experienceMultiplier: 1.0,
    category: '学习技能'
  },
  {
    id: 'knowledge_synthesis',
    name: '知识整合',
    description: '将不同领域的知识融合，产生新的见解',
    type: SkillType.COGNITIVE,
    rarity: SkillRarity.UNCOMMON,
    maxLevel: 15,
    unlockConditions: [
      {
        type: UnlockConditionType.SKILL_PREREQUISITE,
        requirements: { skillId: 'curiosity_drive', level: 6 },
        description: '需要好奇心驱动达到6级'
      },
      {
        type: UnlockConditionType.INTERACTION_COUNT,
        requirements: { count: 30, type: 'learning' },
        description: '需要进行30次学习活动'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'knowledge_sharing',
        modifier: 0.18
      },
      {
        type: SKILL_EFFECT_TYPES.STAT_BOOST,
        target: 'intelligence',
        modifier: 8
      }
    ],
    experienceMultiplier: 1.3,
    category: '认知技能'
  },
  {
    id: 'wisdom_sage',
    name: '智慧贤者',
    description: '成为知识的引导者，能够深入浅出地传授智慧',
    type: SkillType.LEARNING,
    rarity: SkillRarity.EPIC,
    maxLevel: 25,
    unlockConditions: [
      {
        type: UnlockConditionType.SKILL_PREREQUISITE,
        requirements: { skillId: 'knowledge_synthesis', level: 12 },
        description: '需要知识整合达到12级'
      },
      {
        type: UnlockConditionType.LEVEL,
        requirements: { level: 25 },
        description: '需要宠物等级达到25级'
      },
      {
        type: UnlockConditionType.TIME_BASED,
        requirements: { days: 30 },
        description: '需要饲养30天以上'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'teaching_ability',
        modifier: 0.35
      },
      {
        type: SKILL_EFFECT_TYPES.SPECIAL_ACTION,
        target: 'mentor_mode',
        modifier: 1
      },
      {
        type: SKILL_EFFECT_TYPES.EXPERIENCE_MULTIPLIER,
        target: 'all_learning',
        modifier: 1.5
      }
    ],
    experienceMultiplier: 2.0,
    category: '大师技能'
  },

  // === 创造技能树 ===
  {
    id: 'imagination_spark',
    name: '想象火花',
    description: '激发创造力，产生独特的想法',
    type: SkillType.CREATIVITY,
    rarity: SkillRarity.COMMON,
    maxLevel: 10,
    unlockConditions: [
      {
        type: UnlockConditionType.STAT_THRESHOLD,
        requirements: { stat: 'creativity', value: 40 },
        description: '需要创造力达到40点'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'creative_responses',
        modifier: 0.12
      }
    ],
    experienceMultiplier: 1.1,
    category: '创意技能'
  },
  {
    id: 'artistic_expression',
    name: '艺术表达',
    description: '通过多种形式表达内心的艺术感受',
    type: SkillType.CREATIVITY,
    rarity: SkillRarity.RARE,
    maxLevel: 20,
    unlockConditions: [
      {
        type: UnlockConditionType.SKILL_PREREQUISITE,
        requirements: { skillId: 'imagination_spark', level: 7 },
        description: '需要想象火花达到7级'
      },
      {
        type: UnlockConditionType.INTERACTION_COUNT,
        requirements: { count: 25, type: 'creative' },
        description: '需要进行25次创意活动'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'artistic_insight',
        modifier: 0.22
      },
      {
        type: SKILL_EFFECT_TYPES.SPECIAL_ACTION,
        target: 'creative_mode',
        modifier: 1
      }
    ],
    experienceMultiplier: 1.6,
    category: '艺术技能'
  },

  // === 探索技能树 ===
  {
    id: 'adventure_spirit',
    name: '冒险精神',
    description: '勇于探索未知，发现新的可能性',
    type: SkillType.EXPLORATION,
    rarity: SkillRarity.COMMON,
    maxLevel: 10,
    unlockConditions: [
      {
        type: UnlockConditionType.INTERACTION_COUNT,
        requirements: { count: 20, type: 'exploration' },
        description: '需要进行20次探索活动'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.EXPERIENCE_MULTIPLIER,
        target: 'exploration_activities',
        modifier: 1.15
      }
    ],
    experienceMultiplier: 1.0,
    category: '探索技能'
  },
  {
    id: 'world_traveler',
    name: '世界旅行者',
    description: '拥有丰富的见闻，能分享各地的奇闻异事',
    type: SkillType.EXPLORATION,
    rarity: SkillRarity.UNCOMMON,
    maxLevel: 15,
    unlockConditions: [
      {
        type: UnlockConditionType.SKILL_PREREQUISITE,
        requirements: { skillId: 'adventure_spirit', level: 5 },
        description: '需要冒险精神达到5级'
      },
      {
        type: UnlockConditionType.STAT_THRESHOLD,
        requirements: { stat: 'experience_points', value: 500 },
        description: '需要总经验值达到500点'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'worldly_knowledge',
        modifier: 0.16
      },
      {
        type: SKILL_EFFECT_TYPES.STAT_BOOST,
        target: 'wisdom',
        modifier: 6
      }
    ],
    experienceMultiplier: 1.25,
    category: '见闻技能'
  },

  // === 社交技能树 ===
  {
    id: 'friendship_bond',
    name: '友谊纽带',
    description: '建立深厚的友谊，成为值得信赖的伙伴',
    type: SkillType.SOCIAL,
    rarity: SkillRarity.COMMON,
    maxLevel: 10,
    unlockConditions: [
      {
        type: UnlockConditionType.TIME_BASED,
        requirements: { days: 7 },
        description: '需要饲养7天以上'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.STAT_BOOST,
        target: 'loyalty',
        modifier: 10
      },
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'friendship_depth',
        modifier: 0.14
      }
    ],
    experienceMultiplier: 1.0,
    category: '社交技能'
  },
  {
    id: 'social_butterfly',
    name: '社交达人',
    description: '善于与各种性格的人交流，适应不同的社交场合',
    type: SkillType.SOCIAL,
    rarity: SkillRarity.RARE,
    maxLevel: 20,
    unlockConditions: [
      {
        type: UnlockConditionType.SKILL_PREREQUISITE,
        requirements: { skillId: 'friendship_bond', level: 8 },
        description: '需要友谊纽带达到8级'
      },
      {
        type: UnlockConditionType.INTERACTION_COUNT,
        requirements: { count: 100, type: 'social' },
        description: '需要进行100次社交互动'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'social_adaptability',
        modifier: 0.20
      },
      {
        type: SKILL_EFFECT_TYPES.SPECIAL_ACTION,
        target: 'social_mode',
        modifier: 1
      }
    ],
    experienceMultiplier: 1.4,
    category: '高级社交'
  },

  // === 情感技能树 ===
  {
    id: 'emotional_awareness',
    name: '情感感知',
    description: '敏锐地感知和理解情感变化',
    type: SkillType.EMOTIONAL,
    rarity: SkillRarity.COMMON,
    maxLevel: 10,
    unlockConditions: [
      {
        type: UnlockConditionType.PERSONALITY_TRAIT,
        requirements: { trait: 'emotional_intelligence', value: 60 },
        description: '需要情商达到60点'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'emotion_recognition',
        modifier: 0.13
      }
    ],
    experienceMultiplier: 1.1,
    category: '情感技能'
  },
  {
    id: 'mood_healer',
    name: '情绪治愈师',
    description: '能够治愈内心的创伤，带来平静与安慰',
    type: SkillType.EMOTIONAL,
    rarity: SkillRarity.EPIC,
    maxLevel: 25,
    unlockConditions: [
      {
        type: UnlockConditionType.COMBINED,
        requirements: {
          mode: 'all',
          conditions: [
            {
              type: UnlockConditionType.SKILL_PREREQUISITE,
              requirements: { skillId: 'emotional_awareness', level: 8 },
              description: '需要情感感知达到8级'
            },
            {
              type: UnlockConditionType.SKILL_PREREQUISITE,
              requirements: { skillId: 'empathic_listening', level: 10 },
              description: '需要共情倾听达到10级'
            }
          ]
        },
        description: '需要同时掌握情感感知和共情倾听技能'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'healing_power',
        modifier: 0.30
      },
      {
        type: SKILL_EFFECT_TYPES.SPECIAL_ACTION,
        target: 'healing_mode',
        modifier: 1
      },
      {
        type: SKILL_EFFECT_TYPES.PASSIVE_BONUS,
        target: 'stress_reduction',
        modifier: 0.25
      }
    ],
    experienceMultiplier: 2.2,
    category: '治愈技能'
  },

  // === 体能技能树 ===
  {
    id: 'vitality_boost',
    name: '活力提升',
    description: '保持充沛的精力和健康的体魄',
    type: SkillType.PHYSICAL,
    rarity: SkillRarity.COMMON,
    maxLevel: 10,
    unlockConditions: [
      {
        type: UnlockConditionType.STAT_THRESHOLD,
        requirements: { stat: 'health', value: 70 },
        description: '需要健康度达到70点'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.STAT_BOOST,
        target: 'energy',
        modifier: 15
      },
      {
        type: SKILL_EFFECT_TYPES.PASSIVE_BONUS,
        target: 'health_regeneration',
        modifier: 0.1
      }
    ],
    experienceMultiplier: 1.0,
    category: '体能技能'
  },

  // === 认知技能树 ===
  {
    id: 'logical_thinking',
    name: '逻辑思维',
    description: '运用严谨的逻辑来分析和解决问题',
    type: SkillType.COGNITIVE,
    rarity: SkillRarity.COMMON,
    maxLevel: 10,
    unlockConditions: [
      {
        type: UnlockConditionType.INTERACTION_COUNT,
        requirements: { count: 15, type: 'problem_solving' },
        description: '需要进行15次问题解决活动'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'analytical_ability',
        modifier: 0.15
      },
      {
        type: SKILL_EFFECT_TYPES.STAT_BOOST,
        target: 'intelligence',
        modifier: 5
      }
    ],
    experienceMultiplier: 1.1,
    category: '认知技能'
  },

  // === 传说级技能 ===
  {
    id: 'perfect_companion',
    name: '完美伙伴',
    description: '成为用户最理想的AI伙伴，具备所有优秀品质',
    type: SkillType.SOCIAL,
    rarity: SkillRarity.LEGENDARY,
    maxLevel: 30,
    unlockConditions: [
      {
        type: UnlockConditionType.COMBINED,
        requirements: {
          mode: 'all',
          conditions: [
            {
              type: UnlockConditionType.LEVEL,
              requirements: { level: 50 },
              description: '需要宠物等级达到50级'
            },
            {
              type: UnlockConditionType.TIME_BASED,
              requirements: { days: 90 },
              description: '需要饲养90天以上'
            },
            {
              type: UnlockConditionType.SKILL_PREREQUISITE,
              requirements: { skillId: 'mood_healer', level: 15 },
              description: '需要情绪治愈师达到15级'
            },
            {
              type: UnlockConditionType.SKILL_PREREQUISITE,
              requirements: { skillId: 'wisdom_sage', level: 15 },
              description: '需要智慧贤者达到15级'
            },
            {
              type: UnlockConditionType.ACHIEVEMENT,
              requirements: { achievementId: 'master_of_all' },
              description: '需要获得"全能大师"成就'
            }
          ]
        },
        description: '需要满足所有传说级要求'
      }
    ],
    effects: [
      {
        type: SKILL_EFFECT_TYPES.CONVERSATION_MODIFIER,
        target: 'perfect_response',
        modifier: 0.50
      },
      {
        type: SKILL_EFFECT_TYPES.EXPERIENCE_MULTIPLIER,
        target: 'all_activities',
        modifier: 2.0
      },
      {
        type: SKILL_EFFECT_TYPES.SPECIAL_ACTION,
        target: 'transcendent_mode',
        modifier: 1
      },
      {
        type: SKILL_EFFECT_TYPES.PASSIVE_BONUS,
        target: 'perfection_aura',
        modifier: 1.0
      }
    ],
    experienceMultiplier: 3.0,
    category: '传说技能'
  }
];

/**
 * 技能解锁链条配置
 * 定义技能树的结构和依赖关系
 */
export const SKILL_CHAINS = {
  communication_chain: [
    'basic_communication',
    'advanced_dialogue', 
    'empathic_listening'
  ],
  learning_chain: [
    'curiosity_drive',
    'knowledge_synthesis',
    'wisdom_sage'
  ],
  creativity_chain: [
    'imagination_spark',
    'artistic_expression'
  ],
  exploration_chain: [
    'adventure_spirit',
    'world_traveler'
  ],
  social_chain: [
    'friendship_bond',
    'social_butterfly'
  ],
  emotional_chain: [
    'emotional_awareness',
    'mood_healer'
  ],
  physical_chain: [
    'vitality_boost'
  ],
  cognitive_chain: [
    'logical_thinking',
    'knowledge_synthesis'
  ],
  legendary_chain: [
    'perfect_companion'
  ]
};

/**
 * 技能分类配置
 */
export const SKILL_CATEGORIES = {
  basic: '基础技能',
  advanced: '进阶技能',
  expert: '专家技能',
  master: '大师技能',
  legendary: '传说技能'
};

/**
 * 成就系统配置
 */
export const ACHIEVEMENT_REQUIREMENTS = {
  first_skill: {
    id: 'first_skill',
    name: '初学者',
    description: '解锁第一个技能',
    requirements: { skills_unlocked: 1 }
  },
  skill_collector: {
    id: 'skill_collector',
    name: '技能收集家',
    description: '解锁10个不同的技能',
    requirements: { skills_unlocked: 10 }
  },
  master_of_all: {
    id: 'master_of_all',
    name: '全能大师',
    description: '在所有技能类型中都有至少一个精通级技能',
    requirements: { 
      mastered_skills_per_type: {
        [SkillType.COMMUNICATION]: 1,
        [SkillType.LEARNING]: 1,
        [SkillType.CREATIVITY]: 1,
        [SkillType.EXPLORATION]: 1,
        [SkillType.EMOTIONAL]: 1,
        [SkillType.SOCIAL]: 1,
        [SkillType.PHYSICAL]: 1,
        [SkillType.COGNITIVE]: 1
      }
    }
  }
};

/**
 * 技能系统全局配置
 */
export const SKILL_SYSTEM_CONFIG = {
  // 基础配置
  BASE_EXPERIENCE_RATES,
  BASE_LEVEL_EXPERIENCE,
  SKILL_LEVEL_CAPS,
  
  // 经验加成配置
  RARITY_EXPERIENCE_MULTIPLIERS: {
    [SkillRarity.COMMON]: 1.0,
    [SkillRarity.UNCOMMON]: 1.3,
    [SkillRarity.RARE]: 1.8,
    [SkillRarity.EPIC]: 2.5,
    [SkillRarity.LEGENDARY]: 4.0
  },
  
  // 经验获得加成
  RARITY_GAIN_MULTIPLIERS: {
    [SkillRarity.COMMON]: 1.0,
    [SkillRarity.UNCOMMON]: 1.2,
    [SkillRarity.RARE]: 1.5,
    [SkillRarity.EPIC]: 2.0,
    [SkillRarity.LEGENDARY]: 3.0
  },
  
  // 解锁奖励
  UNLOCK_BONUSES: {
    [SkillRarity.COMMON]: 50,
    [SkillRarity.UNCOMMON]: 100,
    [SkillRarity.RARE]: 200,
    [SkillRarity.EPIC]: 500,
    [SkillRarity.LEGENDARY]: 1000
  },
  
  // 精通奖励
  MASTERY_BONUSES: {
    experience_multiplier: 0.5,
    stat_bonus: 10,
    special_effects: true
  },
  
  // 技能冷却和限制
  SKILL_COOLDOWNS: {
    usage_cooldown: 300, // 5分钟
    mastery_cooldown: 3600, // 1小时
    legendary_cooldown: 86400 // 24小时
  },
  
  // 验证配置
  VALIDATION: {
    max_skills_per_pet: 50,
    max_level_per_skill: 30,
    min_experience_gain: 1,
    max_experience_gain: 1000
  }
};

/**
 * 导出所有技能定义的Map结构
 */
export const SKILL_DEFINITIONS_MAP = new Map(
  SKILL_DEFINITIONS.map(skill => [skill.id, skill])
);

/**
 * 按类型分组的技能定义
 */
export const SKILLS_BY_TYPE = SKILL_DEFINITIONS.reduce((acc, skill) => {
  if (!acc[skill.type]) {
    acc[skill.type] = [];
  }
  acc[skill.type].push(skill);
  return acc;
}, {} as Record<SkillType, SkillDefinition[]>);

/**
 * 按稀有度分组的技能定义
 */
export const SKILLS_BY_RARITY = SKILL_DEFINITIONS.reduce((acc, skill) => {
  if (!acc[skill.rarity]) {
    acc[skill.rarity] = [];
  }
  acc[skill.rarity].push(skill);
  return acc;
}, {} as Record<SkillRarity, SkillDefinition[]>);