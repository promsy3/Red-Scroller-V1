import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthController } from '../src/auth/auth.controller';
import { PrismaModule } from '../src/prisma/prisma.module';
import { FirmsModule } from '../src/firms/firms.module';
import { ClientsModule } from '../src/clients/clients.module';
import { MattersModule } from '../src/matters/matters.module';
import { DocumentsModule } from '../src/documents/documents.module';
import { AuditModule } from '../src/audit/audit.module';
import { DiaryModule } from '../src/diary/diary.module';
import { TestAuthGuard } from './test-auth.guard';
import { RlsInterceptor } from '../src/prisma/rls.interceptor';

@Module({
  imports: [PrismaModule, FirmsModule, ClientsModule, MattersModule, DocumentsModule, AuditModule, DiaryModule],
  controllers: [AppController, AuthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: TestAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RlsInterceptor,
    },
  ],
})
export class TestModule {}
