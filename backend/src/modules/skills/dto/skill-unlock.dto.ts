import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDate, IsObject, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class SkillUnlockDto {
  @ApiProperty({ description: '解锁记录ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: '宠物ID' })
  @IsString()
  petId!: string;

  @ApiProperty({ description: '技能ID' })
  @IsString()
  skillId!: string;

  @ApiProperty({ description: '技能名称' })
  @IsString()
  skillName!: string;

  @ApiProperty({ description: '解锁时间' })
  @IsDate()
  @Type(() => Date)
  unlockedAt!: Date;

  @ApiProperty({ description: '解锁时的经验值' })
  @IsNumber()
  expAtUnlock!: number;

  @ApiProperty({ description: '解锁来源（互动类型）' })
  @IsString()
  unlockSource!: string;

  @ApiProperty({ description: '解锁上下文数据', required: false })
  @IsOptional()
  @IsObject()
  unlockContext?: Record<string, any>;
}

export class CreateSkillUnlockDto {
  @ApiProperty({ description: '技能ID' })
  @IsString()
  skillId!: string;

  @ApiProperty({ description: '解锁来源（互动类型）', required: false })
  @IsOptional()
  @IsString()
  unlockSource?: string;

  @ApiProperty({ description: '解锁上下文数据', required: false })
  @IsOptional()
  @IsObject()
  unlockContext?: Record<string, any>;
}

export class SkillProgressDto {
  @ApiProperty({ description: '技能ID' })
  @IsString()
  skillId!: string;

  @ApiProperty({ description: '技能名称' })
  @IsString()
  skillName!: string;

  @ApiProperty({ description: '当前经验值' })
  @IsNumber()
  currentExp!: number;

  @ApiProperty({ description: '所需经验值' })
  @IsNumber()
  requiredExp!: number;

  @ApiProperty({ description: '进度百分比' })
  @IsNumber()
  progressPercentage!: number;

  @ApiProperty({ description: '是否可以解锁' })
  @IsBoolean()
  canUnlock!: boolean;

  @ApiProperty({ description: '距离解锁还需的经验值' })
  @IsNumber()
  expToUnlock!: number;
}

export class UpdateSkillExpDto {
  @ApiProperty({ description: '技能ID' })
  @IsString()
  skillId!: string;

  @ApiProperty({ description: '经验值增量' })
  @IsNumber()
  expGain!: number;

  @ApiProperty({ description: '经验来源', required: false })
  @IsOptional()
  @IsString()
  expSource?: string;
}