import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { rlsContext } from './prisma.service';
import { Observable } from 'rxjs';

@Injectable()
export class RlsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RlsInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): any {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by ClerkAuthGuard

    if (user?.firmId) {
      // Use Observable wrapper to ensure AsyncLocalStorage context propagates
      // through the async handler (next.handle() returns Observable whose
      // subscription happens outside the sync rlsContext.run otherwise).
      return new Observable((observer) => {
        return rlsContext.run({ firmId: user.firmId }, () => {
          const subscription = next.handle().subscribe({
            next: (value) => observer.next(value),
            error: (err) => observer.error(err),
            complete: () => observer.complete(),
          });
          return () => subscription.unsubscribe();
        });
      });
    }

    return next.handle();
  }
}
