import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StateController } from './state.controller';
import { StateService } from './state.service';

@Module({
  imports: [JwtModule],
  controllers: [StateController],
  providers: [StateService],
  exports: [StateService],
})
export class StateModule {}