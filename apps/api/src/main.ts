import "./instrument";

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigin = (process.env.WEB_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
  console.log(`[CORS] Allowed origin: ${allowedOrigin}`);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests, and server-side fetches)
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.trim().replace(/\/$/, '');
      if (normalizedOrigin === allowedOrigin) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin} (normalized: ${normalizedOrigin}), allowed: ${allowedOrigin}`);
        callback(null, false); // Return false to block CORS headers without 500 error
      }
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
