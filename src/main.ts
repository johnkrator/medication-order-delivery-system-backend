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
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    app.use(
      (
        req: { method: string },
        res: {
          header: (arg0: string, arg1: string) => void;
          status: (arg0: number) => {
            (): any;
            new (): any;
            send: { (): void; new (): any };
          };
        },
        next: () => void,
      ) => {
        if (req.method === 'OPTIONS') {
          res.header('Access-Control-Allow-Origin', '*');
          res.header(
            'Access-Control-Allow-Methods',
            'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
          );
          res.header(
            'Access-Control-Allow-Headers',
            'Content-Type, Accept, Authorization',
          );
          res.status(204).send();
        } else {
          next();
        }
      },
    );

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
