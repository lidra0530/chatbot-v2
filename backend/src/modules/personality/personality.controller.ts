import { Controller, Get, Post, Put, Param, Body, UseGuards, HttpException, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PersonalityService } from './personality.service';
import { PersonalityTraits, PersonalityAnalytics, EvolutionSettings } from './interfaces/personality.interface';
import { IsOptional, IsBoolean, IsString, IsNumber, IsObject } from 'class-validator';

// DTO classes for validation
class PersonalityDetailsQuery {
  @IsOptional()
  @IsBoolean()
  includeAnalytics?: boolean;

  @IsOptional()
  @IsBoolean()
  includeHistory?: boolean;
}

class TriggerEvolutionDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

class UpdateEvolutionSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  evolutionRate?: number;

  @IsOptional()
  @IsNumber()
  stabilityThreshold?: number;

  @IsOptional()
  @IsNumber()
  maxDailyChange?: number;

  @IsOptional()
  @IsNumber()
  maxWeeklyChange?: number;

  @IsOptional()
  @IsNumber()
  maxMonthlyChange?: number;

  @IsOptional()
  @IsObject()
  traitLimits?: any;

  @IsOptional()
  @IsObject()
  triggers?: any;
}

@ApiTags('personality')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pets/:petId/personality')
export class PersonalityController {
  constructor(private readonly personalityService: PersonalityService) {}

