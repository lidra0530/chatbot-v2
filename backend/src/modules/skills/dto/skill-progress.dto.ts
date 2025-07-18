import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsArray, IsObject, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SkillType, SkillStatus } from '../../../algorithms/skill-system';

/**
 * 步骤168: 技能进度相关DTO
 */

export class SkillExperienceGainDto {
  @ApiProperty({ description: '交互类型' })
  @IsString()
  interactionType!: string;

  @ApiProperty({ description: '交互强度 (1-10)' })
  @IsNumber()
  @Min(1)
  @Max(10)
  intensity!: number;

  @ApiProperty({ description: '持续时间（分钟）' })
  @IsNumber()
  @Min(0)
  @Max(1440) // 最多24小时
  duration!: number;

  @ApiProperty({ description: '上下文因子', required: false })
  @IsOptional()
  @IsObject()
  contextFactors?: Record<string, any>;
}

export class SkillExperienceResultDto {
  @ApiProperty({ description: '技能ID' })
  @IsString()
  skillId!: string;

  @ApiProperty({ description: '获得的经验值' })
  @IsNumber()
  @Min(0)
  experienceGained!: number;

  @ApiProperty({ description: '新等级', required: false })
  @IsOptional()
  @IsNumber()
  newLevel?: number;

  @ApiProperty({ description: '是否升级' })
  @IsBoolean()
  leveledUp!: boolean;

  @ApiProperty({ description: '是否达到精通' })
  @IsBoolean()
  masteryAchieved!: boolean;

  @ApiProperty({ description: '奖励效果', required: false })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  bonusEffects?: any[];
}

export class BulkSkillExperienceDto {
  @ApiProperty({ description: '宠物ID' })
  @IsString()
  petId!: string;

  @ApiProperty({ description: '技能ID列表' })
  @IsArray()
  @IsString({ each: true })
  skillIds!: string[];

  @ApiProperty({ description: '经验获得配置' })
  @Type(() => SkillExperienceGainDto)
  experienceConfig!: SkillExperienceGainDto;
}

export class SkillStatisticsDto {
  @ApiProperty({ description: '宠物ID' })
  @IsString()
  petId!: string;

  @ApiProperty({ description: '总技能数量' })
  @IsNumber()
  totalSkills!: number;

  @ApiProperty({ description: '已解锁技能数量' })
  @IsNumber()
  unlockedSkills!: number;

  @ApiProperty({ description: '精通技能数量' })
  @IsNumber()
  masteredSkills!: number;

  @ApiProperty({ description: '总经验值' })
  @IsNumber()
  totalExperience!: number;

  @ApiProperty({ description: '各类型技能统计' })
  @IsObject()
  skillsByType!: Record<SkillType, {
    total: number;
    unlocked: number;
    mastered: number;
    averageLevel: number;
  }>;

  @ApiProperty({ description: '技能树完成度 (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  completionRate!: number;

  @ApiProperty({ description: '最近活跃的技能' })
  @IsArray()
  @IsString({ each: true })
  recentlyActiveSkills!: string[];

  @ApiProperty({ description: '推荐解锁的技能' })
  @IsArray()
  @IsString({ each: true })
  recommendedSkills!: string[];
}

export class SkillFilterDto {
  @ApiProperty({ description: '技能类型过滤', enum: SkillType, required: false })
  @IsOptional()
  @IsEnum(SkillType)
  type?: SkillType;

  @ApiProperty({ description: '技能状态过滤', enum: SkillStatus, required: false })
  @IsOptional()
  @IsEnum(SkillStatus)
  status?: SkillStatus;

  @ApiProperty({ description: '分类过滤', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: '最小等级', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minLevel?: number;

  @ApiProperty({ description: '最大等级', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxLevel?: number;

  @ApiProperty({ description: '是否只显示可解锁的', required: false })
  @IsOptional()
  @IsBoolean()
  onlyUnlockable?: boolean;

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}