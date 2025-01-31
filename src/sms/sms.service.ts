import { Injectable } from '@nestjs/common';
import * as twilio from 'twilio';

@Injectable()
export class SmsService {
  private client: import('twilio/lib/rest/Twilio');

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async sendVerificationSMS(phoneNumber: string, code: string) {
    await this.client.messages.create({
      body: `Your verification code is: ${code}`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
    });
  }

  async sendPasswordResetSMS(phoneNumber: string, code: string) {
    await this.client.messages.create({
      body: `Your password reset code is: ${code}`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
    });
  }
}