import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationDto } from './dto/conversation.dto';

export interface FindConversationsOptions {
  petId?: string;
  limit?: number;
  offset?: number;
}

export interface FindMessagesOptions {
  limit?: number;
  offset?: number;
}

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createConversationDto: CreateConversationDto): Promise<ConversationDto> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: createConversationDto.petId },
    });

    if (!pet || pet.userId !== userId) {
      throw new ForbiddenException('无权访问此宠物');
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        title: createConversationDto.title,
        userId,
        petId: createConversationDto.petId,
      },
      include: {
        pet: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return this.mapToDto(conversation);
  }

  async findAllByUser(userId: string, options: FindConversationsOptions = {}): Promise<ConversationDto[]> {
    const { petId, limit = 20, offset = 0 } = options;

    const whereClause: any = { userId };
    if (petId) {
      whereClause.petId = petId;
    }

    const conversations = await this.prisma.conversation.findMany({
      where: whereClause,
      include: {
        pet: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return conversations.map(conversation => this.mapToDto(conversation));
  }

  async findOne(userId: string, id: string): Promise<ConversationDto> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        pet: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('对话不存在');
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException('无权访问此对话');
    }

    return this.mapToDto(conversation);
  }

  async getMessages(userId: string, conversationId: string, options: FindMessagesOptions = {}) {
    await this.findOne(userId, conversationId);

    const { limit = 50, offset = 0 } = options;

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
    });

    return messages;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);

    await this.prisma.conversation.delete({
      where: { id },
    });
  }

  async updateLastActivity(conversationId: string): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  private mapToDto(conversation: any): ConversationDto {
    return {
      id: conversation.id,
      title: conversation.title,
      petId: conversation.petId,
      petName: conversation.pet?.name,
      petBreed: 'AI助手',
      messageCount: conversation._count?.messages || 0,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}