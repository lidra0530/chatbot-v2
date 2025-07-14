import { ApiProperty } from '@nestjs/swagger';

export class ConversationDto {
  @ApiProperty({ description: '对话ID', example: '507f1f77bcf86cd799439012' })
  id!: string;

  @ApiProperty({ description: '对话标题', example: '与小可爱的聊天' })
  title!: string;

  @ApiProperty({ description: '宠物ID', example: '507f1f77bcf86cd799439011' })
  petId!: string;

  @ApiProperty({ description: '宠物名称', example: '小可爱', required: false })
  petName?: string;

  @ApiProperty({ description: '宠物品种', example: '虚拟猫', required: false })
  petBreed?: string;

  @ApiProperty({ description: '消息数量', example: 15 })
  messageCount!: number;

  @ApiProperty({ 
    description: '对话元数据',
    required: false,
    example: {
      theme: 'casual',
      startTime: '2024-01-01T00:00:00.000Z',
      context: 'daily_chat'
    }
  })
  metadata?: {
    theme?: string;
    startTime?: string;
    context?: string;
    [key: string]: any;
  };

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}