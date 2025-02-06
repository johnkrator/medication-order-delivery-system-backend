import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Payment } from './entities/payment.entity';
import { Order } from '../order/entities/order.entity';
import { PaymentStatus } from '../enums/payment-status';
import { Cache } from 'cache-manager';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @Inject('CACHE_MANAGER') private cacheManager: Cache,
  ) {}

  async initiatePayment(data: {
    orderId: string;
    amount: number;
    email: string;
  }): Promise<{
    paymentReference: string;
    redirectUrl: string;
    callbackUrl: string; // Add callbackUrl to the response
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
        callbackUrl, // Include callbackUrl in the response
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

      console.log('Paystack API Response:', response.data); // Log the full response

      if (!response.data.status) {
        throw new Error(
          `Paystack API error: ${response.data.message}`,
        );
      }

      const transactionStatus = response.data.data.status;

      // Find the payment record
      const payment = await this.paymentRepository.findOne({
        where: { transactionReference },
        relations: ['order'],
      });

      if (!payment) {
        throw new NotFoundException(
          `Payment record not found for reference: ${transactionReference}`,
        );
      }

      // Handle different transaction statuses
      switch (transactionStatus) {
        case 'success':
          // Update payment and order status to SUCCESSFUL
          payment.status = PaymentStatus.SUCCESSFUL;
          if (payment.order) {
            payment.order.paymentStatus = PaymentStatus.SUCCESSFUL;
            await this.orderRepository.save(payment.order);
          }
          break;

        case 'abandoned':
          // Update payment and order status to ABANDONED
          payment.status = PaymentStatus.ABANDONED;
          if (payment.order) {
            payment.order.paymentStatus = PaymentStatus.ABANDONED;
            await this.orderRepository.save(payment.order);
          }
          throw new Error('Payment abandoned: The transaction was not completed.');

        case 'failed':
          // Update payment and order status to FAILED
          payment.status = PaymentStatus.FAILED;
          if (payment.order) {
            payment.order.paymentStatus = PaymentStatus.FAILED;
            await this.orderRepository.save(payment.order);
          }
          throw new Error(`Payment failed: ${response.data.data.gateway_response}`);

        default:
          // Handle other statuses (e.g., pending, reversed, etc.)
          throw new Error(`Payment status is ${transactionStatus}.`);
      }

      // Save the updated payment status
      await this.paymentRepository.save(payment);

      return payment;
    } catch (error) {
      console.error('Payment verification failed:', error);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  async getAllPayments(): Promise<Payment[]> {
    const cacheKey = 'allPayments';
    const cachedPayments = await this.cacheManager.get<Payment[]>(cacheKey);

    if (cachedPayments) {
      return cachedPayments;
    }

    const payments = await this.paymentRepository.find({
      relations: ['order'],
    });
    await this.cacheManager.set(cacheKey, payments, 3600); // Cache for 1 hour

    return payments;
  }

  async getPaymentById(id: string): Promise<Payment> {
    const cacheKey = `payment_${id}`;
    const cachedPayment = await this.cacheManager.get<Payment>(cacheKey);

    if (cachedPayment) {
      return cachedPayment;
    }

    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    await this.cacheManager.set(cacheKey, payment, 3600); // Cache for 1 hour

    return payment;
  }
}
