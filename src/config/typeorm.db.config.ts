import { config as dotenvConfig } from 'dotenv';
import * as process from 'node:process';
import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../user/entities/user.entity';

dotenvConfig({ path: '.env' });

const config = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [User],
  migrations: ['dist/migrations/*.{ts,js}'],
  autoLoadEntities: true,
  synchronize: false,
  logging: false,
  migrationsRun: true,
  subscribers: ['dist/subscriber//*.{ts,js}'],
  migrationsTableName: 'migrations',
  cli: {
    entitiesDir: 'src',
    migrationsDir: 'src/migrations',
    subscribersDir: 'src/subscriber',
  },
  ssl: false,
  maxQueryExecutionTime: 1000,
  queryRunnerTimeout: 10000,
  retryInterval: 1000,
  retryMaxTimeout: 10000,
  retryTimeout: 10000,
  retryMaxDelay: 10000,
  retryDelayType: 'exponential',
  retryAttempts: 5,
  retryDelay: 3000,
  cache: {
    tableName: 'query-result-cache',
    duration: 60000,
  },
};

export default registerAs('typeormDbConfig', () => config);
export const connectionSource = new DataSource(config as DataSourceOptions);
