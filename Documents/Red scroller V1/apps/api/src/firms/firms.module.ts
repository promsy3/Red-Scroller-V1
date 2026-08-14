import { Module } from '@nestjs/common';
import { FirmsController } from './firms.controller';

@Module({
  controllers: [FirmsController],
})
export class FirmsModule {}
