import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { StateController } from './state.controller';
import { StateService } from './state.service';
import { StatePersistenceService } from './services/state-persistence.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [
    JwtModule,
    ScheduleModule.forRoot()
  ],
  controllers: [StateController],
  providers: [
    StateService, 
    StatePersistenceService,
    PrismaService
  ],
  exports: [StateService, StatePersistenceService],
})
export class StateModule {}