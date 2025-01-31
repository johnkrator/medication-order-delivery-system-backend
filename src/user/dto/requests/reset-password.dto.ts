import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/custom-decorators/password.validator.decorator';

export class ResetPasswordDto {
  @IsString()
  resetPasswordToken: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @IsStrongPassword()
  newPassword: string;
}
