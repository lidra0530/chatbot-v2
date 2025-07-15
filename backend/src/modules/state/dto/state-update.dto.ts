import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsDate, IsOptional, IsEnum, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PetMood, PetActivity } from './pet-state.dto';

export enum StateUpdateTrigger {
  INTERACTION = 'interaction',
  TIME_DECAY = 'time_decay',
  FEEDING = 'feeding',
  PLAYING = 'playing',
  LEARNING = 'learning',
  SLEEPING = 'sleeping',
  CONVERSATION = 'conversation',
  EXPLORATION = 'exploration',
  ACHIEVEMENT = 'achievement',
  MANUAL = 'manual',
}

export class StateUpdateDto {
  @ApiProperty({ description: '饥饿度变化 (-100 to 100)', minimum: -100, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  hungerChange?: number;

  @ApiProperty({ description: '疲劳度变化 (-100 to 100)', minimum: -100, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  fatigueChange?: number;

  @ApiProperty({ description: '快乐度变化 (-100 to 100)', minimum: -100, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  happinessChange?: number;

  @ApiProperty({ description: '健康度变化 (-100 to 100)', minimum: -100, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  healthChange?: number;

  @ApiProperty({ description: '社交需求变化 (-100 to 100)', minimum: -100, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  socialChange?: number;

  @ApiProperty({ description: '学习欲望变化 (-100 to 100)', minimum: -100, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  learningChange?: number;

  @ApiProperty({ description: '创造力激发变化 (-100 to 100)', minimum: -100, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  creativityChange?: number;

  @ApiProperty({ description: '探索欲变化 (-100 to 100)', minimum: -100, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  explorationChange?: number;

  @ApiProperty({ description: '新情绪', enum: PetMood, required: false })
  @IsOptional()
  @IsEnum(PetMood)
  newMood?: PetMood;

  @ApiProperty({ description: '新活动', enum: PetActivity, required: false })
  @IsOptional()
  @IsEnum(PetActivity)
  newActivity?: PetActivity;

  @ApiProperty({ description: '更新触发器', enum: StateUpdateTrigger })
  @IsEnum(StateUpdateTrigger)
  trigger!: StateUpdateTrigger;

  @ApiProperty({ description: '更新原因描述', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: '更新上下文数据', required: false })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class StateHistoryDto {
  @ApiProperty({ description: '历史记录ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: '宠物ID' })
  @IsString()
  petId!: string;

  @ApiProperty({ description: '更新前状态', required: false })
  @IsOptional()
  @IsObject()
  previousState?: Record<string, any>;

  @ApiProperty({ description: '更新后状态' })
  @IsObject()
  newState!: Record<string, any>;

  @ApiProperty({ description: '状态变化量' })
  @IsObject()
  stateChanges!: Record<string, number>;

  @ApiProperty({ description: '更新触发器', enum: StateUpdateTrigger })
  @IsEnum(StateUpdateTrigger)
  trigger!: StateUpdateTrigger;

  @ApiProperty({ description: '更新原因描述', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: '更新时间' })
  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiProperty({ description: '更新上下文数据', required: false })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class StateInteractionDto {
  @ApiProperty({ description: '交互类型' })
  @IsString()
  interactionType!: string;

  @ApiProperty({ description: '交互强度 (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  intensity!: number;

  @ApiProperty({ description: '交互持续时间（分钟）', required: false })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiProperty({ description: '交互内容', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: '交互上下文数据', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}