import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../order/entities/order.entity';
import { PaymentStatus } from '../enums/payment-status';

const PayStack = require('paystack-node');

@Injectable()
export class PaymentService {
  private readonly paystack: any;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {
    // Initialize Paystack with your secret key
    this.paystack = new PayStack(process.env.PAYSTACK_SECRET_KEY, 'test'); // Use 'live' instead of 'test' for production
  }

  async initiatePayment(data: {
    orderId: string;
    amount: number;
    email: string;
  }): Promise<{ paymentReference: string; redirectUrl: string }> {
    const { orderId, amount, email } = data;

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    try {
      const paymentPayload = {
        reference: `ORDER-${orderId}-${Date.now()}`,
        amount: amount * 100, // Paystack expects amount in kobo
        email,
        currency: 'NGN',
        callback_url:
          process.env.PAYMENT_CALLBACK_URL ||
          'https://http://localhost:3000/api/payment/callback',
        metadata: {
          orderId,
          custom_fields: [
            {
              display_name: 'Order ID',
              variable_name: 'order_id',
              value: orderId,
            },
          ],
        },
      };

      const response =
        await this.paystack.initializeTransaction(paymentPayload);

      if (!response.status) {
        throw new Error('Payment initialization failed');
      }

      // Save payment record
      const payment = this.paymentRepository.create({
        order,
        amount,
        status: PaymentStatus.PENDING,
        transactionReference: paymentPayload.reference,
      });
      await this.paymentRepository.save(payment);

      return {
        paymentReference: paymentPayload.reference,
        redirectUrl: response.data.authorization_url,
      };
    } catch (error) {
      console.error('Paystack payment initialization error:', error);
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  }

  async verifyPayment(transactionReference: string): Promise<Payment> {
    try {
      const response =
        await this.paystack.verifyTransaction(transactionReference);

      if (!response.status || response.data.status !== 'success') {
        throw new Error('Payment verification failed');
      }

      const payment = await this.paymentRepository.findOne({
        where: { transactionReference },
        relations: ['order'],
      });

      if (!payment) {
        throw new NotFoundException('Payment record not found');
      }

      // Update payment status
      payment.status = PaymentStatus.SUCCESSFUL;
      await this.paymentRepository.save(payment);

      // Update order status
      const order = payment.order;
      order.paymentStatus = PaymentStatus.SUCCESSFUL;
      await this.orderRepository.save(order);

      return payment;
    } catch (error) {
      console.error('Paystack payment verification error:', error);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }
}
