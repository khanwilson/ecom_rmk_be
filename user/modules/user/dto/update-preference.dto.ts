import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePreferenceDto {
  @ApiPropertyOptional({ description: 'Language code (e.g., vi, en)', default: 'vi' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Currency code (e.g., VND, USD)', default: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Enable email notifications', default: true })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications', default: false })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable push notifications', default: true })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;
}
