import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsArray, IsObject, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SkillCategory {
  COMMUNICATION = 'communication',
  CREATIVITY = 'creativity',
  LEARNING = 'learning',
  EMOTIONAL = 'emotional',
  PHYSICAL = 'physical',
  SOCIAL = 'social',
}

export enum SkillLevel {
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export class SkillNodeDto {
  @ApiProperty({ description: '技能ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: '技能名称' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '技能描述' })
  @IsString()
  description!: string;

  @ApiProperty({ description: '技能分类', enum: SkillCategory })
  @IsEnum(SkillCategory)
  category!: SkillCategory;

  @ApiProperty({ description: '技能等级', enum: SkillLevel })
  @IsEnum(SkillLevel)
  level!: SkillLevel;

  @ApiProperty({ description: '是否已解锁' })
  @IsBoolean()
  isUnlocked!: boolean;

  @ApiProperty({ description: '当前经验值' })
  @IsNumber()
  currentExp!: number;

  @ApiProperty({ description: '解锁所需经验值' })
  @IsNumber()
  requiredExp!: number;

  @ApiProperty({ description: '前置技能ID列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  prerequisites!: string[];

  @ApiProperty({ description: '解锁条件', required: false })
  @IsOptional()
  @IsObject()
  unlockConditions?: Record<string, any>;

  @ApiProperty({ description: '技能效果描述', required: false })
  @IsOptional()
  @IsString()
  effects?: string;

  @ApiProperty({ description: '技能图标URL', required: false })
  @IsOptional()
  @IsString()
  iconUrl?: string;
}

export class SkillTreeDto {
  @ApiProperty({ description: '宠物ID' })
  @IsString()
  petId!: string;

  @ApiProperty({ description: '技能节点列表', type: [SkillNodeDto] })
  @IsArray()
  @Type(() => SkillNodeDto)
  skills!: SkillNodeDto[];

  @ApiProperty({ description: '总经验值' })
  @IsNumber()
  totalExp!: number;

  @ApiProperty({ description: '可用技能点' })
  @IsNumber()
  availableSkillPoints!: number;

  @ApiProperty({ description: '已解锁技能数量' })
  @IsNumber()
  unlockedSkillsCount!: number;

  @ApiProperty({ description: '技能树完成度百分比' })
  @IsNumber()
  completionPercentage!: number;
}

/**
 * 当前能力DTO
 */
export class SkillAbilityDto {
  @ApiProperty({ description: '能力ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: '能力名称' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '能力描述' })
  @IsString()
  description!: string;

  @ApiProperty({ description: '能力等级' })
  @IsNumber()
  level!: number;

  @ApiProperty({ description: '来源技能ID' })
  @IsString()
  sourceSkillId!: string;

  @ApiProperty({ description: '能力效果值' })
  @IsNumber()
  effectValue!: number;

  @ApiProperty({ description: '是否激活状态' })
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty({ description: '冷却时间（秒）', required: false })
  @IsOptional()
  @IsNumber()
  cooldownSeconds?: number;

  @ApiProperty({ description: '使用次数限制', required: false })
  @IsOptional()
  @IsNumber()
  usageLimit?: number;

  @ApiProperty({ description: '已使用次数' })
  @IsNumber()
  usedCount!: number;
}

export class CurrentAbilitiesDto {
  @ApiProperty({ description: '宠物ID' })
  @IsString()
  petId!: string;

  @ApiProperty({ description: '当前激活的能力列表', type: [SkillAbilityDto] })
  @IsArray()
  @Type(() => SkillAbilityDto)
  activeAbilities!: SkillAbilityDto[];

  @ApiProperty({ description: '被动能力列表', type: [SkillAbilityDto] })
  @IsArray()
  @Type(() => SkillAbilityDto)
  passiveAbilities!: SkillAbilityDto[];

  @ApiProperty({ description: '特殊能力列表', type: [SkillAbilityDto] })
  @IsArray()
  @Type(() => SkillAbilityDto)
  specialAbilities!: SkillAbilityDto[];

  @ApiProperty({ description: '总能力评分' })
  @IsNumber()
  totalPowerScore!: number;

  @ApiProperty({ description: '各类型能力统计' })
  @IsObject()
  abilitiesByType!: Record<string, number>;
}

/**
 * 自动经验增长配置DTO
 */
export class AutoExperienceConfigDto {
  @ApiProperty({ description: '是否启用自动经验增长' })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ description: '基础增长速率（每小时）' })
  @IsNumber()
  baseGrowthRate!: number;

  @ApiProperty({ description: '活跃度加成倍数' })
  @IsNumber()
  activityMultiplier!: number;

  @ApiProperty({ description: '最大闲置增长时间（小时）' })
  @IsNumber()
  maxIdleHours!: number;

  @ApiProperty({ description: '目标技能ID列表', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSkills?: string[];
}

export class ExperienceGrowthResultDto {
  @ApiProperty({ description: '宠物ID' })
  @IsString()
  petId!: string;

  @ApiProperty({ description: '增长的经验值' })
  @IsNumber()
  experienceGained!: number;

  @ApiProperty({ description: '影响的技能列表' })
  @IsArray()
  @IsString({ each: true })
  affectedSkills!: string[];

  @ApiProperty({ description: '升级的技能列表' })
  @IsArray()
  @IsString({ each: true })
  leveledUpSkills!: string[];

  @ApiProperty({ description: '新解锁的技能列表' })
  @IsArray()
  @IsString({ each: true })
  newlyUnlockedSkills!: string[];

  @ApiProperty({ description: '增长开始时间' })
  startTime!: Date;

  @ApiProperty({ description: '增长结束时间' })
  endTime!: Date;
}