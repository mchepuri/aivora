import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { resolveLogLevels } from '../src/log-level';
import cookieParser from 'cookie-parser';
import express from 'express';
import type { Request, Response } from 'express';

const expressApp = express();

// Cached across warm invocations — avoids re-bootstrapping NestJS on every request.
let bootstrapPromise: Promise<void> | null = null;

function bootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      logger: resolveLogLevels(),
    }).then(async (nestApp) => {
      nestApp.setGlobalPrefix('api');
      nestApp.use(cookieParser());
      nestApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      nestApp.enableCors({
        origin: process.env.WEB_URL ?? '*',
        credentials: true,
      });
      await nestApp.init();
    });
  }
  return bootstrapPromise!;
}

export default async function handler(req: Request, res: Response) {
  await bootstrap();
  expressApp(req, res);
}
