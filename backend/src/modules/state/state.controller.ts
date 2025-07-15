import { Controller, Get, Put, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StateService } from './state.service';

@ApiTags('state')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pets/:petId/state')
export class StateController {
  constructor(private readonly stateService: StateService) {}

  @Get()
  @ApiOperation({ summary: '获取宠物当前状态' })
  async getCurrentState(@Param('petId') petId: string) {
    return this.stateService.getCurrentState(petId);
  }

  @Put()
  @ApiOperation({ summary: '更新宠物状态' })
  async updatePetState(
    @Param('petId') petId: string,
    @Body() stateData: any,
  ) {
    return this.stateService.updatePetState(petId, stateData);
  }

  @Post('interact')
  @ApiOperation({ summary: '处理状态交互' })
  async processStateInteraction(
    @Param('petId') petId: string,
    @Body() interactionData: any,
  ) {
    return this.stateService.processStateInteraction(petId, interactionData);
  }

  @Get('history')
  @ApiOperation({ summary: '获取状态历史' })
  async getStateHistory(@Param('petId') petId: string) {
    return this.stateService.getStateHistory(petId);
  }
}