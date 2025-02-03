import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAdminDto, CreateUserDto } from './dto/requests/create-user.dto';
import { UpdateUserDto } from './dto/requests/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/requests/login-user.dto';
import { EmailService } from 'src/email/email.service';
import { VerifyEmailDto } from './dto/requests/verify-email.dto';
import { ChangePasswordDto } from './dto/requests/change-password.dto';
import { ForgotPasswordDto } from './dto/requests/forgot-password.dto';
import { ResetPasswordDto } from './dto/requests/reset-password.dto';
import { SocialAuthDto } from './dto/requests/social-auth.dto';
import * as crypto from 'crypto';
import { UserResponseDto } from './dto/response/user-response.dto';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserRole } from '../enums/user-role';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // Method for admin registration
  async createAdmin(createAdminDto: CreateAdminDto) {
    const adminSecret = process.env.ADMIN_SECRET_KEY;

    if (createAdminDto.adminSecret !== adminSecret) {
      throw new UnauthorizedException('Invalid admin secret key');
    }

    const userExists = await this.userRepository.findOne({
      where: { email: createAdminDto.email },
    });

    if (userExists) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);
    const user = this.userRepository.create({
      ...createAdminDto,
      password: hashedPassword,
      isAdmin: true,
      roles: [UserRole.ADMIN, UserRole.USER],
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedUser = await this.userRepository.save(user);
    const tokens = await this.generateTokens(savedUser);
    return { user: this.toUserResponseDto(savedUser), ...tokens };
  }

  async create(createUserDto: CreateUserDto) {
    const userExists = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (userExists) {
      throw new BadRequestException('User already exists');
    }

    const phoneNumberExists = await this.userRepository.findOne({
      where: { mobileNumber: createUserDto.mobileNumber },
    });

    if (phoneNumberExists) {
      throw new BadRequestException('Mobile number already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const verificationCodeExpires = new Date(Date.now() + 3600000);

    // Set default values for new users
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      verificationCode,
      verificationCodeExpires,
      isAdmin: false,
      roles: [UserRole.USER],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedUser = await this.userRepository.save(user);
    await this.sendVerificationEmail(user.email, verificationCode);

    const tokens = await this.generateTokens(savedUser);
    return { user: this.toUserResponseDto(user), ...tokens };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email, isDeleted: false },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new UnauthorizedException(
        'Account is locked. Please try again later.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 60000);
      }
      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user);
    return { user: this.toUserResponseDto(user), ...tokens };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const user = await this.userRepository.findOne({
      where: { email: verifyEmailDto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.verificationCode || !user.verificationCodeExpires) {
      throw new BadRequestException('Verification code not found or expired');
    }

    if (user.verificationCodeExpires < new Date()) {
      throw new BadRequestException('Verification code expired');
    }

    if (user.verificationCode !== verifyEmailDto.verificationCode) {
      throw new BadRequestException('Invalid verification code');
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await this.userRepository.save(user);

    return { message: 'Email verified successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if password is same as current password
    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'New password cannot be the same as current password',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    user.password = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000);

    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = resetTokenExpires;

    await this.userRepository.save(user);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await Promise.all([
      this.emailService.sendPasswordResetEmail(user.email, resetUrl),
    ]);

    return { message: 'Reset password instructions sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetPasswordDto.resetPasswordToken)
      .digest('hex');

    const user = await this.userRepository.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepository.save(user);

    return this.toUserResponseDto(user);
  }

  async handleSocialAuth(socialAuthDto: SocialAuthDto) {
    let user = await this.userRepository.findOne({
      where: { email: socialAuthDto.email },
    });

    if (!user) {
      const generatedPassword = crypto.randomBytes(20).toString('hex');
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      user = await this.userRepository.save({
        email: socialAuthDto.email,
        username:
          socialAuthDto.name?.toLowerCase().replace(/\s+/g, '') +
          Math.random().toString(36).slice(-4),
        password: hashedPassword,
        profilePicture: socialAuthDto.photoUrl,
        isVerified: true,
      });
    }

    const tokens = await this.generateTokens(user);
    return { user, ...tokens };
  }

  async getCurrentUser(request: Request): Promise<UserResponseDto> {
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = this.jwtService.verify(token);
    const user = await this.userRepository.findOne({
      where: { id: decoded.sub, isDeleted: false },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return this.toUserResponseDto(user);
  }

  async findAll() {
    // Try to get users from cache first
    const cachedUsers = await this.cacheManager.get<User>('allUsers');
    if (cachedUsers) {
      return cachedUsers;
    }

    const users = await this.userRepository.find({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
    });

    // Cache the users for 1 hour
    await this.cacheManager.set('allUsers', users, 3600);

    return users.map((user) => this.toUserResponseDto(user));
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return this.toUserResponseDto(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    // Validate unique email
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.userRepository.findOne({
        where: { email: updateUserDto.email, isDeleted: false },
      });

      if (emailExists) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Validate unique mobile number
    if (
      updateUserDto.mobileNumber &&
      updateUserDto.mobileNumber !== user.mobileNumber
    ) {
      const phoneNumberExists = await this.userRepository.findOne({
        where: { mobileNumber: updateUserDto.mobileNumber, isDeleted: false },
      });

      if (phoneNumberExists) {
        throw new BadRequestException('Mobile number already in use');
      }
    }

    // Hash password if it's being updated
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    return this.toUserResponseDto(updatedUser);
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    // Prevent deleting the last admin
    if (user.isAdmin) {
      const adminCount = await this.userRepository.count({
        where: { isAdmin: true, isDeleted: false },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot delete the last admin user');
      }
    }

    user.isDeleted = true;
    await this.userRepository.save(user);
  }

  // private methods
  private async generateTokens(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
          roles: user.roles,
        },
        { expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
          roles: user.roles,
        },
        { expiresIn: '7d' },
      ),
    ]);

    user.refreshToken = refreshToken;
    await this.userRepository.save(user);

    return { accessToken, refreshToken };
  }

  private toUserResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      roles: user.roles,
      isVerified: user.isVerified,
      profilePicture: user.profilePicture,
      mobileNumber: user.mobileNumber,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async sendVerificationEmail(email: string, code: string) {
    try {
      await this.emailService.sendVerificationEmail(email, code);
    } catch (error) {
      console.error(`Failed to send verification email to ${email}:`, error);
    }
  }
}
