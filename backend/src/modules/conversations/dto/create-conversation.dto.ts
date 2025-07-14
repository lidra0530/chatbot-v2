import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ description: '对话标题', example: '与小可爱的聊天' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: '宠物ID', example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  petId!: string;

  @ApiProperty({ 
    description: '对话元数据',
    required: false,
    example: {
      theme: 'casual',
      startTime: '2024-01-01T00:00:00.000Z',
      context: 'daily_chat'
    }
  })
  @IsOptional()
  metadata?: {
    theme?: string;
    startTime?: string;
    context?: string;
    [key: string]: any;
  };
}