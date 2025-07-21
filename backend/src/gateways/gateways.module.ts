import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PetGateway } from './pet.gateway';
import { PrismaService } from '../common/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [PetGateway, PrismaService],
  exports: [PetGateway],
})
export class GatewaysModule {}