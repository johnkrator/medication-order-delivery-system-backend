import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class CreateDeliveryPartnerDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsPhoneNumber('NG')
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  vehicleType?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
