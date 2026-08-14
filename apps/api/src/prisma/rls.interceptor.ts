import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class RlsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RlsInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by ClerkAuthGuard

    if (user?.firmId) {
      try {
        await this.prisma.setFirmId(user.firmId);
      } catch (error) {
        this.logger.error(`Failed to set RLS firmId: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const result = await next.handle();
    return result;
  }
}
