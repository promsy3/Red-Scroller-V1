import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

@Injectable()
export class EmailSchedulerService {
  private readonly logger = new Logger(EmailSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  // Run every hour to check for upcoming diary events (24 hours ahead)
  @Cron(CronExpression.EVERY_HOUR)
  async handleDiaryReminders() {
    this.logger.log('Checking for upcoming diary events...');

    try {
      const now = new Date();
      const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find diary events that are in the next 24 hours and haven't been reminded yet
      const upcomingEvents = await this.prisma.diaryEvent.findMany({
        where: {
          date: {
            gte: now,
            lte: twentyFourHoursLater,
          },
          reminderSent: false,
        },
        include: {
          matter: {
            include: {
              client: true,
            },
          },
        },
      });

      this.logger.log(`Found ${upcomingEvents.length} upcoming diary events needing reminders`);

      for (const event of upcomingEvents) {
        try {
          // Get all users with access to this matter
          const userWhereClause: any = {
            firmId: event.firmId,
            status: 'active',
            OR: [
              { role: 'admin' }
            ]
          };

          if (event.matter) {
            if (event.matter.assignedTo) {
              userWhereClause.OR.push({ id: event.matter.assignedTo });
            }
            userWhereClause.OR.push({ matterAccess: { some: { matterId: event.matterId } } });
          }

          const usersToNotify = await this.prisma.user.findMany({
            where: userWhereClause,
            select: { email: true },
          });

          for (const user of usersToNotify) {
            await this.emailService.sendDiaryReminder(
              user.email,
              event.title,
              event.type,
              event.date
            );
          }

          // Mark the event as reminder sent
          await this.prisma.diaryEvent.update({
            where: { id: event.id },
            data: { reminderSent: true },
          });

          this.logger.log(`Sent reminders for diary event: ${event.title}`);
        } catch (error) {
          this.logger.error(`Failed to send reminder for diary event ${event.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      this.logger.log('Diary reminder check completed');
    } catch (error) {
      this.logger.error(`Error during diary reminder check: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
