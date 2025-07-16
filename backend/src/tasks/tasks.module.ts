import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PersonalityEvolutionTask } from './personality-evolution.task';
import { PersonalityEvolutionListener } from './personality-evolution.listener';
import { TaskMonitoringService } from './task-monitoring.service';
import { TasksController } from './tasks.controller';
import { TaskHealthService } from './task-health.service';
import { PrismaService } from '../common/prisma.service';
import { PersonalityModule } from '../modules/personality/personality.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PersonalityModule,
  ],
  controllers: [TasksController],
  providers: [
    PersonalityEvolutionTask,
    PersonalityEvolutionListener,
    TaskMonitoringService,
    TaskHealthService,
    PrismaService,
  ],
  exports: [
    PersonalityEvolutionTask,
    TaskMonitoringService,
    TaskHealthService,
  ],
})
export class TasksModule {}