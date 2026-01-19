import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AddProductDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Product ID from Product service',
  })
  @IsNotEmpty()
  @IsMongoId()
  productId: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Shop ID that owns the product',
  })
  @IsNotEmpty()
  @IsMongoId()
  shopId: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439013',
    description: 'Storefront category ID to place product in',
  })
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 'My Custom Product Title',
    description: 'Custom title for the product (KOL branding)',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customTitle?: string;

  @ApiPropertyOptional({
    example: 'I absolutely love this product! Here is why...',
    description: 'Custom description/review for the product',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customDescription?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/custom-image.png',
    description: 'Custom image URL for the product',
  })
  @IsOptional()
  @IsUrl()
  customImage?: string;

  @ApiPropertyOptional({
    example: 12,
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
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 0,
    description: 'Display order',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
