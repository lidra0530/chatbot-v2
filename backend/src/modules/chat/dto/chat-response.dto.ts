import { ApiProperty } from '@nestjs/swagger';

/**
 * 个性影响信息
 */
export class PersonalityInfluenceDto {
  @ApiProperty({ description: '主导特质', example: 'openness' })
  dominantTrait!: string;

  @ApiProperty({ 
    description: '特质数值',
    example: { openness: 78, extraversion: 65, agreeableness: 82 }
  })
  traitValues!: Record<string, number>;
}

/**
 * 状态影响信息
 */
export class StateInfluenceDto {
  @ApiProperty({ description: '当前情绪', example: 'happy' })
  currentMood!: string;

  @ApiProperty({ description: '能量等级', example: 80 })
  energyLevel!: number;

  @ApiProperty({ description: '健康状况', example: 'excellent' })
  healthStatus!: string;
}

/**
 * 聊天响应元数据
 */
export class ChatResponseMetadataDto {
  @ApiProperty({ description: '个性影响信息', type: PersonalityInfluenceDto })
  personalityInfluence!: PersonalityInfluenceDto;

  @ApiProperty({ description: '状态影响信息', type: StateInfluenceDto })
  stateInfluence!: StateInfluenceDto;

  @ApiProperty({ description: '受影响的技能列表', example: ['communication', 'empathy'] })
  skillsAffected!: string[];

  @ApiProperty({ description: '处理时间（毫秒）', example: 1250 })
  processingTime!: number;

  @ApiProperty({ description: '使用的模型', example: 'qwen-turbo' })
  modelUsed!: string;

  @ApiProperty({ description: '是否来自缓存', example: false })
  cached!: boolean;

  @ApiProperty({ description: '回复质量评分 (0-1)', example: 0.89 })
  qualityScore!: number;

  @ApiProperty({ description: 'Token使用统计', required: false })
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  @ApiProperty({ description: '对话分析结果', required: false })
  analysis?: {
    interactionType: string;
    emotionalTone: number;
    topicComplexity: number;
    keywords: string[];
  };

  @ApiProperty({ description: '额外元数据', required: false })
  additionalData?: Record<string, any>;
}

/**
 * 增强版聊天响应DTO
 */
export class ChatResponseDto {
  @ApiProperty({ description: '消息ID', example: '507f1f77bcf86cd799439013' })
  id!: string;

  @ApiProperty({ description: '对话ID', example: '507f1f77bcf86cd799439012' })
  conversationId!: string;

  @ApiProperty({ 
    description: 'AI回复内容', 
    example: '你好！我今天过得很好，谢谢你的关心！作为一个好奇心很强的AI，我很想听听你今天有什么有趣的发现呢？'
  })
  message!: string;

  @ApiProperty({ description: '响应时间戳', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: Date;

  @ApiProperty({ 
    description: '扩展响应元数据 - 包含个性、状态、技能等完整信息',
    type: ChatResponseMetadataDto
  })
  metadata!: ChatResponseMetadataDto;
}