import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SkillSystemEngine, PetSkillProgress, SkillStatus } from '../../algorithms/skill-system';
import { SKILL_DEFINITIONS_MAP, SKILL_SYSTEM_CONFIG } from '../../config/skill-mappings.config';
import { SkillsPersistenceService } from './services/skills-persistence.service';
import { RealtimeEventsService } from '../../gateways/services/realtime-events.service';
import {
  SkillDto,
  SkillExperienceGainDto,
  SkillExperienceResultDto,
  SkillUnlockRequestDto,
  SkillUnlockResultDto,
  SkillUnlockEvaluationDto,
  AvailableSkillsDto,
  SkillStatisticsDto,
  SkillFilterDto,
  BulkSkillExperienceDto,
  CurrentAbilitiesDto,
  SkillAbilityDto,
  AutoExperienceConfigDto,
  ExperienceGrowthResultDto
} from './dto';

/**
 * 步骤169: 技能系统服务
 * 实现技能管理基础逻辑，集成算法引擎
 */
@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);
  private readonly skillEngine: SkillSystemEngine;

  constructor(
    private prisma: PrismaService,
    private persistenceService: SkillsPersistenceService,
    private realtimeEvents: RealtimeEventsService
  ) {
    this.skillEngine = new SkillSystemEngine(SKILL_DEFINITIONS_MAP, SKILL_SYSTEM_CONFIG);
    this.logger.log('SkillsService initialized with SkillSystemEngine, PersistenceService and RealtimeEventsService');
  }

  /**
   * 获取宠物的完整技能树
   */
  async getSkillTree(petId: string, filter?: SkillFilterDto): Promise<SkillDto[]> {
    this.logger.debug(`Getting skill tree for pet: ${petId}`);

    // 验证宠物存在
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: {
        user: true
      }
    });

    if (!pet) {
      throw new NotFoundException(`Pet with ID ${petId} not found`);
    }

    // 获取宠物技能进度数据
    const petSkillsMap = await this.getPetSkillsMap(petId);
    const petData = await this.buildPetDataForEngine(pet);

    const skillDtos: SkillDto[] = [];

    // 遍历所有技能定义
    for (const [skillId, skillDef] of SKILL_DEFINITIONS_MAP) {
      // 应用过滤器
      if (filter && !this.matchesFilter(skillDef, filter)) {
        continue;
      }

      const skillProgress = petSkillsMap.get(skillId);
      const unlockEvaluation = await this.skillEngine.evaluateUnlockConditions(skillId, petData);

      const skillDto: SkillDto = {
        definition: {
          id: skillDef.id,
          name: skillDef.name,
          description: skillDef.description,
          type: skillDef.type,
          rarity: skillDef.rarity,
          maxLevel: skillDef.maxLevel,
          unlockConditions: skillDef.unlockConditions,
          effects: skillDef.effects,
          experienceMultiplier: skillDef.experienceMultiplier,
          category: skillDef.category,
          icon: skillDef.icon
        },
        progress: skillProgress ? {
          skillId: skillProgress.skillId,
          level: skillProgress.level,
          experience: skillProgress.experience,
          experienceRequired: skillProgress.experienceRequired,
          status: skillProgress.status,
          unlockedAt: skillProgress.unlockedAt,
          lastUsed: skillProgress.lastUsed,
          usageCount: skillProgress.usageCount,
          masteryProgress: skillProgress.masteryProgress
        } : undefined,
        unlockProgress: unlockEvaluation.progress,
        canUnlock: unlockEvaluation.canUnlock,
        failedConditions: unlockEvaluation.failedConditions
      };

      skillDtos.push(skillDto);
    }

    return skillDtos;
  }

  /**
   * 获取可用技能（可解锁的技能）
   */
  async getAvailableSkills(petId: string): Promise<AvailableSkillsDto> {
    this.logger.debug(`Getting available skills for pet: ${petId}`);

    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { user: true }
    });

    if (!pet) {
      throw new NotFoundException(`Pet with ID ${petId} not found`);
    }

    const petData = await this.buildPetDataForEngine(pet);
    const availableResult = await this.skillEngine.getAvailableSkills(petData);

    // 按类型分组
    const skillsByType: Record<string, string[]> = {};
    for (const skillId of availableResult.unlockable) {
      const skillDef = SKILL_DEFINITIONS_MAP.get(skillId);
      if (skillDef) {
        if (!skillsByType[skillDef.type]) {
          skillsByType[skillDef.type] = [];
        }
        skillsByType[skillDef.type].push(skillId);
      }
    }

    // 简单的推荐算法：优先推荐基础技能和常见技能
    const recommendedSkills = availableResult.unlockable
      .filter(skillId => {
        const skillDef = SKILL_DEFINITIONS_MAP.get(skillId);
        return skillDef && (skillDef.rarity === 'common' || skillDef.category === '基础技能');
      })
      .slice(0, 3);

    return {
      petId,
      unlockableSkills: availableResult.unlockable,
      skillProgress: Object.fromEntries(availableResult.progress),
      recommendedSkills,
      skillsByType
    };
  }

  /**
   * 解锁技能
   */
  async unlockSkill(petId: string, request: SkillUnlockRequestDto): Promise<SkillUnlockResultDto> {
    this.logger.debug(`Unlocking skill ${request.skillId} for pet: ${petId}`);

    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { user: true }
    });

    if (!pet) {
      throw new NotFoundException(`Pet with ID ${petId} not found`);
    }

    const petData = await this.buildPetDataForEngine(pet);
    const result = await this.skillEngine.unlockSkill(request.skillId, petData);

    if (result.success) {
      // 保存到数据库
      const unlockedSkillProgress = petData.skills.get(request.skillId)!;
      await this.saveSkillProgress(petId, unlockedSkillProgress);
      
      // 步骤242: 在技能解锁时发送实时通知
      await this.sendSkillUnlockedEvent(petId, pet.userId, request.skillId, unlockedSkillProgress);
      
      this.logger.log(`Skill ${request.skillId} successfully unlocked for pet ${petId}`);
    }

    return result;
  }

  /**
   * 处理技能经验获得
   */
  async gainSkillExperience(
    petId: string,
    skillId: string,
    experienceConfig: SkillExperienceGainDto
  ): Promise<SkillExperienceResultDto> {
    this.logger.debug(`Processing experience gain for skill ${skillId}, pet: ${petId}`);

    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { user: true }
    });

    if (!pet) {
      throw new NotFoundException(`Pet with ID ${petId} not found`);
    }

    const petSkillsMap = await this.getPetSkillsMap(petId);
    const skillProgress = petSkillsMap.get(skillId);

    if (!skillProgress || skillProgress.status !== SkillStatus.UNLOCKED) {
      throw new BadRequestException(`Skill ${skillId} is not unlocked for this pet`);
    }

    // 计算经验值
    const experienceGained = this.skillEngine.calculateExperienceGain(
      skillId,
      experienceConfig.interactionType,
      experienceConfig.intensity,
      experienceConfig.duration,
      experienceConfig.contextFactors
    );

    // 处理经验获得和升级
    const result = await this.skillEngine.processSkillExperienceGain(skillProgress, experienceGained);

    // 保存更新后的进度
    await this.saveSkillProgress(petId, skillProgress);

    this.logger.debug(`Skill ${skillId} gained ${experienceGained} experience`);
    return result;
  }

  /**
   * 批量处理技能经验
   */
  async bulkGainExperience(request: BulkSkillExperienceDto): Promise<SkillExperienceResultDto[]> {
    this.logger.debug(`Processing bulk experience gain for pet: ${request.petId}`);

    const results: SkillExperienceResultDto[] = [];

    for (const skillId of request.skillIds) {
      try {
        const result = await this.gainSkillExperience(request.petId, skillId, request.experienceConfig);
        results.push(result);
      } catch (error) {
        this.logger.warn(`Failed to process experience for skill ${skillId}:`, error);
        // 继续处理其他技能
      }
    }

    return results;
  }

  /**
   * 评估技能解锁条件
   */
  async evaluateSkillUnlock(petId: string, skillId: string): Promise<SkillUnlockEvaluationDto> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { user: true }
    });

    if (!pet) {
      throw new NotFoundException(`Pet with ID ${petId} not found`);
    }

    const skillDef = SKILL_DEFINITIONS_MAP.get(skillId);
    if (!skillDef) {
      throw new NotFoundException(`Skill ${skillId} not found`);
    }

    const petData = await this.buildPetDataForEngine(pet);
    const evaluation = await this.skillEngine.evaluateUnlockConditions(skillId, petData);

    return {
      skillId,
      skillName: skillDef.name,
      canUnlock: evaluation.canUnlock,
      conditions: skillDef.unlockConditions.map(condition => ({
        type: condition.type,
        requirements: condition.requirements,
        description: condition.description,
        isMet: !evaluation.failedConditions.includes(condition.description),
        progress: evaluation.progress
      })),
      overallProgress: evaluation.progress,
      failedConditions: evaluation.failedConditions,
      estimatedUnlockTime: this.estimateUnlockTime(evaluation.failedConditions)
    };
  }

  /**
   * 获取技能统计信息
   */
  async getSkillStatistics(petId: string): Promise<SkillStatisticsDto> {
    const petSkillsMap = await this.getPetSkillsMap(petId);
    const allSkills = Array.from(SKILL_DEFINITIONS_MAP.values());

    const statistics: SkillStatisticsDto = {
      petId,
      totalSkills: allSkills.length,
      unlockedSkills: 0,
      masteredSkills: 0,
      totalExperience: 0,
      skillsByType: {} as any,
      completionRate: 0,
      recentlyActiveSkills: [],
      recommendedSkills: []
    };

    // 初始化各类型统计
    const skillTypes = [...new Set(allSkills.map(s => s.type))];
    for (const type of skillTypes) {
      statistics.skillsByType[type] = {
        total: allSkills.filter(s => s.type === type).length,
        unlocked: 0,
        mastered: 0,
        averageLevel: 0
      };
    }

    // 计算统计数据
    for (const [skillId, progress] of petSkillsMap) {
      const skillDef = SKILL_DEFINITIONS_MAP.get(skillId);
      if (!skillDef) continue;

      if (progress.status === SkillStatus.UNLOCKED || progress.status === SkillStatus.MASTERED) {
        statistics.unlockedSkills++;
        statistics.skillsByType[skillDef.type].unlocked++;
        statistics.totalExperience += progress.experience;

        if (progress.status === SkillStatus.MASTERED) {
          statistics.masteredSkills++;
          statistics.skillsByType[skillDef.type].mastered++;
        }
      }
    }

    // 计算平均等级和完成度
    for (const type of skillTypes) {
      const typeStats = statistics.skillsByType[type];
      if (typeStats.unlocked > 0) {
        const typeLevels = Array.from(petSkillsMap.values())
          .filter(p => {
            const def = SKILL_DEFINITIONS_MAP.get(p.skillId);
            return def && def.type === type && (p.status === SkillStatus.UNLOCKED || p.status === SkillStatus.MASTERED);
          })
          .map(p => p.level);
        
        typeStats.averageLevel = typeLevels.reduce((sum, level) => sum + level, 0) / typeLevels.length;
      }
    }

    statistics.completionRate = statistics.unlockedSkills / statistics.totalSkills;

    // 获取最近活跃技能
    const recentlyActive = Array.from(petSkillsMap.values())
      .filter(p => p.lastUsed && (p.status === SkillStatus.UNLOCKED || p.status === SkillStatus.MASTERED))
      .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))
      .slice(0, 5)
      .map(p => p.skillId);

    statistics.recentlyActiveSkills = recentlyActive;

    return statistics;
  }

  /**
   * 步骤177: 获取当前能力
   */
  async getCurrentAbilities(petId: string): Promise<CurrentAbilitiesDto> {
    this.logger.debug(`Getting current abilities for pet: ${petId}`);

    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { user: true }
    });

    if (!pet) {
      throw new NotFoundException(`Pet with ID ${petId} not found`);
    }

    const petSkillsMap = await this.getPetSkillsMap(petId);
    const activeAbilities: SkillAbilityDto[] = [];
    const passiveAbilities: SkillAbilityDto[] = [];
    const specialAbilities: SkillAbilityDto[] = [];

    let totalPowerScore = 0;
    const abilitiesByType: Record<string, number> = {};

    // 遍历已解锁的技能，提取能力
    for (const [skillId, progress] of petSkillsMap) {
      if (progress.status !== SkillStatus.UNLOCKED && progress.status !== SkillStatus.MASTERED) {
        continue;
      }

      const skillDef = SKILL_DEFINITIONS_MAP.get(skillId);
      if (!skillDef) continue;

      // 从技能效果中提取能力
      for (const effect of skillDef.effects) {
        const ability: SkillAbilityDto = {
          id: `${skillId}_${effect.type}`,
          name: `${skillDef.name} - ${effect.type}`,
          description: `${skillDef.description} (${effect.target})`,
          level: progress.level,
          sourceSkillId: skillId,
          effectValue: effect.modifier * progress.level, // 等级影响效果值
          isActive: effect.type === 'active',
          cooldownSeconds: effect.duration,
          usageLimit: undefined,
          usedCount: 0 // TODO: 从数据库获取实际使用次数
        };

        // 计算能力评分
        const powerScore = this.calculateAbilityPowerScore(ability, skillDef.rarity);
        totalPowerScore += powerScore;

        // 按类型统计
        if (!abilitiesByType[skillDef.type]) {
          abilitiesByType[skillDef.type] = 0;
        }
        abilitiesByType[skillDef.type] += powerScore;

        // 分类能力
        switch (effect.type) {
          case 'active':
            activeAbilities.push(ability);
            break;
          case 'passive':
            passiveAbilities.push(ability);
            break;
          case 'special':
            specialAbilities.push(ability);
            break;
          default:
            passiveAbilities.push(ability);
        }
      }
    }

    return {
      petId,
      activeAbilities,
      passiveAbilities,
      specialAbilities,
      totalPowerScore,
      abilitiesByType
    };
  }

  /**
   * 步骤178: 实现技能经验自动增长机制
   */
  async processAutoExperienceGrowth(petId: string, config: AutoExperienceConfigDto): Promise<ExperienceGrowthResultDto> {
    this.logger.debug(`Processing auto experience growth for pet: ${petId}`);

    if (!config.enabled) {
      return {
        petId,
        experienceGained: 0,
        affectedSkills: [],
        leveledUpSkills: [],
        newlyUnlockedSkills: [],
        startTime: new Date(),
        endTime: new Date()
      };
    }

    const startTime = new Date();
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { user: true }
    });

    if (!pet) {
      throw new NotFoundException(`Pet with ID ${petId} not found`);
    }

    // 计算闲置时间
    const lastActiveTime = pet.updatedAt || pet.createdAt;
    const idleHours = Math.min(
      (Date.now() - lastActiveTime.getTime()) / (1000 * 60 * 60),
      config.maxIdleHours
    );

    if (idleHours < 1) {
      // 闲置时间不足1小时，不增长经验
      return {
        petId,
        experienceGained: 0,
        affectedSkills: [],
        leveledUpSkills: [],
        newlyUnlockedSkills: [],
        startTime,
        endTime: new Date()
      };
    }

    const petSkillsMap = await this.getPetSkillsMap(petId);
    const affectedSkills: string[] = [];
    const leveledUpSkills: string[] = [];
    const newlyUnlockedSkills: string[] = [];

    // 计算基础经验增长
    const baseExperience = Math.floor(config.baseGrowthRate * idleHours * config.activityMultiplier);
    let totalExperienceGained = 0;

    // 确定受影响的技能
    const targetSkills = config.targetSkills && config.targetSkills.length > 0 
      ? config.targetSkills 
      : Array.from(petSkillsMap.keys()).filter(skillId => {
          const progress = petSkillsMap.get(skillId);
          return progress && (progress.status === SkillStatus.UNLOCKED || progress.status === SkillStatus.MASTERED);
        });

    // 为已解锁的技能分配经验
    for (const skillId of targetSkills) {
      const progress = petSkillsMap.get(skillId);
      if (!progress || progress.status === SkillStatus.LOCKED) {
        continue;
      }

      const skillDef = SKILL_DEFINITIONS_MAP.get(skillId);
      if (!skillDef) continue;

      // 根据技能稀有度和当前等级调整经验分配
      const rarityMultiplier = this.getRarityExperienceMultiplier(skillDef.rarity);
      const levelPenalty = Math.max(0.1, 1 - (progress.level * 0.1)); // 等级越高，自动增长越慢
      
      const skillExperience = Math.floor(baseExperience * rarityMultiplier * levelPenalty);
      
      if (skillExperience > 0) {
        const originalLevel = progress.level;
        
        // 处理经验增长
        const result = await this.skillEngine.processSkillExperienceGain(progress, skillExperience);
        
        totalExperienceGained += skillExperience;
        affectedSkills.push(skillId);
        
        if (result.leveledUp) {
          leveledUpSkills.push(skillId);
          this.logger.log(`Skill ${skillId} leveled up from ${originalLevel} to ${progress.level} via auto-growth`);
        }
        
        // 保存进度
        await this.saveSkillProgress(petId, progress);
      }
    }

    // 检查是否有新技能可以解锁
    const petData = await this.buildPetDataForEngine(pet);
    for (const [skillId] of SKILL_DEFINITIONS_MAP) {
      const currentProgress = petSkillsMap.get(skillId);
      if (currentProgress && currentProgress.status !== SkillStatus.LOCKED) {
        continue; // 已经解锁的技能跳过
      }

      const evaluation = await this.skillEngine.evaluateUnlockConditions(skillId, petData);
      if (evaluation.canUnlock) {
        // 尝试自动解锁
        try {
          const unlockResult = await this.skillEngine.unlockSkill(skillId, petData);
          if (unlockResult.success) {
            newlyUnlockedSkills.push(skillId);
            await this.saveSkillProgress(petId, petData.skills.get(skillId)!);
            this.logger.log(`Skill ${skillId} auto-unlocked for pet ${petId}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to auto-unlock skill ${skillId}:`, error);
        }
      }
    }

    // 更新宠物最后活跃时间
    await this.prisma.pet.update({
      where: { id: petId },
      data: { updatedAt: new Date() }
    });

    const endTime = new Date();
    this.logger.log(`Auto experience growth completed for pet ${petId}: ${totalExperienceGained} exp, ${leveledUpSkills.length} levelups, ${newlyUnlockedSkills.length} new unlocks`);

    return {
      petId,
      experienceGained: totalExperienceGained,
      affectedSkills,
      leveledUpSkills,
      newlyUnlockedSkills,
      startTime,
      endTime
    };
  }

  /**
   * 获取默认的自动经验增长配置
   */
  getDefaultAutoExperienceConfig(): AutoExperienceConfigDto {
    return {
      enabled: true,
      baseGrowthRate: 5, // 每小时5点经验
      activityMultiplier: 1.0,
      maxIdleHours: 24, // 最多累积24小时
      targetSkills: [] // 空数组表示所有已解锁技能
    };
  }

  // 私有辅助方法

  private async getPetSkillsMap(petId: string): Promise<Map<string, PetSkillProgress>> {
    return this.persistenceService.getPetSkillsMap(petId);
  }

  private async buildPetDataForEngine(pet: any): Promise<any> {
    const petSkillsMap = await this.getPetSkillsMap(pet.id);
    
    return {
      level: pet.level || 1,
      skills: petSkillsMap,
      stats: {
        mood: pet.mood || 50,
        curiosity: pet.curiosity || 50,
        health: pet.health || 100,
        energy: pet.energy || 100,
        experience_points: pet.experience || 0
      },
      personality: {
        empathy: 60,
        emotional_intelligence: 60
      },
      interactionHistory: [], // TODO: 从数据库获取
      achievements: [], // TODO: 从数据库获取
      createdAt: pet.createdAt || new Date()
    };
  }

  private matchesFilter(skillDef: any, filter: SkillFilterDto): boolean {
    if (filter.type && skillDef.type !== filter.type) return false;
    if (filter.category && skillDef.category !== filter.category) return false;
    if (filter.search && !skillDef.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  }

  private async saveSkillProgress(petId: string, progress: PetSkillProgress): Promise<void> {
    await this.persistenceService.saveSkillProgress(petId, progress);
  }

  private estimateUnlockTime(failedConditions: string[]): string | undefined {
    if (failedConditions.length === 0) return undefined;
    
    // 简单的估算逻辑
    if (failedConditions.some(c => c.includes('天'))) {
      return '需要更多时间培养';
    }
    if (failedConditions.some(c => c.includes('互动'))) {
      return '需要更多互动';
    }
    if (failedConditions.some(c => c.includes('等级'))) {
      return '需要提升宠物等级';
    }
    
    return '需要满足更多条件';
  }

  /**
   * 计算能力强度评分
   */
  private calculateAbilityPowerScore(ability: SkillAbilityDto, rarity: string): number {
    let baseScore = ability.effectValue * ability.level;
    
    // 稀有度加成
    const rarityMultipliers = {
      'common': 1.0,
      'uncommon': 1.5,
      'rare': 2.0,
      'epic': 3.0,
      'legendary': 5.0
    };
    
    const multiplier = rarityMultipliers[rarity as keyof typeof rarityMultipliers] || 1.0;
    baseScore *= multiplier;
    
    // 主动技能有额外加成
    if (ability.isActive) {
      baseScore *= 1.2;
    }
    
    return Math.floor(baseScore);
  }

  /**
   * 获取稀有度经验倍数
   */
  private getRarityExperienceMultiplier(rarity: string): number {
    const multipliers = {
      'common': 1.0,
      'uncommon': 0.8,
      'rare': 0.6,
      'epic': 0.4,
      'legendary': 0.2
    };
    
    return multipliers[rarity as keyof typeof multipliers] || 1.0;
  }

  /**
   * 聊天互动集成方法：从聊天互动中增加技能经验
   */
  async addExperienceFromInteraction(
    petId: string,
    userMessage: string,
    botResponse: string,
    conversationMetadata?: Record<string, any>
  ): Promise<{ experienceGained: number; affectedSkills: string[] }> {
    try {
      // 分析对话内容，确定互动类型和强度
      const interactionAnalysis = this.analyzeConversationContent(userMessage, botResponse, conversationMetadata);
      
      if (!interactionAnalysis || interactionAnalysis.skillExperience.length === 0) {
        this.logger.debug(`No skill experience to add for pet ${petId} from conversation`);
        return { experienceGained: 0, affectedSkills: [] };
      }

      const affectedSkills: string[] = [];
      let totalExperienceGained = 0;

      // 为每个相关技能增加经验
      for (const skillExp of interactionAnalysis.skillExperience) {
        try {
          const result = await this.gainSkillExperience(petId, skillExp.skillId, {
            interactionType: interactionAnalysis.type,
            intensity: skillExp.intensity,
            duration: interactionAnalysis.duration,
            contextFactors: interactionAnalysis.contextFactors
          });
          
          if (result.experienceGained > 0) {
            affectedSkills.push(skillExp.skillId);
            totalExperienceGained += result.experienceGained;
            
            this.logger.debug(`Added ${result.experienceGained} experience to skill ${skillExp.skillId} for pet ${petId}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to add experience to skill ${skillExp.skillId} for pet ${petId}:`, error);
        }
      }

      this.logger.log(`Chat interaction experience added for pet ${petId}: ${totalExperienceGained} total experience across ${affectedSkills.length} skills`);
      
      return { experienceGained: totalExperienceGained, affectedSkills };
    } catch (error) {
      this.logger.error(`Error adding experience from interaction for pet ${petId}:`, error);
      return { experienceGained: 0, affectedSkills: [] };
    }
  }

  /**
   * 分析对话内容，确定互动类型和技能经验分配
   */
  private analyzeConversationContent(
    userMessage: string,
    botResponse: string,
    metadata?: Record<string, any>
  ): {
    type: string;
    duration: number;
    intensity: number;
    contextFactors: Record<string, any>;
    skillExperience: { skillId: string; intensity: number }[];
  } | null {
    const analysis = {
      type: 'conversation',
      duration: Math.max(5, Math.min(30, userMessage.length / 10)), // 基于消息长度估算持续时间
      intensity: 5, // 默认强度
      contextFactors: metadata || {},
      skillExperience: [] as { skillId: string; intensity: number }[]
    };

    // 学习类关键词匹配
    const learningKeywords = ['学习', '知识', '教', '解释', '原理', '如何', '什么是', '为什么', '怎么', '学会', '理解', '明白'];
    const creativityKeywords = ['创意', '创造', '想象', '设计', '艺术', '画', '写', '创作', '灵感', '故事'];
    const emotionalKeywords = ['感情', '情绪', '心情', '开心', '难过', '生气', '焦虑', '抑郁', '安慰', '支持'];
    const socialKeywords = ['朋友', '社交', '聊天', '交流', '分享', '讨论', '话题', '一起', '陪伴'];
    const problemSolvingKeywords = ['问题', '解决', '方法', '办法', '建议', '帮助', '困难', '挑战', '分析'];

    const userText = userMessage.toLowerCase();
    const botText = botResponse.toLowerCase();
    const combinedText = userText + ' ' + botText;

    // 检查学习相关内容
    if (this.containsKeywords(combinedText, learningKeywords)) {
      analysis.skillExperience.push({ skillId: 'curiosity_drive', intensity: 6 });
      analysis.skillExperience.push({ skillId: 'basic_communication', intensity: 4 });
      analysis.type = 'learning';
      analysis.intensity = 7;
    }

    // 检查创意相关内容
    if (this.containsKeywords(combinedText, creativityKeywords)) {
      analysis.skillExperience.push({ skillId: 'imagination_spark', intensity: 6 });
      analysis.skillExperience.push({ skillId: 'basic_communication', intensity: 3 });
      analysis.type = 'creative';
      analysis.intensity = 6;
    }

    // 检查情感相关内容
    if (this.containsKeywords(combinedText, emotionalKeywords)) {
      analysis.skillExperience.push({ skillId: 'emotional_awareness', intensity: 6 });
      analysis.skillExperience.push({ skillId: 'basic_communication', intensity: 4 });
      analysis.type = 'emotional';
      analysis.intensity = 6;
    }

    // 检查社交相关内容
    if (this.containsKeywords(combinedText, socialKeywords)) {
      analysis.skillExperience.push({ skillId: 'friendship_bond', intensity: 5 });
      analysis.skillExperience.push({ skillId: 'basic_communication', intensity: 5 });
      analysis.type = 'social';
      analysis.intensity = 5;
    }

    // 检查问题解决相关内容
    if (this.containsKeywords(combinedText, problemSolvingKeywords)) {
      analysis.skillExperience.push({ skillId: 'logical_thinking', intensity: 6 });
      analysis.skillExperience.push({ skillId: 'basic_communication', intensity: 4 });
      analysis.type = 'problem_solving';
      analysis.intensity = 6;
    }

    // 如果没有匹配到特定类型，给基础交流技能增加经验
    if (analysis.skillExperience.length === 0) {
      analysis.skillExperience.push({ skillId: 'basic_communication', intensity: 4 });
    }

    // 根据对话长度和复杂度调整强度
    if (userMessage.length > 100 || botResponse.length > 200) {
      analysis.intensity = Math.min(10, analysis.intensity + 2);
      analysis.skillExperience.forEach(exp => {
        exp.intensity = Math.min(10, exp.intensity + 1);
      });
    }

    return analysis;
  }

  /**
   * 检查文本是否包含关键词
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * 步骤242: 发送技能解锁实时事件
   */
  private async sendSkillUnlockedEvent(
    petId: string,
    userId: string,
    skillId: string,
    skillProgress: PetSkillProgress
  ): Promise<void> {
    try {
      const skillDef = SKILL_DEFINITIONS_MAP.get(skillId);
      if (!skillDef) {
        this.logger.warn(`Skill definition not found for ${skillId}, cannot send unlock event`);
        return;
      }

      // 提取技能的能力列表
      const abilities = skillDef.effects.map(effect => 
        `${effect.type}: ${effect.target} (${effect.modifier > 0 ? '+' : ''}${effect.modifier})`
      );

      // 提取前置条件描述
      const prerequisites = skillDef.unlockConditions.map(condition => condition.description);

      await this.realtimeEvents.pushSkillUnlocked(petId, userId, {
        skillId: skillProgress.skillId,
        skillName: skillDef.name,
        category: skillDef.category,
        level: skillProgress.level,
        unlockCondition: '满足所有解锁条件',
        description: skillDef.description,
        requiredExperience: skillProgress.experienceRequired,
        currentExperience: skillProgress.experience,
        abilities,
        prerequisites
      });

      this.logger.debug(`Skill unlock event sent for skill ${skillId} of pet ${petId}`);
    } catch (error) {
      this.logger.error(`Failed to send skill unlock event for skill ${skillId} of pet ${petId}`, error);
      // 不要抛出错误，避免影响主要的解锁流程
    }
  }
}