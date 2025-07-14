import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatCompletionDto } from './dto/chat-completion.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('completions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送聊天消息' })
  @ApiResponse({ status: 200, description: '聊天响应成功', type: ChatResponseDto })
  async chatCompletion(
    @CurrentUser() userId: string,
    @Body() chatCompletionDto: ChatCompletionDto,
  ): Promise<ChatResponseDto> {
    return this.chatService.processChat(userId, chatCompletionDto);
  }

  @Post('stream')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '流式聊天响应' })
  @ApiResponse({ status: 200, description: '流式聊天响应' })
  async streamChat(
    @CurrentUser() userId: string,
    @Body() chatCompletionDto: ChatCompletionDto,
  ) {
    return this.chatService.processStreamChat(userId, chatCompletionDto);
  }
}