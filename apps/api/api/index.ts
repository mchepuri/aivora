import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as express from 'express';
import type { Request, Response } from 'express';

const expressApp = express();

// Cached across warm Lambda invocations — avoids re-bootstrapping NestJS on every request.
let bootstrapPromise: Promise<void> | null = null;

function bootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      logger: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['log', 'error', 'warn'],
    }).then((nestApp) => {
      nestApp.setGlobalPrefix('api');
      nestApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      nestApp.enableCors({
        origin: process.env.WEB_URL ?? '*',
        credentials: true,
      });
      return nestApp.init();
    });
  }
  return bootstrapPromise;
}

export default async function handler(req: Request, res: Response) {
  await bootstrap();
  expressApp(req, res);
}
