import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PetGateway } from './pet.gateway';
import { RealtimeEventsService } from './services/realtime-events.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [PetGateway, RealtimeEventsService, PrismaService],
  exports: [PetGateway, RealtimeEventsService],
})
export class GatewaysModule {}