import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Auto accept incoming orders',
  })
  @IsOptional()
  @IsBoolean()
  autoAcceptOrder?: boolean;

  @ApiPropertyOptional({
    example: 'Free shipping for orders above 500,000 VND',
    description: 'Shipping policy description',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  shippingPolicy?: string;

  @ApiPropertyOptional({
    example: '7-day return policy for unused items',
    description: 'Return policy description',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  returnPolicy?: string;

  @ApiPropertyOptional({
    example: '12-month warranty for electronic items',
    description: 'Warranty policy description',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  warrantyPolicy?: string;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Minimum order value (in VND)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @ApiPropertyOptional({
    example: 500000,
    description: 'Free shipping threshold (in VND)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingThreshold?: number;
}
