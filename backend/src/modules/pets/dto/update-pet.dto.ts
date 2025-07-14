import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsNumber, Min, Max } from 'class-validator';

export class UpdatePetDto {
  @ApiProperty({ description: '宠物名称', example: '小可爱', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '宠物描述', example: '一只可爱的虚拟宠物', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '头像URL', example: 'https://example.com/avatar.png', required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ 
    description: '个性特质', 
    required: false,
    example: {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }
  })
  @IsObject()
  @IsOptional()
  personality?: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };

  @ApiProperty({ 
    description: '当前状态', 
    required: false,
    example: {
      happiness: 0.7,
      energy: 0.8,
      hunger: 0.3,
      health: 1.0,
      social: 0.5,
    }
  })
  @IsObject()
  @IsOptional()
  currentState?: {
    happiness: number;
    energy: number;
    hunger: number;
    health: number;
    social: number;
  };

  @ApiProperty({ 
    description: '技能树', 
    required: false,
    example: {
      unlockedSkills: [],
      availableSkills: ['basic_chat', 'greeting'],
      skillPoints: 0,
    }
  })
  @IsObject()
  @IsOptional()
  skillTree?: {
    unlockedSkills: string[];
    availableSkills: string[];
    skillPoints: number;
  };

  @ApiProperty({ description: '等级', example: 1, required: false })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  level?: number;

  @ApiProperty({ description: '经验值', example: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  experience?: number;

  @ApiProperty({ description: '进化阶段', example: 'basic', required: false })
  @IsString()
  @IsOptional()
  evolutionStage?: string;
}