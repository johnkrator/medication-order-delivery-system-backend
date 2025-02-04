import { config as dotenvConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Order } from '../order/entities/order.entity';
import { Medication } from '../medication/entities/medication.entity';
import { DeliveryPartner } from '../delivery-partner/entities/delivery-partner.entity';
import { Payment } from '../payment/entities/payment.entity';

dotenvConfig();

const config: DataSourceOptions = {
  type: 'postgres',
  url:
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL,
  entities: [User, Order, Medication, DeliveryPartner, Payment],
  synchronize: false,
  logging: true,
  ssl:
    process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: false,
        }
      : false,
};

export const connectionSource = new DataSource(config);

export default () => config;

// Local Database Connection
// import { config as dotenvConfig } from 'dotenv';
// import { DataSource, DataSourceOptions } from 'typeorm';
// import { User } from '../user/entities/user.entity';
// import { Order } from '../order/entities/order.entity';
// import { Medication } from '../medication/entities/medication.entity';
// import { DeliveryPartner } from '../delivery-partner/entities/delivery-partner.entity';
// import { Payment } from '../payment/entities/payment.entity';
//
// dotenvConfig();
//
// const config: DataSourceOptions = {
//   type: 'postgres',
//   host: process.env.DATABASE_HOST,
//   port: parseInt(process.env.DATABASE_PORT, 10),
//   username: process.env.DATABASE_USERNAME,
//   password: process.env.DATABASE_PASSWORD,
//   database: process.env.DATABASE_NAME,
//   entities: [User, Order, Medication, DeliveryPartner, Payment],
//   synchronize: false,
//   logging: true,
//   ssl: process.env.NODE_ENV === 'production',
//   extra: {
//     max: 10,
//     connectionTimeoutMillis: 10000,
//   },
// };
//
// export const connectionSource = new DataSource(config);
//
// // Initialize the connection
// connectionSource
//   .initialize()
//   .then(() => {
//     console.log('Data Source has been initialized!');
//   })
//   .catch((err) => {
//     console.error('Error during Data Source initialization', err);
//   });
//
// export default () => config;
