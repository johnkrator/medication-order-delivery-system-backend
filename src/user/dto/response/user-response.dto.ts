import { IsString, IsBoolean, IsArray, IsDate, IsUrl } from 'class-validator';

export class UserResponseDto {
  @IsString()
  id: string;

  @IsString()
  username: string;

  @IsString()
  email: string;

  @IsBoolean()
  isAdmin: boolean;

  @IsArray()
  roles: string[];

  @IsBoolean()
  isVerified: boolean;

  @IsUrl()
  profilePicture: string;

  @IsString()
  mobileNumber: string;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}