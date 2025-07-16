import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PersonalityController } from './personality.controller';
import { PersonalityService } from './personality.service';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { EvolutionHistoryService } from './services/evolution-history.service';
import { PersonalityCacheService } from './services/personality-cache.service';
import { EvolutionBatchService } from './services/evolution-batch.service';
import { EvolutionCleanupService } from './services/evolution-cleanup.service';

@Module({
  imports: [JwtModule],
  controllers: [PersonalityController],
  providers: [
    PersonalityService,
    PrismaService,
    RedisService,
    EvolutionHistoryService,
    PersonalityCacheService,
    EvolutionBatchService,
    EvolutionCleanupService,
  ],
  exports: [
    PersonalityService,
    EvolutionHistoryService,
    PersonalityCacheService,
    EvolutionBatchService,
    EvolutionCleanupService,
  ],
})
export class PersonalityModule {}