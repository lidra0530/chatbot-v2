import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TaskMonitoringService } from './task-monitoring.service';
import { TaskHealthService } from './task-health.service';
import { PersonalityEvolutionTask } from './personality-evolution.task';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly taskMonitoringService: TaskMonitoringService,
    private readonly taskHealthService: TaskHealthService,
    private readonly personalityEvolutionTask: PersonalityEvolutionTask,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Get task health status' })
  @ApiResponse({ status: 200, description: 'Task health status retrieved successfully' })
  async getTaskHealth() {
    return await this.taskMonitoringService.getTaskHealthStatus();
  }

  @Get('health/detailed')
  @ApiOperation({ summary: 'Get detailed health report' })
  @ApiResponse({ status: 200, description: 'Detailed health report retrieved successfully' })
  async getDetailedHealthReport() {
    return await this.taskHealthService.getDetailedHealthReport();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get task performance metrics' })
  @ApiResponse({ status: 200, description: 'Task performance metrics retrieved successfully' })
  async getTaskMetrics() {
    return await this.taskMonitoringService.getPerformanceMetrics();
  }

  @Get('evolution/stats')
  @ApiOperation({ summary: 'Get personality evolution task stats' })
  @ApiResponse({ status: 200, description: 'Evolution task stats retrieved successfully' })
  async getEvolutionStats() {
    return {
      stats: this.personalityEvolutionTask.getProcessingStats(),
      isProcessing: this.personalityEvolutionTask.isCurrentlyProcessing(),
    };
  }

  @Post('evolution/trigger')
  @ApiOperation({ summary: 'Manually trigger batch personality evolution' })
  @ApiResponse({ status: 200, description: 'Batch evolution triggered successfully' })
  async triggerBatchEvolution() {
    // 异步执行，避免阻塞请求
    setImmediate(() => {
      this.personalityEvolutionTask.handleBatchPersonalityEvolution();
    });
    
    return {
      message: 'Batch personality evolution task triggered',
      timestamp: new Date(),
    };
  }

  @Post('analytics/trigger')
  @ApiOperation({ summary: 'Manually trigger personality analytics update' })
  @ApiResponse({ status: 200, description: 'Analytics update triggered successfully' })
  async triggerAnalyticsUpdate() {
    // 异步执行，避免阻塞请求
    setImmediate(() => {
      this.personalityEvolutionTask.handlePersonalityAnalyticsUpdate();
    });
    
    return {
      message: 'Personality analytics update task triggered',
      timestamp: new Date(),
    };
  }

  @Post('evolution/realtime/:petId')
  @ApiOperation({ summary: 'Trigger real-time evolution for specific pet' })
  @ApiResponse({ status: 200, description: 'Real-time evolution triggered successfully' })
  async triggerRealTimeEvolution(
    @Param('petId') petId: string,
  ) {
    const interactionData = {
      type: 'manual_trigger',
      content: 'Manual real-time evolution trigger',
      timestamp: new Date(),
      userId: 'system',
      context: {
        source: 'manual_trigger',
        triggeredAt: new Date(),
      }
    };

    try {
      await this.personalityEvolutionTask.handleRealTimeEvolution(petId, interactionData);
      return {
        message: 'Real-time evolution triggered successfully',
        petId,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        message: 'Real-time evolution failed',
        petId,
        error: (error as Error).message,
        timestamp: new Date(),
      };
    }
  }
}