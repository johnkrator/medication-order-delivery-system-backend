import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/global.exception.filter';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    app.enableCors(); // Add this line to enable CORS

    app.setGlobalPrefix('api'); // Add this line to set the global prefix

    app.useGlobalPipes(new ValidationPipe()); // Add this line to use the ValidationPipe globally

    app.useGlobalFilters(new GlobalExceptionFilter()); // Add this line to use the global exception handler

    await app.listen(process.env.PORT ?? 3000);
    Logger.log(
      `Server running on http://localhost:${process.env.PORT ?? 3000}`,
      'Bootstrap',
    );
  } catch (error) {
    Logger.error(`Failed to start the server`, error.stack, 'Bootstrap');
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
