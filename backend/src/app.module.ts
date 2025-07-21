import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
import { TasksModule } from './tasks/tasks.module';
import { GatewaysModule } from './gateways/gateways.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

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
    TasksModule,
    GatewaysModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
