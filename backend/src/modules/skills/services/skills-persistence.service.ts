import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { SkillsCacheService } from './skills-cache.service';
import { PetSkillProgress, SkillStatus } from '../../../algorithms/skill-system';
import { SKILL_DEFINITIONS_MAP } from '../../../config/skill-mappings.config';

/**
 * 步骤189-192: 技能系统数据持久化服务
 * 负责技能数据的数据库操作和缓存管理
 */

interface SkillUnlockData {
  skillId: string;
  petLevel: number;
  unlockConditions: any;
  triggerEvent?: string;
  unlockMethod?: string;
  experienceReward?: number;
  unlockedAbilities?: any[];
  bonusEffects?: any[];
}

interface SkillExperienceData {
  skillId: string;
  experienceGained: number;
  sourceType: string;
  sourceDetail?: any;
  interactionType?: string;
  intensity?: number;
  duration?: number;
  contextFactors?: any;
}

@Injectable()
export class SkillsPersistenceService {
  private readonly logger = new Logger(SkillsPersistenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: SkillsCacheService
  ) {}

  /**
   * 步骤189: 获取宠物技能进度数据
   */
  async getPetSkillsMap(petId: string): Promise<Map<string, PetSkillProgress>> {
    // 首先尝试从缓存获取
    const cached = this.cache.getSkillProgress(petId);
    if (cached) {
      return cached;
    }

    this.logger.debug(`从数据库加载技能进度: ${petId}`);

    try {
      // 从数据库查询技能进度
      const skillProgresses = await this.prisma.skillProgress.findMany({
        where: { 
          petId,
          isActive: true 
        },
        orderBy: [
          { skillType: 'asc' },
          { level: 'desc' }
        ]
      });

      const skillsMap = new Map<string, PetSkillProgress>();

      // 转换数据库记录为内存对象
      for (const progress of skillProgresses) {
        const skillProgress: PetSkillProgress = {
          skillId: progress.skillId,
          level: progress.level,
          experience: progress.experience,
          experienceRequired: progress.experienceRequired,
          status: progress.status as SkillStatus,
          unlockedAt: progress.unlockedAt || undefined,
          lastUsed: progress.lastUsed || undefined,
          usageCount: progress.usageCount,
          masteryProgress: progress.masteryProgress
        };

        skillsMap.set(progress.skillId, skillProgress);
      }

      // 缓存结果
      this.cache.setSkillProgress(petId, skillsMap);

      this.logger.debug(`技能进度加载完成: ${petId}, 技能数量: ${skillsMap.size}`);
      return skillsMap;

    } catch (error) {
      this.logger.error(`加载技能进度失败: ${petId}`, error);
      throw error;
    }
  }

  /**
   * 保存技能进度到数据库
   */
  async saveSkillProgress(petId: string, progress: PetSkillProgress): Promise<void> {
    try {
      const skillDef = SKILL_DEFINITIONS_MAP.get(progress.skillId);
      if (!skillDef) {
        throw new Error(`技能定义不存在: ${progress.skillId}`);
      }

      // 检查是否已存在记录
      const existing = await this.prisma.skillProgress.findFirst({
        where: {
          petId,
          skillId: progress.skillId
        }
      });

      const updateData = {
        skillName: skillDef.name,
        skillType: skillDef.type,
        rarity: skillDef.rarity,
        level: progress.level,
        experience: progress.experience,
        experienceRequired: progress.experienceRequired,
        status: progress.status,
        masteryProgress: progress.masteryProgress,
        usageCount: progress.usageCount,
        lastUsed: progress.lastUsed,
        lastExperienceGain: new Date(),
        totalExperienceGained: (existing?.totalExperienceGained || 0) + progress.experience,
        currentAbilities: JSON.parse(JSON.stringify(skillDef.effects || [])),
        cacheVersion: existing?.cacheVersion || 1,
        updatedAt: new Date()
      };

      if (existing) {
        // 更新现有记录
        await this.prisma.skillProgress.update({
          where: { id: existing.id },
          data: {
            ...updateData,
            totalExperienceGained: existing.totalExperienceGained + progress.experience,
            cacheVersion: existing.cacheVersion + 1,
            currentAbilities: JSON.parse(JSON.stringify(skillDef.effects || []))
          }
        });
      } else {
        // 创建新记录
        await this.prisma.skillProgress.create({
          data: {
            petId,
            skillId: progress.skillId,
            unlockedAt: progress.unlockedAt,
            ...updateData,
            currentAbilities: JSON.parse(JSON.stringify(skillDef.effects || []))
          }
        });
      }

      // 无效化缓存
      this.cache.invalidateSkillProgress(petId);

      this.logger.debug(`技能进度已保存: ${petId}:${progress.skillId}`);

    } catch (error) {
      this.logger.error(`保存技能进度失败: ${petId}:${progress.skillId}`, error);
      throw error;
    }
  }

