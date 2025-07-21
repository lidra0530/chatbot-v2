import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  UsePipes,
  ValidationPipe,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
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
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  /**
   * 增强版聊天完成端点 - 集成个性、状态、技能的智能对话
   */

  @Post('completions')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ 
    summary: '增强版聊天完成 - 集成个性、状态、技能的智能对话',
    description: `
    这是一个功能完整的聊天端点，集成了：
    - 🧠 个性化对话：基于宠物个性特征生成个性化回复
    - 🎭 状态感知：根据宠物当前状态调整对话风格
    - 🌟 技能系统：对话自动触发技能经验增长
    - 🎯 个性演化：分析对话内容自动调整个性特征
    - 🚀 性能优化：智能缓存、成本控制、质量监控
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: '聊天响应成功 - 包含完整的个性化对话结果和元数据', 
    type: ChatResponseDto,
    schema: {
      example: {
        id: '507f1f77bcf86cd799439013',
        conversationId: '507f1f77bcf86cd799439012',
        message: '你好！我今天过得很好，谢谢你的关心！作为一个好奇心很强的AI，我很想听听你今天有什么有趣的发现呢？',
        timestamp: '2024-01-01T00:00:00.000Z',
        metadata: {
          personalityInfluence: {
            dominantTrait: 'openness',
            traitValues: {
              openness: 78,
              extraversion: 65,
              agreeableness: 82
            }
          },
          stateInfluence: {
            currentMood: 'happy',
            energyLevel: 80,
            healthStatus: 'excellent'
          },
          skillsAffected: ['communication', 'empathy'],
          processingTime: 1250,
          modelUsed: 'qwen-turbo',
          cached: false,
          qualityScore: 0.89
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '无权访问此宠物' })
  @ApiResponse({ status: 429, description: '请求频率超限' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  async chatCompletion(
    @CurrentUser() userId: string,
    @Body() chatCompletionDto: ChatCompletionDto,
  ): Promise<ChatResponseDto> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Chat completion request from user ${userId} for pet ${chatCompletionDto.petId}`);
      
      const result = await this.chatService.processEnhancedChat(userId, chatCompletionDto);
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`Chat completion successful: ${processingTime}ms, message length: ${result.message.length}`);
      
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Chat completion failed after ${processingTime}ms:`, error);
      throw error;
    }
  }

  @Post('stream')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ 
    summary: '流式聊天响应 - 实时对话体验',
    description: '提供实时的流式聊天响应，适合需要即时反馈的场景'
  })
  @ApiResponse({ status: 200, description: '流式聊天响应成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '无权访问此宠物' })
  @ApiResponse({ status: 501, description: '流式响应功能暂未实现' })
  async streamChat(
    @CurrentUser() userId: string,
    @Body() chatCompletionDto: ChatCompletionDto,
  ) {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Stream chat request from user ${userId} for pet ${chatCompletionDto.petId}`);
      
      const result = await this.chatService.processStreamChat(userId, chatCompletionDto);
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`Stream chat initiated: ${processingTime}ms`);
      
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Stream chat failed after ${processingTime}ms:`, error);
      throw error;
    }
  }

  /**
   * 聊天质量监控和管理端点
   */

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '获取聊天性能指标',
    description: '返回实时的聊天性能统计数据，包括响应时间、成功率、吞吐量等'
  })
  @ApiResponse({ 
    status: 200, 
    description: '性能指标数据',
    schema: {
      example: {
        totalRequests: 12847,
        successRate: 0.994,
        averageResponseTime: 1250,
        requestsPerMinute: 45.2,
        errorRate: 0.006,
        lastUpdated: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  async getChatMetrics() {
    try {
      this.logger.debug('Retrieving chat performance metrics');
      const metrics = await this.chatService.getChatPerformanceMetrics();
      return metrics;
    } catch (error) {
      this.logger.error('Failed to get chat metrics:', error);
      throw error;
    }
  }

  @Get('metrics/detailed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '获取详细性能报告',
    description: '返回详细的聊天系统性能分析报告，包括各个组件的性能指标'
  })
  @ApiResponse({ 
    status: 200, 
    description: '详细性能报告',
    schema: {
      example: {
        overview: {
          totalRequests: 12847,
          successRate: 0.994,
          averageResponseTime: 1250
        },
        breakdown: {
          llmProcessing: { averageTime: 890, percentage: 0.712 },
          personalityAnalysis: { averageTime: 120, percentage: 0.096 },
          skillsProcessing: { averageTime: 85, percentage: 0.068 },
          cacheOperations: { averageTime: 45, percentage: 0.036 },
          databaseOperations: { averageTime: 110, percentage: 0.088 }
        },
        trends: {
          hourlyStats: [],
          qualityMetrics: {
            averageQualityScore: 0.87,
            userSatisfactionRate: 0.92
          }
        }
      }
    }
  })
  async getDetailedMetrics() {
    try {
      this.logger.debug('Retrieving detailed chat performance report');
      const report = await this.chatService.getDetailedPerformanceReport();
      return report;
    } catch (error) {
      this.logger.error('Failed to get detailed metrics:', error);
      throw error;
    }
  }

  @Post('metrics/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '重置性能指标',
    description: '清空所有性能统计数据，重新开始统计'
  })
  @ApiResponse({ 
    status: 200, 
    description: '指标重置成功',
    schema: {
      example: {
        message: '性能指标已重置',
        timestamp: '2024-01-01T00:00:00.000Z',
        resetBy: 'user123'
      }
    }
  })
  async resetMetrics(@CurrentUser() userId: string) {
    try {
      this.logger.log(`Performance metrics reset by user ${userId}`);
      this.chatService.resetPerformanceMetrics();
      return { 
        message: '性能指标已重置',
        timestamp: new Date().toISOString(),
        resetBy: userId
      };
    } catch (error) {
      this.logger.error('Failed to reset metrics:', error);
      throw error;
    }
  }

  @Get('cache/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '获取缓存统计',
    description: '返回聊天系统缓存的使用情况和命中率统计'
  })
  @ApiResponse({ 
    status: 200, 
    description: '缓存统计数据',
    schema: {
      example: {
        hitRate: 0.78,
        totalRequests: 10450,
        cacheHits: 8151,
        cacheMisses: 2299,
        cacheSize: 1024,
        memoryUsage: '15.2MB',
        lastCleared: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  async getCacheStats() {
    try {
      this.logger.debug('Retrieving cache statistics');
      const stats = await this.chatService.getCacheStats();
      return stats;
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      throw error;
    }
  }

  @Post('cache/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '清空缓存',
    description: '清空所有聊天相关的缓存数据，包括个性提示词、对话历史等'
  })
  @ApiResponse({ 
    status: 200, 
    description: '缓存清空成功',
    schema: {
      example: {
        message: '缓存已清空',
        itemsCleared: 1024,
        timestamp: '2024-01-01T00:00:00.000Z',
        clearedBy: 'user123'
      }
    }
  })
  async clearCache(@CurrentUser() userId: string) {
    try {
      this.logger.log(`Cache cleared by user ${userId}`);
      this.chatService.clearCache();
      return { 
        message: '缓存已清空',
        timestamp: new Date().toISOString(),
        clearedBy: userId
      };
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * 成本控制和使用统计端点
   */

  @Get('usage/current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '获取当前用户使用统计',
    description: '返回当前用户的聊天使用情况，包括消息数量、Token消耗、成本统计等'
  })
  @ApiResponse({ 
    status: 200, 
    description: '用户使用统计数据',
    schema: {
      example: {
        userId: 'user123',
        totalMessages: 245,
        totalTokens: 45820,
        totalCost: 12.45,
        dailyUsage: {
          messages: 18,
          tokens: 3420,
          cost: 0.92
        },
        monthlyLimits: {
          messagesLimit: 1000,
          tokensLimit: 100000,
          costLimit: 50.00,
          remainingMessages: 755,
          remainingTokens: 54180,
          remainingCost: 37.55
        }
      }
    }
  })
  async getCurrentUserUsage(@CurrentUser() userId: string) {
    try {
      this.logger.debug(`Retrieving usage stats for user ${userId}`);
      const stats = await this.chatService.getUserUsageStats(userId);
      return stats;
    } catch (error) {
      this.logger.error(`Failed to get usage stats for user ${userId}:`, error);
      throw error;
    }
  }

  @Get('cost/global')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '获取全局成本统计',
    description: '返回整个聊天系统的成本统计数据，包括总体消费、各模型使用情况等'
  })
  @ApiResponse({ 
    status: 200, 
    description: '全局成本统计数据',
    schema: {
      example: {
        totalCost: 1247.85,
        totalTokens: 5820450,
        totalRequests: 18750,
        dailyCost: 45.20,
        monthlyCost: 1247.85,
        modelBreakdown: {
          'qwen-turbo': { requests: 15600, tokens: 4850320, cost: 1089.65 },
          'qwen-plus': { requests: 2850, tokens: 820130, cost: 142.18 },
          'qwen-max': { requests: 300, tokens: 150000, cost: 16.02 }
        }
      }
    }
  })
  async getGlobalCostStats() {
    try {
      this.logger.debug('Retrieving global cost statistics');
      const stats = await this.chatService.getGlobalCostStats();
      return stats;
    } catch (error) {
      this.logger.error('Failed to get global cost stats:', error);
      throw error;
    }
  }

  @Get('cost/report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '获取成本报告',
    description: '生成详细的成本分析报告，包括趋势分析、预测和优化建议'
  })
  @ApiResponse({ 
    status: 200, 
    description: '详细成本报告',
    schema: {
      example: {
        summary: {
          totalCost: 1247.85,
          averageCostPerRequest: 0.067,
          costEfficiency: 0.89
        },
        trends: {
          dailyTrend: 'increasing',
          weeklyAverage: 287.45,
          monthlyProjection: 1580.20
        },
        topUsers: [
          { userId: 'user123', cost: 89.45, percentage: 7.2 },
          { userId: 'user456', cost: 67.30, percentage: 5.4 }
        ],
        recommendations: [
          'Consider implementing response caching to reduce API calls',
          'Monitor high-usage users for potential optimization opportunities'
        ]
      }
    }
  })
  async getCostReport() {
    try {
      this.logger.debug('Generating detailed cost report');
      const report = await this.chatService.getCostReport();
      return report;
    } catch (error) {
      this.logger.error('Failed to generate cost report:', error);
      throw error;
    }
  }

  /**
   * 宠物上下文管理端点
   */

  @Delete('pet/:petId/cache')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '清空特定宠物的缓存',
    description: '清空指定宠物的所有缓存数据，包括个性提示词、对话历史等'
  })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiResponse({ 
    status: 200, 
    description: '宠物缓存清空成功',
    schema: {
      example: {
        message: '宠物缓存已清空',
        petId: '507f1f77bcf86cd799439011',
        itemsCleared: 15,
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  async clearPetCache(
    @CurrentUser() userId: string,
    @Body('petId') petId: string
  ) {
    try {
      this.logger.log(`Clearing cache for pet ${petId} by user ${userId}`);
      this.chatService.invalidatePetCache(petId);
      return { 
        message: '宠物缓存已清空',
        petId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to clear cache for pet ${petId}:`, error);
      throw error;
    }
  }
}