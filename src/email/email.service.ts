import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SentMessageInfo, Options } from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter<SentMessageInfo, Options>;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async onModuleInit() {
    try {
      await this.transporter.verify();
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Email service initialization failed:', error);
      throw error;
    }
  }

  async sendVerificationEmail(email: string, code: string) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Verify Your Email',
      html: `
        <h1>Email Verification</h1>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code will expire in 1 hour.</p>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, resetUrl: string) {
    console.log(`Sending password reset email to ${email} with reset URL: ${resetUrl}`);

    // Verify the resetUrl is not empty or undefined
    if (!resetUrl) {
      throw new Error('Reset URL is required');
    }

    const emailContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <style>
            .button {
              background-color: #4CAF50;
              border: none;
              color: white;
              padding: 15px 32px;
              text-align: center;
              text-decoration: none;
              display: inline-block;
              font-size: 16px;
              margin: 4px 2px;
              cursor: pointer;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <h1>Password Reset Request</h1>
          <p>You've requested to reset your password. Click the button below to proceed:</p>
          <p>
            <a href="${resetUrl}" class="button" style="color: white;">Reset Password</a>
          </p>
          <p>Or copy and paste this URL into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Reset Your Password',
      html: emailContent,
    });
  }
}