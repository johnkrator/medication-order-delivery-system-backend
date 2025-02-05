import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Payment } from './entities/payment.entity';
import { Order } from '../order/entities/order.entity';
import { PaymentStatus } from '../enums/payment-status';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async initiatePayment(data: {
    orderId: string;
    amount: number;
    email: string;
  }): Promise<{
    paymentReference: string;
    redirectUrl: string;
  }> {
    const { orderId, amount, email } = data;

    if (!orderId || !amount || !email) {
      throw new BadRequestException('Missing required payment parameters');
    }

    if (amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const paymentReference = `ORDER-${orderId}-${Date.now()}`;
    const callbackUrl =
      process.env.PAYMENT_CALLBACK_URL ||
      'http://localhost:3000/api/payment/callback';

    const paymentPayload = {
      reference: paymentReference,
      amount: amount * 100, // Paystack expects amount in kobo
      email,
      currency: 'NGN',
      callback_url: callbackUrl,
      metadata: { orderId },
    };

    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        paymentPayload,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.status) {
        throw new Error(
          response.data.message || 'Failed to initialize payment',
        );
      }

      const payment = this.paymentRepository.create({
        order,
        amount,
        status: PaymentStatus.PENDING,
        transactionReference: paymentReference,
        authorizationUrl: response.data.data.authorization_url,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await this.paymentRepository.save(payment);

      return {
        paymentReference,
        redirectUrl: response.data.data.authorization_url,
      };
    } catch (error) {
      console.error('Payment initialization failed:', error);
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  }

  async verifyPayment(transactionReference: string): Promise<Payment> {
    if (!transactionReference) {
      throw new BadRequestException('Transaction reference is required');
    }

    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${transactionReference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        },
      );

      if (!response.data.status || response.data.data.status !== 'success') {
        throw new Error(
          `Payment unsuccessful: ${response.data.data.gateway_response}`,
        );
      }

      const payment = await this.paymentRepository.findOne({
        where: { transactionReference },
        relations: ['order'],
      });

      if (!payment) {
        throw new NotFoundException(
          `Payment record not found for reference: ${transactionReference}`,
        );
      }

      payment.status = PaymentStatus.SUCCESSFUL;
      await this.paymentRepository.save(payment);

      if (payment.order) {
        payment.order.paymentStatus = PaymentStatus.SUCCESSFUL;
        await this.orderRepository.save(payment.order);
      }

      return payment;
    } catch (error) {
      console.error('Payment verification failed:', error);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  async getAllPayments(): Promise<Payment[]> {
    return this.paymentRepository.find({ relations: ['order'] });
  }

  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }
}
