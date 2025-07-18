import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { PrismaService } from '../../common/prisma.service';

/**
 * 步骤167: 技能树系统模块
 * 负责技能管理、解锁、升级和经验值计算
 */
@Module({
  imports: [JwtModule],
  controllers: [SkillsController],
  providers: [
    SkillsService,
    PrismaService
  ],
  exports: [SkillsService]
})
export class SkillsModule {}