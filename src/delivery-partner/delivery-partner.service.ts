import { Injectable } from '@nestjs/common';
import { CreateDeliveryPartnerDto } from './dto/create-delivery-partner.dto';
import { UpdateDeliveryPartnerDto } from './dto/update-delivery-partner.dto';

@Injectable()
export class DeliveryPartnerService {
  create(createDeliveryPartnerDto: CreateDeliveryPartnerDto) {
    return 'This action adds a new deliveryPartner';
  }

  findAll() {
    return `This action returns all deliveryPartner`;
  }

  findOne(id: number) {
    return `This action returns a #${id} deliveryPartner`;
  }

  update(id: number, updateDeliveryPartnerDto: UpdateDeliveryPartnerDto) {
    return `This action updates a #${id} deliveryPartner`;
  }

  remove(id: number) {
    return `This action removes a #${id} deliveryPartner`;
  }
}
