import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SkillsService } from './skills.service';

@ApiTags('skills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pets/:petId/skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: '获取技能树信息' })
  async getSkillTree(@Param('petId') petId: string) {
    return this.skillsService.getSkillTree(petId);
  }

  @Get('available')
  @ApiOperation({ summary: '获取可解锁技能' })
  async getAvailableSkills(@Param('petId') petId: string) {
    return this.skillsService.getAvailableSkills(petId);
  }

  @Post('unlock')
  @ApiOperation({ summary: '解锁技能' })
  async unlockSkill(
    @Param('petId') petId: string,
    @Body() unlockData: { skillId: string },
  ) {
    return this.skillsService.unlockSkill(petId, unlockData.skillId);
  }

  @Get('abilities')
  @ApiOperation({ summary: '获取当前能力' })
  async getCurrentAbilities(@Param('petId') petId: string) {
    return this.skillsService.getCurrentAbilities(petId);
  }
}