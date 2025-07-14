import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ChatCompletionDto {
  @ApiProperty({ description: '宠物ID', example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  petId!: string;

  @ApiProperty({ description: '对话ID', example: '507f1f77bcf86cd799439012', required: false })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({ description: '用户消息内容', example: '你好，今天过得怎么样？' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ 
    description: '消息元数据', 
    required: false,
    example: {
      timestamp: '2024-01-01T00:00:00.000Z',
      messageType: 'text',
      context: 'casual_chat'
    }
  })
  @IsOptional()
  metadata?: {
    timestamp?: string;
    messageType?: string;
    context?: string;
    [key: string]: any;
  };

  @ApiProperty({ description: '是否使用流式响应', example: false, required: false })
  @IsOptional()
  stream?: boolean;

  @ApiProperty({ description: '温度参数（影响回复随机性）', example: 0.7, required: false })
  @IsOptional()
  temperature?: number;

  @ApiProperty({ description: '最大回复长度', example: 1000, required: false })
  @IsOptional()
  maxTokens?: number;
}