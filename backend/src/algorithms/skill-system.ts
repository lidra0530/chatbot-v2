import { Logger } from '@nestjs/common';

/**
 * 步骤160-163: 技能树系统核心算法引擎
 * 负责技能解锁条件检查、经验值计算、等级提升算法
 */

// 技能类型定义
export enum SkillType {
  COMMUNICATION = 'communication',
  LEARNING = 'learning', 
  CREATIVITY = 'creativity',
  EXPLORATION = 'exploration',
  EMOTIONAL = 'emotional',
  SOCIAL = 'social',
  PHYSICAL = 'physical',
  COGNITIVE = 'cognitive'
}

// 技能稀有度
export enum SkillRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon', 
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

// 技能状态
export enum SkillStatus {
  LOCKED = 'locked',
  AVAILABLE = 'available',
  UNLOCKED = 'unlocked',
  MASTERED = 'mastered'
}

// 解锁条件类型
export enum UnlockConditionType {
  LEVEL = 'level',
  SKILL_PREREQUISITE = 'skill_prerequisite',
  INTERACTION_COUNT = 'interaction_count',
  STAT_THRESHOLD = 'stat_threshold',
  TIME_BASED = 'time_based',
  ACHIEVEMENT = 'achievement',
  PERSONALITY_TRAIT = 'personality_trait',
  COMBINED = 'combined'
}

// 基础接口定义
export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  rarity: SkillRarity;
  maxLevel: number;
  unlockConditions: UnlockCondition[];
  effects: SkillEffect[];
  experienceMultiplier: number;
  icon?: string;
  category: string;
}

export interface UnlockCondition {
  type: UnlockConditionType;
  requirements: Record<string, any>;
  description: string;
}

export interface SkillEffect {
  type: string;
  target: string;
  modifier: number;
  duration?: number;
  conditions?: Record<string, any>;
}

export interface PetSkillProgress {
  skillId: string;
  level: number;
  experience: number;
  experienceRequired: number;
  status: SkillStatus;
  unlockedAt?: Date;
  lastUsed?: Date;
  usageCount: number;
  masteryProgress: number;
}

export interface SkillUnlockResult {
  success: boolean;
  skillId: string;
  newSkills: string[];
  experience: number;
  message: string;
  effects: SkillEffect[];
}

export interface ExperienceGainResult {
  skillId: string;
  experienceGained: number;
  newLevel?: number;
  leveledUp: boolean;
  masteryAchieved: boolean;
  bonusEffects: SkillEffect[];
}

/**
 * 技能系统核心引擎
 */
export class SkillSystemEngine {
  private readonly logger = new Logger(SkillSystemEngine.name);

  constructor(
    private readonly skillDefinitions: Map<string, SkillDefinition>,
    private readonly config: any
  ) {
    this.logger.log('SkillSystemEngine initialized');
  }

  /**
   * 步骤162: 检查技能解锁条件
   */
  async evaluateUnlockConditions(
    skillId: string,
    petData: {
      level: number;
      skills: Map<string, PetSkillProgress>;
      stats: Record<string, number>;
      personality: Record<string, number>;
      interactionHistory: any[];
      achievements: string[];
      createdAt: Date;
    }
  ): Promise<{ canUnlock: boolean; failedConditions: string[]; progress: number }> {
    this.logger.debug(`Evaluating unlock conditions for skill: ${skillId}`);

    const skillDef = this.skillDefinitions.get(skillId);
    if (!skillDef) {
      return { canUnlock: false, failedConditions: ['Skill not found'], progress: 0 };
    }

    const failedConditions: string[] = [];
    let totalConditions = skillDef.unlockConditions.length;
    let metConditions = 0;

    for (const condition of skillDef.unlockConditions) {
      const result = await this.checkSingleCondition(condition, petData);
      if (result.met) {
        metConditions++;
      } else {
        failedConditions.push(result.description);
      }
    }

    const progress = totalConditions > 0 ? metConditions / totalConditions : 0;
    const canUnlock = failedConditions.length === 0;

    this.logger.debug(`Skill ${skillId} unlock evaluation: ${metConditions}/${totalConditions} conditions met`);

    return { canUnlock, failedConditions, progress };
  }

