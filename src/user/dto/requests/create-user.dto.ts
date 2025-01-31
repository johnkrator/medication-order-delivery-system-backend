import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsStrongPassword } from '../../../common/custom-decorators/password.validator.decorator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsEmail()
  @MinLength(3)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @IsStrongPassword()
  password: string;

  @IsString()
  @MaxLength(11)
  mobileNumber: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roles?: string[];

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}

export class CreateAdminDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @IsStrongPassword()
  password: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(11)
  mobileNumber: string;

  @IsNotEmpty()
  @IsString()
  adminSecret: string;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}
