import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SkillSystemEngine, PetSkillProgress, SkillStatus } from '../../algorithms/skill-system';
import { SKILL_DEFINITIONS_MAP, SKILL_SYSTEM_CONFIG } from '../../config/skill-mappings.config';
import {
  SkillDto,
  SkillProgressDto,
  SkillExperienceGainDto,
  SkillExperienceResultDto,
  SkillUnlockRequestDto,
  SkillUnlockResultDto,
  SkillUnlockEvaluationDto,
  AvailableSkillsDto,
  SkillStatisticsDto,
  SkillFilterDto,
  BulkSkillExperienceDto,
  BatchUnlockDto,
  BatchUnlockResultDto
} from './dto';

/**
 * 步骤169: 技能系统服务
 * 实现技能管理基础逻辑，集成算法引擎
 */
@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);
  private readonly skillEngine: SkillSystemEngine;

  constructor(private prisma: PrismaService) {
    this.skillEngine = new SkillSystemEngine(SKILL_DEFINITIONS_MAP, SKILL_SYSTEM_CONFIG);
    this.logger.log('SkillsService initialized with SkillSystemEngine');
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
      await this.saveSkillProgress(petId, petData.skills.get(request.skillId)!);
      
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

  // 私有辅助方法

  private async getPetSkillsMap(petId: string): Promise<Map<string, PetSkillProgress>> {
    // 这里应该从数据库获取技能进度，暂时返回空Map
    // TODO: 实现数据库集成
    return new Map();
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
    // TODO: 实现技能进度保存到数据库
    this.logger.debug(`Saving skill progress for pet ${petId}, skill ${progress.skillId}`);
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
}