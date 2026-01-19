import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class RegisterShopDto {
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
  name: string;

  @ApiPropertyOptional({
    example: 'Best products at best prices',
    description: 'Shop description',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    description: 'Shop logo URL',
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/cover.png',
    description: 'Shop cover image URL',
  })
  @IsOptional()
  @IsUrl()
  coverImage?: string;
}
