import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { EmailModule } from '../email/email.module';

@Module({ 
  imports: [EmailModule],
  controllers: [DocumentsController] 
})
export class DocumentsModule {}
