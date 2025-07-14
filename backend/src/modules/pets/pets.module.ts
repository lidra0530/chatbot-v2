import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PetsController } from './pets.controller';
import { PetsService } from './pets.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [PetsController],
  providers: [PetsService, PrismaService],
  exports: [PetsService],
})
export class PetsModule {}