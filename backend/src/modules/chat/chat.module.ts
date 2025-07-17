import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from '../../common/prisma.service';
import { ConversationsModule } from '../conversations/conversations.module';
import { PersonalityModule } from '../personality/personality.module';
import { LLMModule } from '../../services/llm.module';
import { ChatPerformanceMonitor } from '../../common/monitoring/chat-performance.monitor';
import { ChatCacheService } from '../../common/cache/chat-cache.service';
import { CostControlService } from '../../common/cost-control/cost-control.service';

@Module({
  imports: [
    ConversationsModule,
    PersonalityModule,
    LLMModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, PrismaService, ChatPerformanceMonitor, ChatCacheService, CostControlService],
  exports: [ChatService],
})
export class ChatModule {}