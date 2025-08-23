/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import 'reflect-metadata';
import {Logger} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {AppModule} from './app/app.module';

async function bootstrap() {
  try {
    Logger.log('🚀 Starting application bootstrap...');
    Logger.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
    Logger.log(`Port: ${process.env.PORT || 3000}`);
    Logger.log(`Database URL: ${process.env.DATABASE_URL ? 'configured' : 'NOT SET'}`);

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
    Logger.log(`Global prefix set to: ${globalPrefix}`);

    // Enable graceful shutdown
    app.enableShutdownHooks();

    const port = process.env.PORT || 3000;
    Logger.log(`Attempting to bind to port ${port} on 0.0.0.0...`);
    
    await app.listen(port, '0.0.0.0');
    Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
    Logger.log(`🏥 Health check available at: http://localhost:${port}/${globalPrefix}/health`);
    Logger.log('✅ Bootstrap completed successfully');
  } catch (error) {
    Logger.error('❌ Failed to start application:', error);
    Logger.error('Stack trace:', (error instanceof Error ? error : new Error(JSON.stringify(error))).stack);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  Logger.error('❌ Unhandled error during bootstrap:', error);
  process.exit(1);
});
