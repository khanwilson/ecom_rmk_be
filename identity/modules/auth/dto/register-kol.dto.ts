import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterKolDto {
  @ApiProperty({
    example: 'My Storefront',
    description: 'Storefront name',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  storefrontName: string;

  @ApiPropertyOptional({
    example: 'I recommend the best products for you',
    description: 'Storefront description',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  storefrontDescription?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    description: 'Storefront logo URL',
  })
  @IsOptional()
  @IsString()
  storefrontLogo?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/cover.png',
    description: 'Storefront cover image URL',
  })
  @IsOptional()
  @IsString()
  storefrontCoverImage?: string;
}
