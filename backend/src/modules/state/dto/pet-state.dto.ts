import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsDate, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum PetMood {
  HAPPY = 'happy',
  EXCITED = 'excited',
  CALM = 'calm',
  SLEEPY = 'sleepy',
  CURIOUS = 'curious',
  PLAYFUL = 'playful',
  FOCUSED = 'focused',
  RELAXED = 'relaxed',
  ENERGETIC = 'energetic',
  THOUGHTFUL = 'thoughtful',
}

export enum PetActivity {
  SLEEPING = 'sleeping',
  PLAYING = 'playing',
  LEARNING = 'learning',
  CHATTING = 'chatting',
  EXPLORING = 'exploring',
  RESTING = 'resting',
  THINKING = 'thinking',
  CREATING = 'creating',
}

export class PetStateDto {
  @ApiProperty({ description: '宠物ID' })
  @IsString()
  petId!: string;

  @ApiProperty({ description: '饥饿度 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  hunger!: number;

  @ApiProperty({ description: '疲劳度 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  fatigue!: number;

  @ApiProperty({ description: '快乐度 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  happiness!: number;

  @ApiProperty({ description: '健康度 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  health!: number;

  @ApiProperty({ description: '社交需求 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  social!: number;

  @ApiProperty({ description: '学习欲望 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  learning!: number;

  @ApiProperty({ description: '创造力激发 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  creativity!: number;

  @ApiProperty({ description: '探索欲 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  exploration!: number;

  @ApiProperty({ description: '当前情绪', enum: PetMood })
  @IsEnum(PetMood)
  mood!: PetMood;

  @ApiProperty({ description: '当前活动', enum: PetActivity })
  @IsEnum(PetActivity)
  currentActivity!: PetActivity;

  @ApiProperty({ description: '能量等级 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  energyLevel!: number;

  @ApiProperty({ description: '注意力集中度 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  attention!: number;

  @ApiProperty({ description: '状态最后更新时间' })
  @IsDate()
  @Type(() => Date)
  lastUpdated!: Date;

  @ApiProperty({ description: '状态描述', required: false })
  @IsOptional()
  @IsString()
  stateDescription?: string;
}

export class CreatePetStateDto {
  @ApiProperty({ description: '宠物ID' })
  @IsString()
  petId!: string;

  @ApiProperty({ description: '饥饿度 (0-100)', minimum: 0, maximum: 100, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  hunger?: number = 50;

  @ApiProperty({ description: '疲劳度 (0-100)', minimum: 0, maximum: 100, default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fatigue?: number = 30;

  @ApiProperty({ description: '快乐度 (0-100)', minimum: 0, maximum: 100, default: 70 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  happiness?: number = 70;

  @ApiProperty({ description: '健康度 (0-100)', minimum: 0, maximum: 100, default: 90 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  health?: number = 90;

  @ApiProperty({ description: '社交需求 (0-100)', minimum: 0, maximum: 100, default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  social?: number = 60;

  @ApiProperty({ description: '学习欲望 (0-100)', minimum: 0, maximum: 100, default: 80 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  learning?: number = 80;

  @ApiProperty({ description: '创造力激发 (0-100)', minimum: 0, maximum: 100, default: 65 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  creativity?: number = 65;

  @ApiProperty({ description: '探索欲 (0-100)', minimum: 0, maximum: 100, default: 75 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  exploration?: number = 75;

  @ApiProperty({ description: '当前情绪', enum: PetMood, default: PetMood.HAPPY })
  @IsOptional()
  @IsEnum(PetMood)
  mood?: PetMood = PetMood.HAPPY;

  @ApiProperty({ description: '当前活动', enum: PetActivity, default: PetActivity.RESTING })
  @IsOptional()
  @IsEnum(PetActivity)
  currentActivity?: PetActivity = PetActivity.RESTING;

  @ApiProperty({ description: '状态描述', required: false })
  @IsOptional()
  @IsString()
  stateDescription?: string;
}