import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PetsModule } from './modules/pets/pets.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { ChatModule } from './modules/chat/chat.module';
import { PersonalityModule } from './modules/personality/personality.module';
import { SkillsModule } from './modules/skills/skills.module';
import { StateModule } from './modules/state/state.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    PetsModule,
    ConversationsModule,
    ChatModule,
    PersonalityModule,
    SkillsModule,
    StateModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