  /**
   * 步骤190: 记录技能解锁历史
   */
  async recordSkillUnlock(petId: string, unlockData: SkillUnlockData): Promise<void> {
    try {
      // 获取宠物信息
      const pet = await this.prisma.pet.findUnique({
        where: { id: petId }
      });

      if (!pet) {
        throw new NotFoundException(`宠物不存在: ${petId}`);
      }

      // 获取技能进度记录
      const skillProgress = await this.prisma.skillProgress.findFirst({
        where: {
          petId,
          skillId: unlockData.skillId
        }
      });

      if (!skillProgress) {
        throw new Error(`技能进度记录不存在: ${petId}:${unlockData.skillId}`);
      }

      const skillDef = SKILL_DEFINITIONS_MAP.get(unlockData.skillId);
      if (!skillDef) {
        throw new Error(`技能定义不存在: ${unlockData.skillId}`);
      }

      // 创建解锁历史记录
      await this.prisma.skillUnlockHistory.create({
        data: {
          petId,
          skillProgressId: skillProgress.id,
          skillId: unlockData.skillId,
          skillName: skillDef.name,
          skillType: skillDef.type,
          rarity: skillDef.rarity,
          unlockConditions: unlockData.unlockConditions,
          triggerEvent: unlockData.triggerEvent,
          unlockMethod: unlockData.unlockMethod || 'normal',
          petLevel: unlockData.petLevel,
          petStateSnapshot: pet.currentState as any,
          prerequisiteSkills: {},
          experienceReward: unlockData.experienceReward || 0,
          unlockedAbilities: unlockData.unlockedAbilities || [],
          bonusEffects: unlockData.bonusEffects || [],
          impactScore: this.calculateUnlockImpact(skillDef),
          difficultyScore: this.calculateUnlockDifficulty(unlockData.unlockConditions),
          unlockedAt: new Date()
        }
      });

      this.logger.log(`技能解锁历史已记录: ${petId}:${unlockData.skillId}`);

    } catch (error) {
      this.logger.error(`记录技能解锁历史失败: ${petId}:${unlockData.skillId}`, error);
      throw error;
    }
  }

  /**
   * 记录技能经验历史
   */
  async recordSkillExperience(petId: string, experienceData: SkillExperienceData): Promise<void> {
    try {
      // 获取技能进度记录
      const skillProgress = await this.prisma.skillProgress.findFirst({
        where: {
          petId,
          skillId: experienceData.skillId
        }
      });

      if (!skillProgress) {
        throw new Error(`技能进度记录不存在: ${petId}:${experienceData.skillId}`);
      }

      const levelBefore = skillProgress.level;
      const experienceBefore = skillProgress.experience;
      const experienceAfter = experienceBefore + experienceData.experienceGained;
      
      // 计算是否升级
      const levelAfter = this.calculateNewLevel(experienceAfter, skillProgress.experienceRequired);
      const leveledUp = levelAfter > levelBefore;

      // 创建经验历史记录
      await this.prisma.skillExperienceHistory.create({
        data: {
          petId,
          skillProgressId: skillProgress.id,
          skillId: experienceData.skillId,
          experienceGained: experienceData.experienceGained,
          experienceBefore,
          experienceAfter,
          levelBefore,
          levelAfter,
          leveledUp,
          sourceType: experienceData.sourceType,
          sourceDetail: experienceData.sourceDetail || {},
          interactionType: experienceData.interactionType,
          intensity: experienceData.intensity,
          duration: experienceData.duration,
          contextFactors: experienceData.contextFactors || {},
          baseExperience: experienceData.experienceGained,
          multiplier: 1.0,
          bonusExperience: 0,
          gainedAt: new Date()
        }
      });

      this.logger.debug(`技能经验历史已记录: ${petId}:${experienceData.skillId}, 经验: ${experienceData.experienceGained}`);

    } catch (error) {
      this.logger.error(`记录技能经验历史失败: ${petId}:${experienceData.skillId}`, error);
      throw error;
    }
  }

