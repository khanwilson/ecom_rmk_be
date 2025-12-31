import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OtpService } from './otp.service';
import { JwtAuthGuard } from 'modules/auth/guards/jwt-auth.guard';
import { CurrentIdentity } from 'modules/auth/decorators/current-identity.decorator';

@ApiTags('otp')
@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send OTP via email (private)' })
  async sendOtp(
    @CurrentIdentity() identity: any,
    @Body('type') type: string,
  ) {
    // Note: email is required in schema, so it should always be present
    await this.otpService.sendOtp(identity.id, type as any, identity.email);
    return { message: 'OTP sent successfully' };
  }
}

