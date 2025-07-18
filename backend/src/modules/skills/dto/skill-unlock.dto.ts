import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsArray, IsObject, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { UnlockConditionType } from '../../../algorithms/skill-system';

/**
 * 步骤168: 技能解锁相关DTO
 */

export class UnlockConditionDto {
  @ApiProperty({ description: '解锁条件类型', enum: UnlockConditionType })
  @IsEnum(UnlockConditionType)
  type!: UnlockConditionType;

  @ApiProperty({ description: '条件要求参数' })
  @IsObject()
  requirements!: Record<string, any>;

  @ApiProperty({ description: '条件描述' })
  @IsString()
  description!: string;

  @ApiProperty({ description: '是否满足条件' })
  @IsBoolean()
  isMet!: boolean;

  @ApiProperty({ description: '完成进度 (0-1)', required: false })
  @IsOptional()
  @IsNumber()
  progress?: number;
}

export class SkillUnlockRequestDto {
  @ApiProperty({ description: '技能ID' })
  @IsString()
  skillId!: string;

  @ApiProperty({ description: '强制解锁（管理员功能）', required: false })
  @IsOptional()
  @IsBoolean()
  forceUnlock?: boolean;
}

export class SkillUnlockResultDto {
  @ApiProperty({ description: '是否成功解锁' })
  @IsBoolean()
  success!: boolean;

  @ApiProperty({ description: '技能ID' })
  @IsString()
  skillId!: string;

  @ApiProperty({ description: '新解锁的技能列表' })
  @IsArray()
  @IsString({ each: true })
  newSkills!: string[];

  @ApiProperty({ description: '获得的经验值' })
  @IsNumber()
  experience!: number;

  @ApiProperty({ description: '结果消息' })
  @IsString()
  message!: string;

  @ApiProperty({ description: '技能效果' })
  @IsArray()
  @IsObject({ each: true })
  effects!: any[];

  @ApiProperty({ description: '失败原因', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  failureReasons?: string[];
}

export class SkillUnlockEvaluationDto {
  @ApiProperty({ description: '技能ID' })
  @IsString()
  skillId!: string;

  @ApiProperty({ description: '技能名称' })
  @IsString()
  skillName!: string;

  @ApiProperty({ description: '是否可以解锁' })
  @IsBoolean()
  canUnlock!: boolean;

  @ApiProperty({ description: '解锁条件列表' })
  @IsArray()
  @Type(() => UnlockConditionDto)
  conditions!: UnlockConditionDto[];

  @ApiProperty({ description: '总体进度 (0-1)' })
  @IsNumber()
  overallProgress!: number;

  @ApiProperty({ description: '未满足的条件' })
  @IsArray()
  @IsString({ each: true })
  failedConditions!: string[];

  @ApiProperty({ description: '预计解锁时间描述', required: false })
  @IsOptional()
  @IsString()
  estimatedUnlockTime?: string;
}

export class AvailableSkillsDto {
  @ApiProperty({ description: '宠物ID' })
  @IsString()
  petId!: string;

  @ApiProperty({ description: '可立即解锁的技能ID列表' })
  @IsArray()
  @IsString({ each: true })
  unlockableSkills!: string[];

  @ApiProperty({ description: '所有技能的解锁进度' })
  @IsObject()
  skillProgress!: Record<string, number>;

  @ApiProperty({ description: '推荐优先解锁的技能' })
  @IsArray()
  @IsString({ each: true })
  recommendedSkills!: string[];

  @ApiProperty({ description: '按类型分组的可解锁技能' })
  @IsObject()
  skillsByType!: Record<string, string[]>;
}

export class BatchUnlockDto {
  @ApiProperty({ description: '技能ID列表' })
  @IsArray()
  @IsString({ each: true })
  skillIds!: string[];

  @ApiProperty({ description: '是否强制解锁（管理员功能）', required: false })
  @IsOptional()
  @IsBoolean()
  forceUnlock?: boolean;
}

export class BatchUnlockResultDto {
  @ApiProperty({ description: '成功解锁的技能' })
  @IsArray()
  @IsString({ each: true })
  successfulUnlocks!: string[];

  @ApiProperty({ description: '失败的解锁尝试' })
  @IsArray()
  @IsObject({ each: true })
  failedUnlocks!: Array<{
    skillId: string;
    reason: string;
  }>;

  @ApiProperty({ description: '总获得经验值' })
  @IsNumber()
  totalExperience!: number;

  @ApiProperty({ description: '所有新效果' })
  @IsArray()
  @IsObject({ each: true })
  allEffects!: any[];

  @ApiProperty({ description: '连锁解锁的技能' })
  @IsArray()
  @IsString({ each: true })
  chainUnlocks!: string[];
}