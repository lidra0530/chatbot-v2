import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Param, 
  Body, 
  Query, 
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiBearerAuth, 
  ApiResponse, 
  ApiParam, 
  ApiQuery, 
  ApiBody 
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SkillsService } from './skills.service';
import {
  SkillDto,
  SkillExperienceGainDto,
  SkillExperienceResultDto,
  SkillUnlockRequestDto,
  SkillUnlockResultDto,
  SkillUnlockEvaluationDto,
  AvailableSkillsDto,
  SkillStatisticsDto,
  SkillFilterDto,
  BulkSkillExperienceDto,
  CurrentAbilitiesDto,
  AutoExperienceConfigDto,
  ExperienceGrowthResultDto
} from './dto';

/**
 * 步骤170: 技能系统控制器
 * 实现技能相关API端点
 */
@ApiTags('skills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pets/:petId/skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: '获取宠物技能树', description: '获取指定宠物的完整技能树信息' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiQuery({ name: 'type', required: false, description: '技能类型过滤' })
  @ApiQuery({ name: 'status', required: false, description: '技能状态过滤' })
  @ApiQuery({ name: 'category', required: false, description: '技能分类过滤' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiResponse({ status: 200, description: '成功获取技能树', type: [SkillDto] })
  async getSkillTree(
    @Param('petId') petId: string,
    @Query(ValidationPipe) filter?: SkillFilterDto
  ): Promise<SkillDto[]> {
    return this.skillsService.getSkillTree(petId, filter);
  }

  @Get('available')
  @ApiOperation({ summary: '获取可解锁技能', description: '获取当前可以解锁的技能列表' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiResponse({ status: 200, description: '成功获取可解锁技能', type: AvailableSkillsDto })
  async getAvailableSkills(@Param('petId') petId: string): Promise<AvailableSkillsDto> {
    return this.skillsService.getAvailableSkills(petId);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取技能统计信息', description: '获取宠物技能系统的统计数据' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiResponse({ status: 200, description: '成功获取技能统计', type: SkillStatisticsDto })
  async getSkillStatistics(@Param('petId') petId: string): Promise<SkillStatisticsDto> {
    return this.skillsService.getSkillStatistics(petId);
  }

  @Get('abilities')
  @ApiOperation({ summary: '获取当前能力', description: '获取宠物当前拥有的所有能力' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiResponse({ status: 200, description: '成功获取当前能力', type: CurrentAbilitiesDto })
  async getCurrentAbilities(@Param('petId') petId: string): Promise<CurrentAbilitiesDto> {
    return this.skillsService.getCurrentAbilities(petId);
  }

  @Get(':skillId/evaluation')
  @ApiOperation({ summary: '评估技能解锁条件', description: '检查指定技能的解锁条件和进度' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiParam({ name: 'skillId', description: '技能ID' })
  @ApiResponse({ status: 200, description: '成功获取技能评估', type: SkillUnlockEvaluationDto })
  async evaluateSkillUnlock(
    @Param('petId') petId: string,
    @Param('skillId') skillId: string
  ): Promise<SkillUnlockEvaluationDto> {
    return this.skillsService.evaluateSkillUnlock(petId, skillId);
  }

  @Post('unlock')
  @ApiOperation({ summary: '解锁技能', description: '尝试解锁指定的技能' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiBody({ type: SkillUnlockRequestDto })
  @ApiResponse({ status: 200, description: '技能解锁结果', type: SkillUnlockResultDto })
  @HttpCode(HttpStatus.OK)
  async unlockSkill(
    @Param('petId') petId: string,
    @Body(ValidationPipe) request: SkillUnlockRequestDto
  ): Promise<SkillUnlockResultDto> {
    return this.skillsService.unlockSkill(petId, request);
  }

  @Put(':skillId/experience')
  @ApiOperation({ summary: '增加技能经验', description: '为指定技能增加经验值' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiParam({ name: 'skillId', description: '技能ID' })
  @ApiBody({ type: SkillExperienceGainDto })
  @ApiResponse({ status: 200, description: '经验增加结果', type: SkillExperienceResultDto })
  async gainSkillExperience(
    @Param('petId') petId: string,
    @Param('skillId') skillId: string,
    @Body(ValidationPipe) experienceConfig: SkillExperienceGainDto
  ): Promise<SkillExperienceResultDto> {
    return this.skillsService.gainSkillExperience(petId, skillId, experienceConfig);
  }

  @Post('experience/bulk')
  @ApiOperation({ summary: '批量增加技能经验', description: '为多个技能同时增加经验值' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiBody({ type: BulkSkillExperienceDto })
  @ApiResponse({ status: 200, description: '批量经验增加结果', type: [SkillExperienceResultDto] })
  @HttpCode(HttpStatus.OK)
  async bulkGainExperience(
    @Param('petId') petId: string,
    @Body(ValidationPipe) request: BulkSkillExperienceDto
  ): Promise<SkillExperienceResultDto[]> {
    // 确保petId匹配
    request.petId = petId;
    return this.skillsService.bulkGainExperience(request);
  }

  @Post('auto-growth')
  @ApiOperation({ summary: '处理自动经验增长', description: '为宠物技能处理自动经验增长' })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @ApiBody({ type: AutoExperienceConfigDto })
  @ApiResponse({ status: 200, description: '自动经验增长结果', type: ExperienceGrowthResultDto })
  @HttpCode(HttpStatus.OK)
  async processAutoExperienceGrowth(
    @Param('petId') petId: string,
    @Body(ValidationPipe) config: AutoExperienceConfigDto
  ): Promise<ExperienceGrowthResultDto> {
    return this.skillsService.processAutoExperienceGrowth(petId, config);
  }

  @Get('auto-growth/config')
  @ApiOperation({ summary: '获取默认自动经验配置', description: '获取系统默认的自动经验增长配置' })
  @ApiResponse({ status: 200, description: '成功获取默认配置', type: AutoExperienceConfigDto })
  async getDefaultAutoExperienceConfig(): Promise<AutoExperienceConfigDto> {
    return this.skillsService.getDefaultAutoExperienceConfig();
  }

  // 管理员专用端点
  @Get('definitions')
  @ApiOperation({ 
    summary: '获取所有技能定义', 
    description: '获取系统中所有技能的定义信息（管理员功能）' 
  })
  @ApiResponse({ status: 200, description: '成功获取技能定义' })
  async getSkillDefinitions() {
    // 返回所有技能定义
    return Array.from(SKILL_DEFINITIONS_MAP.values());
  }

  @Get('config')
  @ApiOperation({ 
    summary: '获取技能系统配置', 
    description: '获取技能系统的全局配置信息（管理员功能）' 
  })
  @ApiResponse({ status: 200, description: '成功获取系统配置' })
  async getSkillSystemConfig() {
    return {
      baseExperienceRates: SKILL_SYSTEM_CONFIG.BASE_EXPERIENCE_RATES,
      rarityMultipliers: SKILL_SYSTEM_CONFIG.RARITY_EXPERIENCE_MULTIPLIERS,
      unlockBonuses: SKILL_SYSTEM_CONFIG.UNLOCK_BONUSES,
      validation: SKILL_SYSTEM_CONFIG.VALIDATION
    };
  }

  // 调试和测试端点
  @Post('debug/unlock-all')
  @ApiOperation({ 
    summary: '解锁所有技能（调试功能）', 
    description: '强制解锁所有技能，仅用于开发和测试' 
  })
  @ApiParam({ name: 'petId', description: '宠物ID' })
  @HttpCode(HttpStatus.OK)
  async debugUnlockAllSkills(@Param('petId') petId: string) {
    // 调试功能：解锁所有基础技能
    const basicSkills = Array.from(SKILL_DEFINITIONS_MAP.values())
      .filter(skill => skill.rarity === 'common')
      .map(skill => skill.id);

    const results = [];
    for (const skillId of basicSkills) {
      try {
        const result = await this.skillsService.unlockSkill(petId, { skillId, forceUnlock: true });
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          skillId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      message: `尝试解锁 ${basicSkills.length} 个基础技能`,
      results
    };
  }
}

// 导入配置以供控制器使用
import { SKILL_DEFINITIONS_MAP, SKILL_SYSTEM_CONFIG } from '../../config/skill-mappings.config';