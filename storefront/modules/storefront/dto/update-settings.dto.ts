import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SocialLinksDto {
  @ApiPropertyOptional({ example: 'https://instagram.com/myprofile' })
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional({ example: 'https://tiktok.com/@myprofile' })
  @IsOptional()
  @IsString()
  tiktok?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/@mychannel' })
  @IsOptional()
  @IsString()
  youtube?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/mypage' })
  @IsOptional()
  @IsString()
  facebook?: string;

  @ApiPropertyOptional({ example: 'https://twitter.com/myhandle' })
  @IsOptional()
  @IsString()
  twitter?: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    type: SocialLinksDto,
    description: 'Social media links',
  })
  @IsOptional()
  @IsObject()
  socialLinks?: SocialLinksDto;

  @ApiPropertyOptional({
    example: 'Fashion enthusiast & lifestyle blogger',
    description: 'KOL bio/about',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Show earnings publicly on storefront',
  })
  @IsOptional()
  @IsBoolean()
  showEarnings?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Auto accept product additions',
  })
  @IsOptional()
  @IsBoolean()
  autoAcceptProducts?: boolean;

  @ApiPropertyOptional({
    example: 5,
    description: 'Minimum commission rate to accept (%)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minCommissionRate?: number;
}
