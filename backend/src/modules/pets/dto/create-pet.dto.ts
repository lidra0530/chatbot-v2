import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreatePetDto {
  @ApiProperty({ description: '宠物名称', example: '小可爱' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: '宠物品种', example: '虚拟猫' })
  @IsString()
  @IsNotEmpty()
  breed!: string;

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
}