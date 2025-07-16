import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PersonalityController } from './personality.controller';
import { PersonalityService } from './personality.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [JwtModule],
  controllers: [PersonalityController],
  providers: [PersonalityService, PrismaService],
  exports: [PersonalityService],
})
export class PersonalityModule {}