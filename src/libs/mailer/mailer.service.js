"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailerService = void 0;
const common_1 = require("@nestjs/common");
@(0, common_1.Injectable)()
class MailerService {
    configService;
    logger = new common_1.Logger(MailerService.name);
    constructor(configService) {
        this.configService = configService;
    }
    /**
     * Send email (placeholder - implement with nodemailer or similar)
     * For now, just logs the email content
     */
    async sendEmail(options) {
        const mailHost = this.configService.get('MAIL_HOST');
        const mailPort = this.configService.get('MAIL_PORT', 587);
        const mailUser = this.configService.get('MAIL_USER');
        const mailFrom = this.configService.get('MAIL_FROM', 'no-reply@example.com');
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
    async sendOtpEmail(to, otpCode, type) {
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
exports.MailerService = MailerService;
