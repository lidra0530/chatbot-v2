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