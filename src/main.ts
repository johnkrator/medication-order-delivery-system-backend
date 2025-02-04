import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/logger/global.exception.filter';
import { checkAndUpdateDatabaseSchema } from './config/check-and-update-database-schema';
import { connectionSource } from './config/typeorm.db.config';
import { WinstonLogger } from './common/logger/winston.logger';

async function bootstrap() {
  try {
    if (!connectionSource.isInitialized) {
      await connectionSource.initialize();
    }

    const app = await NestFactory.create(AppModule, {
      logger: new WinstonLogger(),
    });

    app.enableCors({
      origin: ['https://pharmatrade.vercel.app', 'http://localhost:5173'],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter());

    await checkAndUpdateDatabaseSchema(connectionSource);

    await app.listen(process.env.PORT ?? 3000);
    new WinstonLogger().log(
      `Server running on http://localhost:${process.env.PORT ?? 3000}`,
    );
  } catch (error) {
    new WinstonLogger().error(`Failed to start the server`, error.stack);
    process.exit(1);
  }
}

process.on('unhandledRejection', (error: Error) => {
  new WinstonLogger().error('Unhandled Promise Rejection', error.stack);
});

process.on('uncaughtException', (error: Error) => {
  new WinstonLogger().error('Uncaught Exception', error.stack);
});

bootstrap().then(() => console.log('Application is running!'));

// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { ValidationPipe } from '@nestjs/common';
// import { GlobalExceptionFilter } from './common/logger/global.exception.filter';
// import { checkAndUpdateDatabaseSchema } from './config/check-and-update-database-schema';
// import { connectionSource } from './config/typeorm.db.config';
// import { WinstonLogger } from './common/logger/winston.logger';
//
// async function bootstrap() {
//   try {
//     if (!connectionSource.isInitialized) {
//       await connectionSource.initialize();
//     }
//
//     const app = await NestFactory.create(AppModule, {
//       logger: new WinstonLogger(),
//     });
//
//     app.enableCors();
//     app.setGlobalPrefix('api');
//     app.useGlobalPipes(new ValidationPipe());
//     app.useGlobalFilters(new GlobalExceptionFilter());
//
//     // Check and update the database schema
//     await checkAndUpdateDatabaseSchema(connectionSource);
//
//     await app.listen(process.env.PORT ?? 3000);
//     new WinstonLogger().log(
//       `Server running on http://localhost:${process.env.PORT ?? 3000}`,
//     );
//   } catch (error) {
//     new WinstonLogger().error(`Failed to start the server`, error.stack);
//
//     // Exit if we can't start properly
//     process.exit(1);
//   }
// }
//
// // Handle uncaught errors
// process.on('unhandledRejection', (error: Error) => {
//   new WinstonLogger().error('Unhandled Promise Rejection', error.stack);
// });
//
// process.on('uncaughtException', (error: Error) => {
//   new WinstonLogger().error('Uncaught Exception', error.stack);
// });
//
// bootstrap().then(() => console.log('Application is running!'));
