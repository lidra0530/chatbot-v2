import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsArray, IsObject, IsOptional, IsEnum, IsDate, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SkillType, SkillRarity, SkillStatus } from '../../../algorithms/skill-system';

/**
 * 步骤168: 技能系统DTO定义
 * 与算法引擎保持一致的数据传输对象
 */

export class SkillDefinitionDto {
  @ApiProperty({ description: '技能ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: '技能名称' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '技能描述' })
  @IsString()
  description!: string;

  @ApiProperty({ description: '技能类型', enum: SkillType })
  @IsEnum(SkillType)
  type!: SkillType;

  @ApiProperty({ description: '技能稀有度', enum: SkillRarity })
  @IsEnum(SkillRarity)
  rarity!: SkillRarity;

  @ApiProperty({ description: '最大等级' })
  @IsNumber()
  @Min(1)
  @Max(50)
  maxLevel!: number;

  @ApiProperty({ description: '解锁条件列表' })
  @IsArray()
  @IsObject({ each: true })
  unlockConditions!: any[];

  @ApiProperty({ description: '技能效果列表' })
  @IsArray()
  @IsObject({ each: true })
  effects!: any[];

  @ApiProperty({ description: '经验值倍数' })
  @IsNumber()
  @Min(0.1)
  @Max(10)
  experienceMultiplier!: number;

  @ApiProperty({ description: '技能分类' })
  @IsString()
  category!: string;

  @ApiProperty({ description: '技能图标', required: false })
  @IsOptional()
  @IsString()
  icon?: string;
}

export class SkillProgressDto {
  @ApiProperty({ description: '技能ID' })
  @IsString()
  skillId!: string;

  @ApiProperty({ description: '当前等级' })
  @IsNumber()
  @Min(0)
  level!: number;

  @ApiProperty({ description: '当前经验值' })
  @IsNumber()
  @Min(0)
  experience!: number;

  @ApiProperty({ description: '升级所需经验值' })
  @IsNumber()
  @Min(0)
  experienceRequired!: number;

  @ApiProperty({ description: '技能状态', enum: SkillStatus })
  @IsEnum(SkillStatus)
  status!: SkillStatus;

  @ApiProperty({ description: '解锁时间', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  unlockedAt?: Date;

  @ApiProperty({ description: '最后使用时间', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastUsed?: Date;

  @ApiProperty({ description: '使用次数' })
  @IsNumber()
  @Min(0)
  usageCount!: number;

  @ApiProperty({ description: '精通进度 (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  masteryProgress!: number;
}

export class SkillDto {
  @ApiProperty({ description: '技能定义' })
  @Type(() => SkillDefinitionDto)
  definition!: SkillDefinitionDto;

  @ApiProperty({ description: '技能进度', required: false })
  @IsOptional()
  @Type(() => SkillProgressDto)
  progress?: SkillProgressDto;

  @ApiProperty({ description: '解锁进度 (0-1)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  unlockProgress?: number;

  @ApiProperty({ description: '是否可解锁' })
  @IsBoolean()
  canUnlock!: boolean;

  @ApiProperty({ description: '解锁失败原因', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  failedConditions?: string[];
}