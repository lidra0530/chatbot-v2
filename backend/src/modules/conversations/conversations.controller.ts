import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationDto } from './dto/conversation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: '创建新对话' })
  @ApiResponse({ status: 201, description: '对话创建成功', type: ConversationDto })
  async create(
    @CurrentUser() userId: string,
    @Body() createConversationDto: CreateConversationDto,
  ): Promise<ConversationDto> {
    return this.conversationsService.create(userId, createConversationDto);
  }

  @Get()
  @ApiOperation({ summary: '获取用户的对话列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: [ConversationDto] })
  @ApiQuery({ name: 'petId', required: false, description: '过滤特定宠物的对话' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: '偏移量' })
  async findAllByUser(
    @CurrentUser() userId: string,
    @Query('petId') petId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<ConversationDto[]> {
    return this.conversationsService.findAllByUser(userId, {
      petId,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取对话详情' })
  @ApiResponse({ status: 200, description: '获取成功', type: ConversationDto })
  async findOne(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<ConversationDto> {
    return this.conversationsService.findOne(userId, id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: '获取对话的消息历史' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: '偏移量' })
  async getMessages(
    @CurrentUser() userId: string,
    @Param('id') conversationId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.conversationsService.getMessages(userId, conversationId, {
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除对话' })
  @ApiResponse({ status: 204, description: '删除成功' })
  async remove(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.conversationsService.remove(userId, id);
  }
}