import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { PrismaService } from '../../common/prisma.service';
import { SkillsCacheService } from './services/skills-cache.service';
import { SkillsPersistenceService } from './services/skills-persistence.service';

/**
 * 步骤167: 技能树系统模块
 * 负责技能管理、解锁、升级和经验值计算
 */
@Module({
  imports: [JwtModule],
  controllers: [SkillsController],
  providers: [
    SkillsService,
    SkillsCacheService,
    SkillsPersistenceService,
    PrismaService
  ],
  exports: [SkillsService, SkillsCacheService, SkillsPersistenceService]
})
export class SkillsModule {}