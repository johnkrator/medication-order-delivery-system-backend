import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPartner } from './entities/delivery-partner.entity';
import { CreateDeliveryPartnerDto } from './dto/create-delivery-partner.dto';
import { UpdateDeliveryPartnerDto } from './dto/update-delivery-partner.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class DeliveryPartnerService {
  constructor(
    @InjectRepository(DeliveryPartner)
    private readonly deliveryPartnerRepository: Repository<DeliveryPartner>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(
    createDeliveryPartnerDto: CreateDeliveryPartnerDto,
  ): Promise<DeliveryPartner> {
    const deliveryPartner = this.deliveryPartnerRepository.create({
      ...createDeliveryPartnerDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const savedDeliveryPartner =
      await this.deliveryPartnerRepository.save(deliveryPartner);
    await this.cacheManager.del('allDeliveryPartners');
    return savedDeliveryPartner;
  }

  async findAll(): Promise<DeliveryPartner[]> {
    const cachedDeliveryPartners = await this.cacheManager.get<
      DeliveryPartner[]
    >('allDeliveryPartners');
    if (cachedDeliveryPartners) {
      return cachedDeliveryPartners;
    }

    const deliveryPartners = await this.deliveryPartnerRepository.find();
    await this.cacheManager.set('allDeliveryPartners', deliveryPartners, 3600);
    return deliveryPartners;
  }

  async findOne(id: string): Promise<DeliveryPartner> {
    const cachedDeliveryPartner = await this.cacheManager.get<DeliveryPartner>(
      `deliveryPartner_${id}`,
    );
    if (cachedDeliveryPartner) {
      return cachedDeliveryPartner;
    }

    const deliveryPartner = await this.deliveryPartnerRepository.findOne({
      where: { id },
    });
    if (!deliveryPartner) {
      throw new NotFoundException('Delivery partner not found');
    }

    await this.cacheManager.set(`deliveryPartner_${id}`, deliveryPartner, 3600);
    return deliveryPartner;
  }

  async update(
    id: string,
    updateDeliveryPartnerDto: UpdateDeliveryPartnerDto,
  ): Promise<DeliveryPartner> {
    const deliveryPartner = await this.findOne(id);
    Object.assign(deliveryPartner, updateDeliveryPartnerDto);
    const updatedDeliveryPartner =
      await this.deliveryPartnerRepository.save(deliveryPartner);
    await this.cacheManager.del(`deliveryPartner_${id}`);
    await this.cacheManager.del('allDeliveryPartners');
    return updatedDeliveryPartner;
  }

  async remove(id: string): Promise<void> {
    const deliveryPartner = await this.findOne(id);
    await this.deliveryPartnerRepository.remove(deliveryPartner);
    await this.cacheManager.del(`deliveryPartner_${id}`);
    await this.cacheManager.del('allDeliveryPartners');
  }
}