  /**
   * 检查单个解锁条件
   */
  private async checkSingleCondition(
    condition: UnlockCondition,
    petData: any
  ): Promise<{ met: boolean; description: string; progress?: number }> {
    switch (condition.type) {
      case UnlockConditionType.LEVEL:
        const requiredLevel = condition.requirements.level;
        const met = petData.level >= requiredLevel;
        return {
          met,
          description: `需要宠物等级 ${requiredLevel} (当前: ${petData.level})`,
          progress: Math.min(petData.level / requiredLevel, 1)
        };

      case UnlockConditionType.SKILL_PREREQUISITE:
        const prerequisiteSkill = condition.requirements.skillId;
        const requiredSkillLevel = condition.requirements.level || 1;
        const skillProgress = petData.skills.get(prerequisiteSkill);
        const hasSkill = skillProgress && 
          skillProgress.status === SkillStatus.UNLOCKED && 
          skillProgress.level >= requiredSkillLevel;
        
        return {
          met: !!hasSkill,
          description: `需要技能 ${prerequisiteSkill} 达到等级 ${requiredSkillLevel}`,
          progress: skillProgress ? Math.min(skillProgress.level / requiredSkillLevel, 1) : 0
        };

      case UnlockConditionType.INTERACTION_COUNT:
        const requiredInteractions = condition.requirements.count;
        const interactionType = condition.requirements.type;
        const relevantInteractions = interactionType 
          ? petData.interactionHistory.filter((i: any) => i.type === interactionType)
          : petData.interactionHistory;
        
        return {
          met: relevantInteractions.length >= requiredInteractions,
          description: `需要 ${requiredInteractions} 次${interactionType ? ` ${interactionType}` : ''} 互动`,
          progress: Math.min(relevantInteractions.length / requiredInteractions, 1)
        };

      case UnlockConditionType.STAT_THRESHOLD:
        const statName = condition.requirements.stat;
        const threshold = condition.requirements.value;
        const currentValue = petData.stats[statName] || 0;
        
        return {
          met: currentValue >= threshold,
          description: `需要 ${statName} 达到 ${threshold} (当前: ${currentValue})`,
          progress: Math.min(currentValue / threshold, 1)
        };

      case UnlockConditionType.PERSONALITY_TRAIT:
        const traitName = condition.requirements.trait;
        const traitThreshold = condition.requirements.value;
        const traitValue = petData.personality[traitName] || 0;
        
        return {
          met: traitValue >= traitThreshold,
          description: `需要性格特质 ${traitName} 达到 ${traitThreshold}`,
          progress: Math.min(traitValue / traitThreshold, 1)
        };

      case UnlockConditionType.TIME_BASED:
        const requiredDays = condition.requirements.days;
        const daysSinceCreation = Math.floor(
          (Date.now() - petData.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return {
          met: daysSinceCreation >= requiredDays,
          description: `需要饲养 ${requiredDays} 天 (当前: ${daysSinceCreation} 天)`,
          progress: Math.min(daysSinceCreation / requiredDays, 1)
        };

      case UnlockConditionType.ACHIEVEMENT:
        const requiredAchievement = condition.requirements.achievementId;
        const hasAchievement = petData.achievements.includes(requiredAchievement);
        
        return {
          met: hasAchievement,
          description: `需要获得成就: ${requiredAchievement}`,
          progress: hasAchievement ? 1 : 0
        };

      case UnlockConditionType.COMBINED:
        const subconditions = condition.requirements.conditions || [];
        const mode = condition.requirements.mode || 'all'; // 'all' or 'any'
        let metCount = 0;
        
        for (const subcondition of subconditions) {
          const result = await this.checkSingleCondition(subcondition, petData);
          if (result.met) metCount++;
        }
        
        const isMetCombined = mode === 'all' 
          ? metCount === subconditions.length
          : metCount > 0;
        
        return {
          met: isMetCombined,
          description: `组合条件: ${metCount}/${subconditions.length} 满足 (模式: ${mode})`,
          progress: subconditions.length > 0 ? metCount / subconditions.length : 0
        };

      default:
        this.logger.warn(`Unknown unlock condition type: ${condition.type}`);
        return {
          met: false,
          description: `未知条件类型: ${condition.type}`
        };
    }
  }

  /**
   * 步骤163: 计算经验值和等级提升
   */
  calculateExperienceGain(
    skillId: string,
    interactionType: string,
    intensity: number,
    duration: number,
    contextFactors: Record<string, any> = {}
  ): number {
    this.logger.debug(`Calculating experience gain for skill: ${skillId}`);

    const skillDef = this.skillDefinitions.get(skillId);
    if (!skillDef) {
      this.logger.warn(`Skill definition not found: ${skillId}`);
      return 0;
    }

    // 基础经验值计算
    let baseExperience = this.config.BASE_EXPERIENCE_RATES[interactionType] || 10;
    
    // 技能类型加成
    const typeMultiplier = this.getSkillTypeMultiplier(skillDef.type, interactionType);
    
    // 强度加成 (1-10 -> 0.5-2.0)
    const intensityMultiplier = 0.5 + (intensity - 1) * (1.5 / 9);
    
    // 持续时间加成 (分钟数，最大120分钟)
    const durationMultiplier = Math.min(1 + (duration / 60) * 0.5, 2.0);
    
    // 稀有度加成
    const rarityMultiplier = this.getRarityMultiplier(skillDef.rarity);
    
    // 技能固有倍数
    const skillMultiplier = skillDef.experienceMultiplier;
    
    // 上下文加成
    const contextMultiplier = this.calculateContextMultiplier(contextFactors);
    
    // 最终经验值计算
    const finalExperience = Math.round(
      baseExperience * 
      typeMultiplier * 
      intensityMultiplier * 
      durationMultiplier * 
      rarityMultiplier * 
      skillMultiplier * 
      contextMultiplier
    );

    this.logger.debug(`Experience calculation for ${skillId}: base=${baseExperience}, final=${finalExperience}`);
    
    return Math.max(1, finalExperience); // 最少1点经验
  }

  /**
   * 处理技能经验获得和升级
   */
  async processSkillExperienceGain(
    skillProgress: PetSkillProgress,
    experienceGained: number
  ): Promise<ExperienceGainResult> {
    skillProgress.experience += experienceGained;
    skillProgress.usageCount++;
    skillProgress.lastUsed = new Date();

    let leveledUp = false;
    let newLevel: number | undefined;
    let masteryAchieved = false;
    const bonusEffects: SkillEffect[] = [];

    // 检查是否升级
    while (skillProgress.experience >= skillProgress.experienceRequired) {
      const skillDef = this.skillDefinitions.get(skillProgress.skillId);
      if (!skillDef || skillProgress.level >= skillDef.maxLevel) {
        break;
      }

      skillProgress.experience -= skillProgress.experienceRequired;
      skillProgress.level++;
      leveledUp = true;
      newLevel = skillProgress.level;

      // 重新计算下一级所需经验
      skillProgress.experienceRequired = this.calculateRequiredExperience(
        skillProgress.skillId,
        skillProgress.level
      );

      // 检查是否达到精通
      if (skillProgress.level >= skillDef.maxLevel) {
        skillProgress.status = SkillStatus.MASTERED;
        masteryAchieved = true;
        
        // 精通奖励效果
        bonusEffects.push(...this.getMasteryBonusEffects(skillProgress.skillId));
      }

      this.logger.log(`Skill ${skillProgress.skillId} leveled up to ${skillProgress.level}`);
    }

    // 更新精通进度
    const skillDef = this.skillDefinitions.get(skillProgress.skillId);
    if (skillDef) {
      skillProgress.masteryProgress = Math.min(
        skillProgress.level / skillDef.maxLevel,
        1.0
      );
    }

    return {
      skillId: skillProgress.skillId,
      experienceGained,
      newLevel,
      leveledUp,
      masteryAchieved,
      bonusEffects
    };
  }

  /**
   * 计算下一级所需经验值
   */
  calculateRequiredExperience(skillId: string, currentLevel: number): number {
    const skillDef = this.skillDefinitions.get(skillId);
    if (!skillDef) return 100;

    // 基础经验值 * 等级系数 * 稀有度系数
    const baseRequirement = this.config.BASE_LEVEL_EXPERIENCE || 100;
    const levelMultiplier = Math.pow(1.5, currentLevel - 1); // 指数增长
    const rarityMultiplier = this.getRarityExperienceMultiplier(skillDef.rarity);

    return Math.round(baseRequirement * levelMultiplier * rarityMultiplier);
  }

  /**
   * 获取技能类型对特定交互的倍数加成
   */
  private getSkillTypeMultiplier(skillType: SkillType, interactionType: string): number {
    const typeMap: Record<SkillType, string[]> = {
      [SkillType.COMMUNICATION]: ['conversation', 'chat', 'dialogue'],
      [SkillType.LEARNING]: ['learning', 'study', 'education', 'training'],
      [SkillType.CREATIVITY]: ['creative', 'art', 'imagination', 'creation'],
      [SkillType.EXPLORATION]: ['exploration', 'adventure', 'discovery'],
      [SkillType.EMOTIONAL]: ['emotional', 'empathy', 'feeling', 'mood'],
      [SkillType.SOCIAL]: ['social', 'friendship', 'community', 'group'],
      [SkillType.PHYSICAL]: ['physical', 'exercise', 'movement', 'activity'],
      [SkillType.COGNITIVE]: ['cognitive', 'thinking', 'problem', 'analysis']
    };

    const relevantTypes = typeMap[skillType] || [];
    const isRelevant = relevantTypes.some(type => 
      interactionType.toLowerCase().includes(type)
    );

    return isRelevant ? 1.5 : 1.0;
  }

  /**
   * 获取稀有度经验倍数
   */
  private getRarityMultiplier(rarity: SkillRarity): number {
    const multipliers = {
      [SkillRarity.COMMON]: 1.0,
      [SkillRarity.UNCOMMON]: 1.2,
      [SkillRarity.RARE]: 1.5,
      [SkillRarity.EPIC]: 2.0,
      [SkillRarity.LEGENDARY]: 3.0
    };
    return multipliers[rarity] || 1.0;
  }

  /**
   * 获取稀有度经验需求倍数
   */
  private getRarityExperienceMultiplier(rarity: SkillRarity): number {
    const multipliers = {
      [SkillRarity.COMMON]: 1.0,
      [SkillRarity.UNCOMMON]: 1.3,
      [SkillRarity.RARE]: 1.8,
      [SkillRarity.EPIC]: 2.5,
      [SkillRarity.LEGENDARY]: 4.0
    };
    return multipliers[rarity] || 1.0;
  }

  /**
   * 计算上下文因子加成
   */
  private calculateContextMultiplier(contextFactors: Record<string, any>): number {
    let multiplier = 1.0;

    // 连续使用奖励 (最多50%加成)
    if (contextFactors.consecutiveUse) {
      multiplier += Math.min(contextFactors.consecutiveUse * 0.1, 0.5);
    }

    // 完美表现奖励
    if (contextFactors.perfectPerformance) {
      multiplier += 0.3;
    }

    // 首次使用奖励
    if (contextFactors.firstTime) {
      multiplier += 0.2;
    }

    // 组队奖励
    if (contextFactors.groupActivity) {
      multiplier += 0.15;
    }

    return Math.min(multiplier, 3.0); // 最大3倍加成
  }

  /**
   * 获取精通奖励效果
   */
  private getMasteryBonusEffects(skillId: string): SkillEffect[] {
    const skillDef = this.skillDefinitions.get(skillId);
    if (!skillDef) return [];

    return [
      {
        type: 'mastery_bonus',
        target: 'all_stats',
        modifier: 5,
        duration: -1 // 永久效果
      },
      ...skillDef.effects.map(effect => ({
        ...effect,
        modifier: effect.modifier * 1.5 // 精通后效果增强50%
      }))
    ];
  }

  /**
   * 获取所有可解锁的技能
   */
  async getAvailableSkills(petData: any): Promise<{
    unlockable: string[];
    progress: Map<string, number>;
  }> {
    const unlockable: string[] = [];
    const progress = new Map<string, number>();

    for (const [skillId, _skillDef] of this.skillDefinitions) {
      const currentProgress = petData.skills.get(skillId);
      
      // 跳过已解锁的技能
      if (currentProgress?.status === SkillStatus.UNLOCKED || 
          currentProgress?.status === SkillStatus.MASTERED) {
        continue;
      }

      const evaluation = await this.evaluateUnlockConditions(skillId, petData);
      progress.set(skillId, evaluation.progress);

      if (evaluation.canUnlock) {
        unlockable.push(skillId);
      }
    }

    return { unlockable, progress };
  }

  /**
   * 解锁技能
   */
  async unlockSkill(skillId: string, petData: any): Promise<SkillUnlockResult> {
    const evaluation = await this.evaluateUnlockConditions(skillId, petData);
    
    if (!evaluation.canUnlock) {
      return {
        success: false,
        skillId,
        newSkills: [],
        experience: 0,
        message: `技能解锁失败: ${evaluation.failedConditions.join(', ')}`,
        effects: []
      };
    }

    const skillDef = this.skillDefinitions.get(skillId);
    if (!skillDef) {
      return {
        success: false,
        skillId,
        newSkills: [],
        experience: 0,
        message: '技能定义未找到',
        effects: []
      };
    }

    // 创建技能进度
    const skillProgress: PetSkillProgress = {
      skillId,
      level: 1,
      experience: 0,
      experienceRequired: this.calculateRequiredExperience(skillId, 1),
      status: SkillStatus.UNLOCKED,
      unlockedAt: new Date(),
      usageCount: 0,
      masteryProgress: 0
    };

    petData.skills.set(skillId, skillProgress);

    // 检查是否有新技能可以解锁
    const availableResult = await this.getAvailableSkills(petData);
    const newUnlockableSkills = availableResult.unlockable.filter(id => id !== skillId);

    this.logger.log(`Skill ${skillId} successfully unlocked for pet`);

    return {
      success: true,
      skillId,
      newSkills: newUnlockableSkills,
      experience: 50, // 解锁奖励经验
      message: `成功解锁技能: ${skillDef.name}`,
      effects: skillDef.effects
    };
  }
}