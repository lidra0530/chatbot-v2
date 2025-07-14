import { ApiProperty } from '@nestjs/swagger';

export class PetDto {
  @ApiProperty({ description: '宠物ID', example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ description: '宠物名称', example: '小可爱' })
  name!: string;

  @ApiProperty({ description: '宠物品种', example: '虚拟猫' })
  breed!: string;

  @ApiProperty({ description: '宠物描述', example: '一只可爱的虚拟宠物', required: false })
  description?: string;

  @ApiProperty({ description: '头像URL', example: 'https://example.com/avatar.png', required: false })
  avatarUrl?: string;

  @ApiProperty({ description: '等级', example: 1 })
  level!: number;

  @ApiProperty({ description: '经验值', example: 0 })
  experience!: number;

  @ApiProperty({ 
    description: '个性特质',
    example: {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }
  })
  personality!: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };

  @ApiProperty({ 
    description: '当前状态',
    example: {
      happiness: 0.7,
      energy: 0.8,
      hunger: 0.3,
      health: 1.0,
      social: 0.5,
    }
  })
  currentState!: {
    happiness: number;
    energy: number;
    hunger: number;
    health: number;
    social: number;
  };

  @ApiProperty({ 
    description: '技能树',
    example: {
      unlockedSkills: [],
      availableSkills: ['basic_chat', 'greeting'],
      skillPoints: 0,
    }
  })
  skillTree!: {
    unlockedSkills: string[];
    availableSkills: string[];
    skillPoints: number;
  };

  @ApiProperty({ description: '进化阶段', example: 'basic' })
  evolutionStage!: string;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}