import { Module } from '@nestjs/common';
import { FirmsController } from './firms.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [FirmsController],
})
export class FirmsModule {}
