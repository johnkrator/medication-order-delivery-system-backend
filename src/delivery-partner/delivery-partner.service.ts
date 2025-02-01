import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPartner } from './entities/delivery-partner.entity';
import { CreateDeliveryPartnerDto } from './dto/create-delivery-partner.dto';
import { UpdateDeliveryPartnerDto } from './dto/update-delivery-partner.dto';

@Injectable()
export class DeliveryPartnerService {
  constructor(
    @InjectRepository(DeliveryPartner)
    private readonly deliveryPartnerRepository: Repository<DeliveryPartner>,
  ) {}

  async create(
    createDeliveryPartnerDto: CreateDeliveryPartnerDto,
  ): Promise<DeliveryPartner> {
    const deliveryPartner = this.deliveryPartnerRepository.create(
      createDeliveryPartnerDto,
    );
    return this.deliveryPartnerRepository.save(deliveryPartner);
  }

  async findAll(): Promise<DeliveryPartner[]> {
    return this.deliveryPartnerRepository.find();
  }

  async findOne(id: string): Promise<DeliveryPartner> {
    const deliveryPartner = await this.deliveryPartnerRepository.findOne({
      where: { id },
    });
    if (!deliveryPartner) {
      throw new NotFoundException('Delivery partner not found');
    }
    return deliveryPartner;
  }

  async update(
    id: string,
    updateDeliveryPartnerDto: UpdateDeliveryPartnerDto,
  ): Promise<DeliveryPartner> {
    const deliveryPartner = await this.findOne(id);
    Object.assign(deliveryPartner, updateDeliveryPartnerDto);
    return this.deliveryPartnerRepository.save(deliveryPartner);
  }

  async remove(id: string): Promise<void> {
    const deliveryPartner = await this.findOne(id);
    await this.deliveryPartnerRepository.remove(deliveryPartner);
  }
}
