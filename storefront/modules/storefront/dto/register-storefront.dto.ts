import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterStorefrontDto {
  @ApiProperty({
    example: 'My Awesome Storefront',
    description: 'Storefront name',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Best curated products by your favorite KOL',
    description: 'Storefront description',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    description: 'Storefront logo URL',
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/cover.png',
    description: 'Storefront cover image URL',
  })
  @IsOptional()
  @IsUrl()
  coverImage?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Default commission rate (%)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}