  /**
   * 获取技能解锁历史
   */
  async getSkillUnlockHistory(petId: string, options?: {
    skillId?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'unlockedAt' | 'impactScore';
    sortOrder?: 'asc' | 'desc';
  }): Promise<any[]> {
    const { skillId, limit = 50, offset = 0, sortBy = 'unlockedAt', sortOrder = 'desc' } = options || {};

    try {
      const history = await this.prisma.skillUnlockHistory.findMany({
        where: {
          petId,
          ...(skillId && { skillId }),
          isValid: true
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        take: limit,
        skip: offset,
        include: {
          skillProgress: {
            select: {
              level: true,
              experience: true,
              status: true
            }
          }
        }
      });

      return history;

    } catch (error) {
      this.logger.error(`获取技能解锁历史失败: ${petId}`, error);
      throw error;
    }
  }

  /**
   * 获取技能经验历史
   */
  async getSkillExperienceHistory(petId: string, options?: {
    skillId?: string;
    sourceType?: string;
    dateRange?: { start: Date; end: Date };
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const { skillId, sourceType, dateRange, limit = 100, offset = 0 } = options || {};

    try {
      const history = await this.prisma.skillExperienceHistory.findMany({
        where: {
          petId,
          ...(skillId && { skillId }),
          ...(sourceType && { sourceType }),
          ...(dateRange && {
            gainedAt: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          })
        },
        orderBy: {
          gainedAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      return history;

    } catch (error) {
      this.logger.error(`获取技能经验历史失败: ${petId}`, error);
      throw error;
    }
  }

  /**
   * 批量保存技能进度
   */
  async batchSaveSkillProgress(petId: string, progressList: PetSkillProgress[]): Promise<void> {
    try {
      for (const progress of progressList) {
        await this.saveSkillProgress(petId, progress);
      }
      
      this.logger.log(`批量保存技能进度完成: ${petId}, 数量: ${progressList.length}`);

    } catch (error) {
      this.logger.error(`批量保存技能进度失败: ${petId}`, error);
      throw error;
    }
  }

  /**
   * 计算解锁影响分数
   */
  private calculateUnlockImpact(skillDef: any): number {
    const rarityScores = {
      'common': 0.2,
      'uncommon': 0.4,
      'rare': 0.6,
      'epic': 0.8,
      'legendary': 1.0
    };

    return rarityScores[skillDef.rarity as keyof typeof rarityScores] || 0.2;
  }

  /**
   * 计算解锁难度分数
   */
  private calculateUnlockDifficulty(unlockConditions: any): number {
    if (!unlockConditions || !Array.isArray(unlockConditions)) {
      return 0.1;
    }

    return Math.min(unlockConditions.length * 0.2, 1.0);
  }

  /**
   * 计算新等级
   */
  private calculateNewLevel(experience: number, experienceRequired: number): number {
    return Math.floor(experience / experienceRequired) + 1;
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 6); // 清理6个月前的数据

      // 清理过期的经验历史记录
      const deletedExperience = await this.prisma.skillExperienceHistory.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      // 清理过期的解锁历史记录（保留更长时间）
      const unlockCutoffDate = new Date();
      unlockCutoffDate.setFullYear(unlockCutoffDate.getFullYear() - 1);
      
      const deletedUnlocks = await this.prisma.skillUnlockHistory.deleteMany({
        where: {
          createdAt: {
            lt: unlockCutoffDate
          },
          isValid: false
        }
      });

      this.logger.log('技能数据清理完成', {
        deletedExperience: deletedExperience.count,
        deletedUnlocks: deletedUnlocks.count
      });

    } catch (error) {
      this.logger.error('清理过期数据失败', error);
      throw error;
    }
  }
}