import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, LogLevel, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

const DEFAULT_LOG_LEVELS: LogLevel[] = ['log', 'warn', 'error'];
const DEBUG_LOG_LEVELS: LogLevel[] = ['log', 'warn', 'error', 'debug', 'verbose'];

function resolveLogLevels(): LogLevel[] {
  return (process.env.LOG_LEVEL ?? '').toLowerCase() === 'debug'
    ? DEBUG_LOG_LEVELS
    : DEFAULT_LOG_LEVELS;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: resolveLogLevels(),
  });

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true });

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
  new Logger('Bootstrap').log(`API running on http://localhost:${port}/api`);
}

bootstrap();
