import "./instrument";

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const rawOrigins = (process.env.WEB_URL || 'http://localhost:3000').split(',');
  const allowedOrigins = rawOrigins
    .map(o => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  // Always allow localhost:3000 as fallback for local dev (handles WEB_URL missing or misconfigured)
  if (!allowedOrigins.includes('http://localhost:3000')) {
    allowedOrigins.push('http://localhost:3000');
  }
  console.log(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests, and server-side fetches)
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.trim().replace(/\/$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin} (normalized: ${normalizedOrigin}), allowed: ${allowedOrigins.join(', ')}`);
        callback(new Error('Not allowed by CORS'));
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
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
