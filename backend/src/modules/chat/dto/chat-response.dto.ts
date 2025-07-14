import { ApiProperty } from '@nestjs/swagger';

export class ChatResponseDto {
  @ApiProperty({ description: '消息ID', example: '507f1f77bcf86cd799439013' })
  id!: string;

  @ApiProperty({ description: '对话ID', example: '507f1f77bcf86cd799439012' })
  conversationId!: string;

  @ApiProperty({ description: 'AI回复内容', example: '你好！我今天过得很好，谢谢你的关心！' })
  message!: string;

  @ApiProperty({ description: '响应时间戳', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: Date;

  @ApiProperty({ 
    description: '响应元数据',
    example: {
      personalityInfluence: { trait: 'extraversion', value: 0.7 },
      stateInfluence: { state: 'happiness', value: 0.8 },
      processingTime: 120,
      modelUsed: 'qwen-turbo'
    },
    required: false
  })
  metadata?: {
    personalityInfluence?: {
      trait: string;
      value: number;
    };
    stateInfluence?: {
      state: string;
      value: number;
    };
    processingTime?: number;
    modelUsed?: string;
    [key: string]: any;
  };
}