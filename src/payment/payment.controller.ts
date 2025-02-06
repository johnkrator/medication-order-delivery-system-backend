import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  Param,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  initiatePayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.initiatePayment(createPaymentDto);
  }

  @Get('verify')
  async verifyPayment(@Query('transactionReference') transactionReference: string) {
    try {
      return await this.paymentService.verifyPayment(transactionReference);
    } catch (error) {
      if (error.message.includes('Payment abandoned')) {
        throw new BadRequestException(error.message);
      } else if (error.message.includes('Payment failed')) {
        throw new BadRequestException(error.message);
      } else {
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  @Post('callback')
  async handlePaymentCallback(@Query('transactionReference') transactionReference: string) {
    try {
      return await this.paymentService.verifyPayment(transactionReference);
    } catch (error) {
      if (error.message.includes('Payment abandoned')) {
        throw new BadRequestException(error.message);
      } else if (error.message.includes('Payment failed')) {
        throw new BadRequestException(error.message);
      } else {
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  @Get()
  async getAllPayments(): Promise<Payment[]> {
    return this.paymentService.getAllPayments();
  }

  @Get(':id')
  async getPaymentById(@Param('id') id: string): Promise<Payment> {
    return this.paymentService.getPaymentById(id);
  }
}