  @Get()
  @ApiOperation({ summary: '获取宠物个性详情' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiResponse({ status: 200, description: '成功获取个性详情' })
  @ApiResponse({ status: 404, description: '宠物不存在' })
  async getPersonalityDetails(
    @Param('petId') petId: string,
    @Query() query: PersonalityDetailsQuery,
  ) {
    try {
      const details = await this.personalityService.getPersonalityDetails(petId);
      
      if (query.includeAnalytics) {
        const analytics = await this.personalityService.getPersonalityAnalytics(petId);
        return { ...details, analytics };
      }
      
      if (query.includeHistory) {
        const history = await this.personalityService.getPersonalityHistory(petId);
        return { ...details, history };
      }
      
      return details;
    } catch (error) {
      throw new HttpException(
        (error as Error).message || '获取个性详情失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('analytics')
  @ApiOperation({ summary: '获取个性分析报告' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiResponse({ status: 200, description: '成功获取个性分析报告' })
  @ApiResponse({ status: 404, description: '宠物不存在' })
  async getPersonalityAnalytics(@Param('petId') petId: string): Promise<PersonalityAnalytics> {
    try {
      return await this.personalityService.getPersonalityAnalytics(petId);
    } catch (error) {
      throw new HttpException(
        (error as Error).message || '获取个性分析报告失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('history')
  @ApiOperation({ summary: '获取个性演化历史' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiResponse({ status: 200, description: '成功获取演化历史' })
  @ApiResponse({ status: 404, description: '宠物不存在' })
  async getPersonalityHistory(@Param('petId') petId: string) {
    try {
      return await this.personalityService.getPersonalityHistory(petId);
    } catch (error) {
      throw new HttpException(
        (error as Error).message || '获取演化历史失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('trigger-evolution')
  @ApiOperation({ summary: '手动触发个性演化' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiResponse({ status: 200, description: '成功触发演化' })
  @ApiResponse({ status: 404, description: '宠物不存在' })
  @ApiResponse({ status: 400, description: '演化触发失败' })
  async triggerPersonalityEvolution(
    @Param('petId') petId: string,
    @Body() body: TriggerEvolutionDto,
  ) {
    try {
      // 先获取当前个性状态
      const currentPersonality = await this.personalityService.getPersonalityDetails(petId);
      
      // 创建模拟的交互数据来触发演化
      const interactionData = {
        type: 'manual_trigger',
        reason: body.reason || '手动触发演化',
        force: body.force || false,
        timestamp: new Date(),
        intensity: 1.0
      };
      
      // 执行演化增量处理
      await this.personalityService.processEvolutionIncrement(petId, interactionData);
      
      // 获取更新后的个性状态
      const updatedPersonality = await this.personalityService.getPersonalityDetails(petId);
      
      return {
        success: true,
        message: '演化触发成功',
        before: currentPersonality,
        after: updatedPersonality,
        trigger: interactionData
      };
    } catch (error) {
      throw new HttpException(
        (error as Error).message || '触发演化失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze')
  @ApiOperation({ summary: '触发个性分析' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiResponse({ status: 200, description: '成功触发分析' })
  @ApiResponse({ status: 404, description: '宠物不存在' })
  async triggerPersonalityAnalysis(@Param('petId') petId: string) {
    try {
      return await this.personalityService.triggerPersonalityAnalysis(petId);
    } catch (error) {
      throw new HttpException(
        (error as Error).message || '触发个性分析失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('evolution-settings')
  @ApiOperation({ summary: '更新演化参数设置' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiResponse({ status: 200, description: '成功更新演化设置' })
  @ApiResponse({ status: 404, description: '宠物不存在' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  async updateEvolutionSettings(
    @Param('petId') petId: string,
    @Body() settings: UpdateEvolutionSettingsDto,
  ): Promise<EvolutionSettings> {
    try {
      // 获取当前设置
      const currentSettings = await this.personalityService.getEvolutionSettings(petId);
      
      // 合并新设置
      const updatedSettings: EvolutionSettings = {
        ...currentSettings,
        ...settings,
        // 确保关键字段不为空
        traitLimits: settings.traitLimits || currentSettings.traitLimits,
        triggers: settings.triggers || currentSettings.triggers
      };
      
      // 验证设置的有效性
      this.validateEvolutionSettings(updatedSettings);
      
      return await this.personalityService.updateEvolutionSettings(petId, updatedSettings);
    } catch (error) {
      throw new HttpException(
        (error as Error).message || '更新演化设置失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('evolution-settings')
  @ApiOperation({ summary: '获取演化参数设置' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiResponse({ status: 200, description: '成功获取演化设置' })
  @ApiResponse({ status: 404, description: '宠物不存在' })
  async getEvolutionSettings(@Param('petId') petId: string): Promise<EvolutionSettings> {
    try {
      return await this.personalityService.getEvolutionSettings(petId);
    } catch (error) {
      throw new HttpException(
        (error as Error).message || '获取演化设置失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('settings')
  @ApiOperation({ summary: '更新个性特质设置' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiResponse({ status: 200, description: '成功更新个性设置' })
  @ApiResponse({ status: 404, description: '宠物不存在' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  async updatePersonalitySettings(
    @Param('petId') petId: string,
    @Body() traits: PersonalityTraits,
  ): Promise<PersonalityTraits> {
    try {
      // 验证特质值的有效性
      this.validatePersonalityTraits(traits);
      
      return await this.personalityService.updatePersonalityTraits(petId, traits);
    } catch (error) {
      throw new HttpException(
        (error as Error).message || '更新个性设置失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 私有验证方法
  private validatePersonalityTraits(traits: PersonalityTraits): void {
    const traitNames = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    
    for (const trait of traitNames) {
      if (traits[trait] !== undefined) {
        if (typeof traits[trait] !== 'number' || traits[trait] < 0 || traits[trait] > 100) {
          throw new Error(`特质 ${trait} 的值必须在 0-100 之间`);
        }
      }
    }
  }

  private validateEvolutionSettings(settings: EvolutionSettings): void {
    if (settings.evolutionRate !== undefined && (settings.evolutionRate < 0 || settings.evolutionRate > 10)) {
      throw new Error('演化速率必须在 0-10 之间');
    }
    
    if (settings.stabilityThreshold !== undefined && (settings.stabilityThreshold < 0 || settings.stabilityThreshold > 1)) {
      throw new Error('稳定性阈值必须在 0-1 之间');
    }
    
    if (settings.maxDailyChange !== undefined && settings.maxDailyChange < 0) {
      throw new Error('每日最大变化不能为负数');
    }
    
    if (settings.maxWeeklyChange !== undefined && settings.maxWeeklyChange < 0) {
      throw new Error('每周最大变化不能为负数');
    }
    
    if (settings.maxMonthlyChange !== undefined && settings.maxMonthlyChange < 0) {
      throw new Error('每月最大变化不能为负数');
    }
  }
}