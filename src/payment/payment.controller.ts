import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, VerifyPaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  initiatePayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.initiatePayment(createPaymentDto);
  }

  @Post('verify')
  verifyPayment(@Query() verifyPaymentDto: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(verifyPaymentDto.transactionId);
  }

  @Post('payment/callback')
  async handlePaymentCallback(@Query('transaction_id') transactionId: string) {
    return this.paymentService.verifyPayment(transactionId);
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
