import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PetsModule } from './modules/pets/pets.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [AuthModule, UsersModule, PetsModule, ConversationsModule, ChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
