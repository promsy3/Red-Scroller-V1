import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { PrismaModule } from './prisma/prisma.module';
import { FirmsModule } from './firms/firms.module';
import { ClientsModule } from './clients/clients.module';
import { MattersModule } from './matters/matters.module';
import { DocumentsModule } from './documents/documents.module';
import { AuditModule } from './audit/audit.module';
import { DiaryModule } from './diary/diary.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { RlsInterceptor } from './prisma/rls.interceptor';
import { SentryModule } from '@sentry/nestjs/setup';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    FirmsModule,
    ClientsModule,
    MattersModule,
    DocumentsModule,
    AuditModule,
    DiaryModule,
    EmailModule,
    SentryModule.forRoot(),
  ],
  controllers: [AppController, AuthController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RlsInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
