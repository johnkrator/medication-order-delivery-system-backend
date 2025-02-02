import { Controller, Post, Body, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, VerifyPaymentDto } from './dto/create-payment.dto';

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
}
