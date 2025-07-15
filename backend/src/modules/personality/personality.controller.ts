import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PersonalityService } from './personality.service';

@ApiTags('personality')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pets/:petId/personality')
export class PersonalityController {
  constructor(private readonly personalityService: PersonalityService) {}

  @Get()
  @ApiOperation({ summary: '获取宠物个性详情' })
  async getPersonalityDetails(@Param('petId') petId: string) {
    return this.personalityService.getPersonalityDetails(petId);
  }

  @Get('history')
  @ApiOperation({ summary: '获取个性演化历史' })
  async getPersonalityHistory(@Param('petId') petId: string) {
    return this.personalityService.getPersonalityHistory(petId);
  }

  @Post('analyze')
  @ApiOperation({ summary: '触发个性分析' })
  async triggerPersonalityAnalysis(@Param('petId') petId: string) {
    return this.personalityService.triggerPersonalityAnalysis(petId);
  }

  @Put('settings')
  @ApiOperation({ summary: '更新个性设置' })
  async updatePersonalitySettings(
    @Param('petId') petId: string,
    @Body() traits: any,
  ) {
    return this.personalityService.updatePersonalityTraits(petId, traits);
  }
}