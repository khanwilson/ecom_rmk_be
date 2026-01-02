import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@ecom-rmk/libs/auth';
import type { JwtPayload } from '@ecom-rmk/libs/auth';
import { OtpService } from './otp.service';

@ApiTags('otp')
@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: 'Send OTP via email (private)' })
  async sendOtp(
    @CurrentUser() user: JwtPayload,
    @Body('type') type: string,
  ) {
    // Note: email is required in schema, so it should always be present
    await this.otpService.sendOtp(user.sub, type as any, user.email);
    return { message: 'OTP sent successfully' };
  }
}

