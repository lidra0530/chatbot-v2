import { 
  Controller, 
  Get, 
  Put, 
  Post, 
  Param, 
  Body, 
  Query,
  UseGuards, 
  ValidationPipe,
  ParseIntPipe,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StateService } from './state.service';
import { StateUpdateDto, StateInteractionDto, StateHistoryDto } from './dto';
import { PetState } from '../../algorithms/state-driver';

/**
 * 步骤146: 状态系统API控制器
 * 提供宠物状态管理的RESTful API接口
 */
@ApiTags('状态管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/pets/:petId/state')
export class StateController {
  constructor(private readonly stateService: StateService) {}

  /**
   * 步骤147: GET /api/v1/pets/:id/state 端点
   * 获取宠物当前状态
   */
  @Get()
  @ApiOperation({ 
    summary: '获取宠物当前状态',
    description: '获取指定宠物的实时状态信息，包括基础状态（心情、精力、饥饿、健康）和高级状态（好奇心、社交欲望、创造力、专注度）'
  })
  @ApiParam({
    name: 'petId',
    description: '宠物ID',
    type: 'string',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: '成功获取宠物状态',
    schema: {
      type: 'object',
      properties: {
        basic: {
          type: 'object',
          properties: {
            mood: { type: 'number', minimum: 0, maximum: 100, description: '心情' },
            energy: { type: 'number', minimum: 0, maximum: 100, description: '精力' },
            hunger: { type: 'number', minimum: 0, maximum: 100, description: '饥饿' },
            health: { type: 'number', minimum: 0, maximum: 100, description: '健康' }
          }
        },
        advanced: {
          type: 'object',
          properties: {
            curiosity: { type: 'number', minimum: 0, maximum: 100, description: '好奇心' },
            socialDesire: { type: 'number', minimum: 0, maximum: 100, description: '社交欲望' },
            creativity: { type: 'number', minimum: 0, maximum: 100, description: '创造力' },
            focusLevel: { type: 'number', minimum: 0, maximum: 100, description: '专注度' }
          }
        },
        lastUpdate: { type: 'string', format: 'date-time', description: '最后更新时间' },
        autoDecayEnabled: { type: 'boolean', description: '自动衰减是否启用' }
      }
    }
  })
  @ApiResponse({ status: 404, description: '宠物不存在' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  async getCurrentState(@Param('petId') petId: string): Promise<PetState> {
    try {
      return await this.stateService.getCurrentState(petId);
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        throw new HttpException('宠物不存在', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('获取状态失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 步骤148: PUT /api/v1/pets/:id/state 端点
   * 更新宠物状态
   */
  @Put()
  @ApiOperation({ 
    summary: '更新宠物状态',
    description: '手动更新宠物状态，支持增量更新各种状态值'
  })
  @ApiParam({
    name: 'petId',
    description: '宠物ID',
    type: 'string'
  })
  @ApiBody({
    type: StateUpdateDto,
    description: '状态更新数据'
  })
  @ApiResponse({
    status: 200,
    description: '状态更新成功',
    type: 'object'
  })
  @ApiResponse({ status: 400, description: '请求参数无效' })
  @ApiResponse({ status: 404, description: '宠物不存在' })
  async updatePetState(
    @Param('petId') petId: string,
    @Body(new ValidationPipe({ 
      transform: true, 
      whitelist: true,
      forbidNonWhitelisted: true 
    })) stateUpdate: StateUpdateDto,
  ): Promise<PetState> {
    try {
      // 步骤151: 添加状态更新的验证和边界检查
      this.validateStateUpdate(stateUpdate);
      return await this.stateService.updatePetState(petId, stateUpdate);
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        throw new HttpException('宠物不存在', HttpStatus.NOT_FOUND);
      }
      if (error.message && error.message.includes('validation')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('更新状态失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 步骤149: POST /api/v1/pets/:id/state/interact 端点
   * 处理状态交互
   */
  @Post('interact')
  @ApiOperation({ 
    summary: '处理状态交互',
    description: '根据用户与宠物的交互行为更新宠物状态'
  })
  @ApiParam({
    name: 'petId',
    description: '宠物ID',
    type: 'string'
  })
  @ApiBody({
    type: StateInteractionDto,
    description: '交互数据'
  })
  @ApiResponse({
    status: 200,
    description: '交互处理成功',
    type: 'object'
  })
  @ApiResponse({ status: 400, description: '交互数据无效' })
  @ApiResponse({ status: 404, description: '宠物不存在' })
  async processStateInteraction(
    @Param('petId') petId: string,
    @Body(new ValidationPipe({ 
      transform: true, 
      whitelist: true,
      forbidNonWhitelisted: true 
    })) interactionData: StateInteractionDto,
  ): Promise<PetState> {
    try {
      // 步骤151: 添加交互数据的验证和边界检查
      this.validateInteractionData(interactionData);
      return await this.stateService.processStateInteraction(petId, interactionData);
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        throw new HttpException('宠物不存在', HttpStatus.NOT_FOUND);
      }
      if (error.message && error.message.includes('validation')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('处理交互失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 步骤150: GET /api/v1/pets/:id/state/history 端点
   * 获取状态历史
   */
  @Get('history')
  @ApiOperation({ 
    summary: '获取状态历史',
    description: '获取宠物状态变化的历史记录，支持分页查询'
  })
  @ApiParam({
    name: 'petId',
    description: '宠物ID',
    type: 'string'
  })
  @ApiQuery({
    name: 'limit',
    description: '返回记录数限制',
    type: 'number',
    required: false,
    example: 50
  })
  @ApiQuery({
    name: 'offset',
    description: '偏移量',
    type: 'number',
    required: false,
    example: 0
  })
  @ApiResponse({
    status: 200,
    description: '成功获取状态历史',
    type: [StateHistoryDto]
  })
  @ApiResponse({ status: 404, description: '宠物不存在' })
  async getStateHistory(
    @Param('petId') petId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) _offset?: number
  ): Promise<StateHistoryDto[]> {
    try {
      // 设置默认值和边界检查
      const validLimit = Math.min(Math.max(limit || 50, 1), 200); // 限制在1-200之间
      // 注意：目前getStateHistory方法还不支持offset参数，暂时保留以便未来扩展
      
      return await this.stateService.getStateHistory(petId, validLimit);
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        throw new HttpException('宠物不存在', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('获取历史失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 步骤151: 状态更新验证函数
   */
  private validateStateUpdate(stateUpdate: StateUpdateDto): void {
    // 检查变化值的合理性
    const changes = [
      stateUpdate.hungerChange,
      stateUpdate.fatigueChange,
      stateUpdate.happinessChange,
      stateUpdate.healthChange,
      stateUpdate.socialChange,
      stateUpdate.learningChange,
      stateUpdate.creativityChange,
      stateUpdate.explorationChange
    ].filter(change => change !== undefined);

    // 检查是否有任何变化
    if (changes.length === 0) {
      throw new HttpException('至少需要指定一个状态变化', HttpStatus.BAD_REQUEST);
    }

    // 检查单次变化的合理性（不超过±50）
    const invalidChanges = changes.filter(change => Math.abs(change!) > 50);
    if (invalidChanges.length > 0) {
      throw new HttpException('单次状态变化不能超过±50', HttpStatus.BAD_REQUEST);
    }

    // 检查总变化量
    const totalAbsChange = changes.reduce((sum, change) => sum + Math.abs(change!), 0);
    if (totalAbsChange > 100) {
      throw new HttpException('总状态变化量过大', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * 步骤151: 交互数据验证函数
   */
  private validateInteractionData(interactionData: StateInteractionDto): void {
    // 验证交互类型
    const validInteractionTypes = [
      'feeding', 'playing', 'learning', 'conversation', 
      'exploration', 'resting', 'achievement', 'punishment',
      'neglect', 'stress', 'comfort', 'exercise'
    ];
    
    if (!validInteractionTypes.includes(interactionData.interactionType)) {
      throw new HttpException(
        `无效的交互类型。支持的类型：${validInteractionTypes.join(', ')}`,
        HttpStatus.BAD_REQUEST
      );
    }

    // 验证强度范围
    if (interactionData.intensity < 1 || interactionData.intensity > 10) {
      throw new HttpException('交互强度必须在1-10之间', HttpStatus.BAD_REQUEST);
    }

    // 验证持续时间
    if (interactionData.duration && (interactionData.duration < 0 || interactionData.duration > 480)) {
      throw new HttpException('交互持续时间必须在0-480分钟之间', HttpStatus.BAD_REQUEST);
    }

    // 验证内容长度
    if (interactionData.content && interactionData.content.length > 500) {
      throw new HttpException('交互内容不能超过500字符', HttpStatus.BAD_REQUEST);
    }
  }
}