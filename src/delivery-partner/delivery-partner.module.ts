import { Module } from '@nestjs/common';
import { DeliveryPartnerService } from './delivery-partner.service';
import { DeliveryPartnerController } from './delivery-partner.controller';

@Module({
  controllers: [DeliveryPartnerController],
  providers: [DeliveryPartnerService],
})
export class DeliveryPartnerModule {}
