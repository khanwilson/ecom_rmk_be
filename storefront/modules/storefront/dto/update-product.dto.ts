import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439013',
    description: 'Storefront category ID to move product to',
  })
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 'Updated Custom Product Title',
    description: 'Custom title for the product (KOL branding)',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customTitle?: string;

  @ApiPropertyOptional({
    example: 'Updated review for this amazing product!',
    description: 'Custom description/review for the product',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customDescription?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/updated-custom-image.png',
    description: 'Custom image URL for the product',
  })
  @IsOptional()
  @IsUrl()
  customImage?: string;

  @ApiPropertyOptional({
    example: 15,
    description: 'Override commission rate for this product (%)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Is product active on storefront',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
