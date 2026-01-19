import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterSellerDto {
  @ApiProperty({
    example: 'My Awesome Shop',
    description: 'Shop name',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  shopName: string;

  @ApiPropertyOptional({
    example: 'We sell the best products in town',
    description: 'Shop description',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  shopDescription?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    description: 'Shop logo URL',
  })
  @IsOptional()
  @IsString()
  shopLogo?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/cover.png',
    description: 'Shop cover image URL',
  })
  @IsOptional()
  @IsString()
  shopCoverImage?: string;
}
