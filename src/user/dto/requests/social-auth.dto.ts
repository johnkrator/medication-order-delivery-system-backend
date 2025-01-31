import { IsEmail, IsOptional, IsString } from "class-validator";

export class SocialAuthDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}