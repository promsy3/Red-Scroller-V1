import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailSchedulerService } from './email-scheduler.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [EmailService, EmailSchedulerService],
  exports: [EmailService],
})
export class EmailModule {}
