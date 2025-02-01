import { IsString, IsNumber, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateMedicationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  manufacturer: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  dosage: string;

  @IsInt()
  @Min(0)
  stockQuantity: number;
}
