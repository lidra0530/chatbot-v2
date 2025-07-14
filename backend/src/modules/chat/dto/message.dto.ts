import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class MessageDto {
  @ApiProperty({ description: '消息ID', example: '507f1f77bcf86cd799439013' })
  id!: string;

  @ApiProperty({ description: '对话ID', example: '507f1f77bcf86cd799439012' })
  conversationId!: string;

  @ApiProperty({ description: '消息角色', example: 'user', enum: ['user', 'assistant', 'system'] })
  role!: 'user' | 'assistant' | 'system';

  @ApiProperty({ description: '消息内容', example: '你好，今天过得怎么样？' })
  content!: string;

  @ApiProperty({ 
    description: '消息元数据',
    example: {
      timestamp: '2024-01-01T00:00:00.000Z',
      personalityInfluence: { trait: 'extraversion', value: 0.7 },
      stateInfluence: { state: 'happiness', value: 0.8 }
    },
    required: false
  })
  metadata?: {
    timestamp?: string;
    personalityInfluence?: {
      trait: string;
      value: number;
    };
    stateInfluence?: {
      state: string;
      value: number;
    };
    [key: string]: any;
  };

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class CreateMessageDto {
  @ApiProperty({ description: '对话ID', example: '507f1f77bcf86cd799439012' })
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @ApiProperty({ description: '消息角色', example: 'user', enum: ['user', 'assistant', 'system'] })
  @IsString()
  @IsIn(['user', 'assistant', 'system'])
  role!: 'user' | 'assistant' | 'system';

  @ApiProperty({ description: '消息内容', example: '你好，今天过得怎么样？' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ 
    description: '消息元数据',
    required: false,
    example: {
      timestamp: '2024-01-01T00:00:00.000Z',
      personalityInfluence: { trait: 'extraversion', value: 0.7 },
      stateInfluence: { state: 'happiness', value: 0.8 }
    }
  })
  @IsOptional()
  metadata?: {
    timestamp?: string;
    personalityInfluence?: {
      trait: string;
      value: number;
    };
    stateInfluence?: {
      state: string;
      value: number;
    };
    [key: string]: any;
  };
}