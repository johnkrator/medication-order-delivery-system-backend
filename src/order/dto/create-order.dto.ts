import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { OrderStatus } from '../../enums/order-status';

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  medicationIds: string[];

  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @IsString()
  @IsOptional()
  specialInstructions?: string;

  @IsUUID()
  @IsOptional()
  deliveryPartnerId?: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
