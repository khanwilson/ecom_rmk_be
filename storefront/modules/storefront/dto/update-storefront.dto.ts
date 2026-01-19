import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateStorefrontDto {
  @ApiPropertyOptional({
    example: 'My Updated Storefront Name',
    description: 'Storefront name',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated storefront description',
    description: 'Storefront description',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/new-logo.png',
    description: 'Storefront logo URL',
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/new-cover.png',
    description: 'Storefront cover image URL',
  })
  @IsOptional()
  @IsUrl()
  coverImage?: string;

  @ApiPropertyOptional({
    example: 15,
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
