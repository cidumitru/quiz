/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import 'reflect-metadata';
import {Logger} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {AppModule} from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  // Payload size limits - prevent large payloads that could cause high memory usage
  app.use(require('express').json({limit: '500kb'}));
  app.use(require('express').urlencoded({limit: '500kb', extended: true}));

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
    maxAge: 86400,
  });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
