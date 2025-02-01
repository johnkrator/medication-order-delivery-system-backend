import { Injectable, NotFoundException } from '@nestjs/common';
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
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
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

    // Calculate total amount
    const totalAmount = medications.reduce(
      (sum, medication) => sum + medication.price,
      0,
    );

    // Create order
    const order = this.orderRepository.create({
      user,
      medications,
      totalAmount,
      deliveryAddress,
      specialInstructions,
      status: OrderStatus.PENDING,
    });

    // Save order
    const savedOrder = await this.orderRepository.save(order);

    // Initiate payment
    const payment = await this.paymentService.initiatePayment({
      orderId: savedOrder.id,
      amount: totalAmount,
      email: user.email,
    });

    // Update order with payment reference
    savedOrder.paymentReference = payment.paymentReference;
    return this.orderRepository.save(savedOrder);
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['user', 'medications', 'deliveryPartner'],
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'medications', 'deliveryPartner'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
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
