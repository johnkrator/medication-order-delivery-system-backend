import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Medication } from '../medication/entities/medication.entity';
import { DeliveryPartner } from '../delivery-partner/entities/delivery-partner.entity';
import { PaymentService } from '../payment/payment.service';
import { OrderStatus } from '../enums/order-status';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Medication)
    private readonly medicationRepository: Repository<Medication>,
    @InjectRepository(DeliveryPartner)
    private readonly deliveryPartnerRepository: Repository<DeliveryPartner>,
    private readonly paymentService: PaymentService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<{
    order: Order;
    paymentReference: string;
    redirectUrl: string;
    callbackUrl: string;
  }> {
    const { userId, medicationIds, deliveryAddress, specialInstructions } =
      createOrderDto;

    // Fetch user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch medications
    const medications =
      await this.medicationRepository.findByIds(medicationIds);
    if (medications.length !== medicationIds.length) {
      throw new NotFoundException('One or more medications not found');
    }

    // Calculate total amount - ensure proper decimal handling
    const totalAmount = medications.reduce(
      (sum, medication) => sum + Number(medication.price),
      0,
    );

    // Format to 2 decimal places
    const formattedTotalAmount = Number(totalAmount.toFixed(2));

    // Create order
    const order = this.orderRepository.create({
      user,
      medications,
      totalAmount: formattedTotalAmount,
      deliveryAddress,
      specialInstructions,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save order
    const savedOrder = await this.orderRepository.save(order);

    // Initiate payment
    const payment = await this.paymentService.initiatePayment({
      orderId: savedOrder.id,
      amount: formattedTotalAmount, // Use the same formatted amount
      email: user.email,
    });

    // Update order with payment reference
    savedOrder.paymentReference = payment.paymentReference;
    await this.orderRepository.save(savedOrder);

    return {
      order: savedOrder,
      paymentReference: payment.paymentReference,
      redirectUrl: payment.redirectUrl,
      callbackUrl: payment.callbackUrl,
    };
  }

  async findAll(): Promise<Order[]> {
    const cachedOrder = await this.cacheManager.get<Order[]>('allOrders');

    if (cachedOrder) {
      return cachedOrder;
    }

    const allOrders = await this.orderRepository.find({
      relations: ['user', 'medications', 'deliveryPartner'],
    });

    await this.cacheManager.set('allOrders', allOrders);

    return allOrders;
  }

  async findOne(id: string): Promise<Order> {
    const cacheKey = `order_${id}`;
    const cachedOrder = await this.cacheManager.get<Order>(cacheKey);

    if (cachedOrder) {
      return cachedOrder;
    }

    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'medications', 'deliveryPartner'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.cacheManager.set(cacheKey, order, 3600);

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);

    if (updateOrderDto.deliveryPartnerId) {
      const deliveryPartner = await this.deliveryPartnerRepository.findOne({
        where: { id: updateOrderDto.deliveryPartnerId },
      });
      if (!deliveryPartner) {
        throw new NotFoundException('Delivery partner not found');
      }
      order.deliveryPartner = deliveryPartner;
    }

    if (updateOrderDto.status) {
      order.status = updateOrderDto.status;
    }

    return this.orderRepository.save(order);
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOne(id);
    await this.orderRepository.remove(order);
  }
}
