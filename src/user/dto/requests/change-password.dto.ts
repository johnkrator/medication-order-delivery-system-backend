import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/custom-decorators/password.validator.decorator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @IsStrongPassword()
  newPassword: string;
}
