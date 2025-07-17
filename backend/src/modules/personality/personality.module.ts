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
import { PersonalityEvolutionService } from './services/personality-evolution.service';
import { PersonalityAnalyticsService } from './services/personality-analytics.service';
import { PersonalityEvolutionEngine } from '../../algorithms/personality-evolution';
import { InteractionClassifier } from '../../algorithms/interaction-classifier';
import { DistributedLockService, RateLimitService } from './utils/concurrency-control';

@Module({
  imports: [JwtModule],
  controllers: [PersonalityController],
  providers: [
    // 现有服务保持不变
    PersonalityService,
    PrismaService,
    RedisService,
    EvolutionHistoryService,
    PersonalityCacheService,
    EvolutionBatchService,
    EvolutionCleanupService,
    // 新增的业务逻辑服务
    PersonalityEvolutionService,
    PersonalityAnalyticsService,
    // 算法引擎
    PersonalityEvolutionEngine,
    InteractionClassifier,
    // 并发控制服务 (临时实现)
    DistributedLockService,
    RateLimitService,
  ],
  exports: [
    // 主服务和数据管理服务
    PersonalityService,
    EvolutionHistoryService,
    PersonalityCacheService,
    EvolutionBatchService,
    EvolutionCleanupService,
    // 新增的业务逻辑服务
    PersonalityEvolutionService,
    PersonalityAnalyticsService,
    // 算法引擎
    PersonalityEvolutionEngine,
    InteractionClassifier,
  ],
})
export class PersonalityModule {}