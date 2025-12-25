import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Send email (placeholder - implement with nodemailer or similar)
   * For now, just logs the email content
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<void> {
    const mailHost = this.configService.get<string>('MAIL_HOST');
    const mailPort = this.configService.get<number>('MAIL_PORT', 587);
    const mailUser = this.configService.get<string>('MAIL_USER');
    const mailFrom = this.configService.get<string>('MAIL_FROM', 'no-reply@example.com');

    // TODO: Implement actual email sending with nodemailer
    this.logger.log(`[Mailer] Would send email to ${options.to}`);
    this.logger.log(`  Subject: ${options.subject}`);
    this.logger.log(`  From: ${mailFrom}`);
    this.logger.log(`  Host: ${mailHost}:${mailPort}`);

    // Placeholder implementation
    // In production, use nodemailer or similar:
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail({ from: mailFrom, ...options });
  }

  /**
   * Send OTP email
   */
  async sendOtpEmail(to: string, otpCode: string, type: string): Promise<void> {
    const subject = `Your verification code: ${otpCode}`;
    const html = `
      <h2>Verification Code</h2>
      <p>Your verification code is: <strong>${otpCode}</strong></p>
      <p>This code will expire in 5 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    `;

    await this.sendEmail({ to, subject, html });
  }
}

