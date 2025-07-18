import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { StateController } from './state.controller';
import { StateService } from './state.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [
    JwtModule,
    ScheduleModule.forRoot()
  ],
  controllers: [StateController],
  providers: [StateService, PrismaService],
  exports: [StateService],
})
export class StateModule {}