import {
  Controller,
  Post,
  Get,
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

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取聊天性能指标' })
  @ApiResponse({ status: 200, description: '性能指标数据' })
  async getChatMetrics() {
    return this.chatService.getChatPerformanceMetrics();
  }

  @Get('metrics/detailed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取详细性能报告' })
  @ApiResponse({ status: 200, description: '详细性能报告' })
  async getDetailedMetrics() {
    return this.chatService.getDetailedPerformanceReport();
  }

  @Post('metrics/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重置性能指标' })
  @ApiResponse({ status: 200, description: '指标重置成功' })
  async resetMetrics() {
    this.chatService.resetPerformanceMetrics();
    return { message: '性能指标已重置' };
  }

  @Get('cache/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取缓存统计' })
  @ApiResponse({ status: 200, description: '缓存统计数据' })
  async getCacheStats() {
    return this.chatService.getCacheStats();
  }

  @Post('cache/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '清空缓存' })
  @ApiResponse({ status: 200, description: '缓存清空成功' })
  async clearCache() {
    this.chatService.clearCache();
    return { message: '缓存已清空' };
  }

  @Get('usage/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取用户使用统计' })
  @ApiResponse({ status: 200, description: '用户使用统计数据' })
  async getUserUsage(@CurrentUser() currentUserId: string) {
    return this.chatService.getUserUsageStats(currentUserId);
  }

  @Get('cost/global')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取全局成本统计' })
  @ApiResponse({ status: 200, description: '全局成本统计数据' })
  async getGlobalCostStats() {
    return this.chatService.getGlobalCostStats();
  }

  @Get('cost/report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取成本报告' })
  @ApiResponse({ status: 200, description: '详细成本报告' })
  async getCostReport() {
    return this.chatService.getCostReport();
  }
}