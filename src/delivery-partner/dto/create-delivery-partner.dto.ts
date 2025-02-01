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
  firstName: string; // First name of the delivery partner

  @IsString()
  @IsNotEmpty()
  lastName: string; // Last name of the delivery partner

  @IsEmail()
  @IsNotEmpty()
  email: string; // Email of the delivery partner

  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string; // Phone number of the delivery partner

  @IsString()
  @IsOptional()
  vehicleType?: string; // Type of vehicle (optional)

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean; // Availability status (optional, default: true)
}
