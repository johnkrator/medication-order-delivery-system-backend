import { IsDecimal, IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsDecimal()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  email: string;
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;
}
