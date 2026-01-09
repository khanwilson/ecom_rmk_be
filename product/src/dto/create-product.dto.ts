import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ProductType } from 'generated/prisma/enums';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Latest iPhone with advanced features', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'IPHONE-15-PRO-001' })
  @IsNotEmpty()
  @IsString()
  sku: string;

  @ApiProperty({ example: 999.99 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ enum: ProductType, example: ProductType.PHYSICAL, required: false })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiProperty({ example: 'identity-id-here', description: 'Seller Identity ID' })
  @IsNotEmpty()
  @IsString()
  sellerId: string;
}
