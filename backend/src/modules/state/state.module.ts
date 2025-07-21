import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { StateController } from './state.controller';
import { StateService } from './state.service';
import { StatePersistenceService } from './services/state-persistence.service';
import { PrismaService } from '../../common/prisma.service';
import { GatewaysModule } from '../../gateways/gateways.module';

@Module({
  imports: [
    JwtModule,
    ScheduleModule.forRoot(),
    GatewaysModule
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