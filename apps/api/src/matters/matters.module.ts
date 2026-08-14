import { Module } from '@nestjs/common';
import { MattersController } from './matters.controller';
import { EmailModule } from '../email/email.module';

@Module({ 
  imports: [EmailModule],
  controllers: [MattersController] 
})
export class MattersModule {}
