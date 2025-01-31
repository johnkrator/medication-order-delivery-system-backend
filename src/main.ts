import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/global.exception.filter';
import { checkAndUpdateDatabaseSchema } from './config/check-and-update-database-schema';
import { connectionSource } from './config/typeorm.db.config';

async function bootstrap() {
  try {
    if (!connectionSource.isInitialized) {
      await connectionSource.initialize();
    }

    const app = await NestFactory.create(AppModule);

    app.enableCors();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Check and update the database schema
    await checkAndUpdateDatabaseSchema(connectionSource);

    await app.listen(process.env.PORT ?? 3000);
    Logger.log(
      `Server running on http://localhost:${process.env.PORT ?? 3000}`,
      'Bootstrap',
    );
  } catch (error) {
    Logger.error(`Failed to start the server`, error.stack, 'Bootstrap');

    // Exit if we can't start properly
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error: Error) => {
  Logger.error('Unhandled Promise Rejection', error.stack);
});

process.on('uncaughtException', (error: Error) => {
  Logger.error('Uncaught Exception', error.stack);
});

bootstrap().then(() => console.log('Application is running!'));
