import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ChatCompletionDto } from './dto/chat-completion.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private conversationsService: ConversationsService,
  ) {}

  async processChat(userId: string, chatCompletionDto: ChatCompletionDto): Promise<ChatResponseDto> {
    const { petId, conversationId, message } = chatCompletionDto;

    // 验证宠物所有权
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
    });

    if (!pet || pet.userId !== userId) {
      throw new ForbiddenException('无权访问此宠物');
    }

    // 验证对话所有权
    let conversation;
    if (conversationId) {
      conversation = await this.conversationsService.findOne(userId, conversationId);
      if (conversation.petId !== petId) {
        throw new ForbiddenException('对话与宠物不匹配');
      }
    } else {
      // 如果没有对话ID，创建新对话
      conversation = await this.conversationsService.create(userId, {
        title: message.length > 30 ? message.substring(0, 30) + '...' : message,
        petId,
      });
    }

    // 保存用户消息
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
    });

    // 生成AI回复（这里暂时使用简单的回复逻辑）
    const aiResponse = await this.generateAIResponse(pet, message);

    // 保存AI回复
    const aiMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.content,
        metadata: {
          timestamp: new Date().toISOString(),
          personalityInfluence: aiResponse.personalityInfluence,
          stateInfluence: aiResponse.stateInfluence,
        },
      },
    });

    // 更新对话活跃时间
    await this.conversationsService.updateLastActivity(conversation.id);

    return {
      id: aiMessage.id,
      conversationId: conversation.id,
      message: aiResponse.content,
      timestamp: aiMessage.createdAt,
      metadata: {
        personalityInfluence: aiResponse.personalityInfluence,
        stateInfluence: aiResponse.stateInfluence,
      },
    };
  }

  async processStreamChat(_userId: string, _chatCompletionDto: ChatCompletionDto) {
    // 流式响应的实现将在后续版本中完成
    throw new Error('流式响应功能暂未实现');
  }

  private async generateAIResponse(pet: any, message: string): Promise<{
    content: string;
    personalityInfluence: any;
    stateInfluence: any;
  }> {
    // 基于宠物个性和状态生成简单回复
    const personality = pet.personality;
    const state = pet.currentState;

    let response = '';
    let personalityInfluence = {};
    let stateInfluence = {};

    // 根据个性特质调整回复风格
    if (personality.extraversion > 0.7) {
      response = `哇！${message}真的很有趣呢！我超级喜欢和你聊天！`;
      personalityInfluence = { trait: 'extraversion', value: personality.extraversion };
    } else if (personality.extraversion < 0.3) {
      response = `嗯...${message}...我在想这个问题...`;
      personalityInfluence = { trait: 'extraversion', value: personality.extraversion };
    } else {
      response = `关于${message}，我觉得这很有意思。`;
      personalityInfluence = { trait: 'neutral', value: 0.5 };
    }

    // 根据状态调整回复内容
    if (state.happiness < 0.3) {
      response += ' 不过我今天心情不太好...';
      stateInfluence = { state: 'happiness', value: state.happiness };
    } else if (state.energy < 0.3) {
      response += ' 我有点累了...';
      stateInfluence = { state: 'energy', value: state.energy };
    } else if (state.hunger > 0.7) {
      response += ' 我好饿呀...';
      stateInfluence = { state: 'hunger', value: state.hunger };
    }

    return {
      content: response,
      personalityInfluence,
      stateInfluence,
    };
  }
}