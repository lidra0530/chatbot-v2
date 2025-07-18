import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

/**
 * 宠物上下文参数
 */
export class PetContextDto {
  @ApiProperty({ description: '强制刷新宠物状态', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  forceRefreshState?: boolean;

  @ApiProperty({ description: '包含技能信息', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  includeSkills?: boolean;

  @ApiProperty({ description: '包含个性历史', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  includePersonalityHistory?: boolean;

  @ApiProperty({ description: '对话上下文长度', example: 10, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  contextLength?: number;
}

/**
 * 增强版聊天完成请求DTO
 */
export class ChatCompletionDto {
  @ApiProperty({ description: '宠物ID', example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  petId!: string;

  @ApiProperty({ description: '对话ID（可选，不提供则创建新对话）', example: '507f1f77bcf86cd799439012', required: false })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({ description: '用户消息内容', example: '你好，今天过得怎么样？' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ 
    description: '宠物上下文配置 - 控制如何获取和使用宠物相关信息',
    type: PetContextDto,
    required: false
  })
  @IsOptional()
  petContext?: PetContextDto;

  @ApiProperty({ 
    description: '消息元数据 - 额外的上下文信息', 
    required: false,
    example: {
      timestamp: '2024-01-01T00:00:00.000Z',
      messageType: 'text',
      context: 'casual_chat',
      userEmotion: 'happy',
      priority: 'normal'
    }
  })
  @IsOptional()
  metadata?: {
    timestamp?: string;
    messageType?: string;
    context?: string;
    userEmotion?: string;
    priority?: 'low' | 'normal' | 'high';
    [key: string]: any;
  };

  @ApiProperty({ description: '是否使用流式响应', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiProperty({ 
    description: '温度参数（影响回复随机性，0-1）', 
    example: 0.7, 
    required: false,
    minimum: 0,
    maximum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiProperty({ 
    description: '最大回复长度（Token数量）', 
    example: 1000, 
    required: false,
    minimum: 50,
    maximum: 4000
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(4000)
  maxTokens?: number;

  @ApiProperty({ 
    description: 'Top-p 采样参数（影响创造性，0-1）', 
    example: 0.9, 
    required: false,
    minimum: 0,
    maximum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiProperty({ 
    description: '是否跳过缓存（强制重新生成）', 
    example: false, 
    required: false
  })
  @IsOptional()
  @IsBoolean()
  skipCache?: boolean;

  @ApiProperty({ 
    description: '是否启用质量评分', 
    example: true, 
    required: false
  })
  @IsOptional()
  @IsBoolean()
  enableQualityScoring?: boolean;
}