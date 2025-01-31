import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';
import { RedisCacheModule } from './common/redis.config';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { MedicationModule } from './medication/medication.module';
import { DeliveryPartnerModule } from './delivery-partner/delivery-partner.module';
import typeormDbConfig from './config/typeorm.db.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeormDbConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async () => ({
        ...typeormDbConfig(),
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
    UserModule,
    EmailModule,
    SmsModule,
    RedisCacheModule,
    OrderModule,
    PaymentModule,
    MedicationModule,
    DeliveryPartnerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
