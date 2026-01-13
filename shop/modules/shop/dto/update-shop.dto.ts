import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateShopDto {
  @ApiPropertyOptional({
    example: 'My Updated Shop Name',
    description: 'Shop name',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated shop description',
    description: 'Shop description',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/new-logo.png',
    description: 'Shop logo URL',
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/new-cover.png',
    description: 'Shop cover image URL',
  })
  @IsOptional()
  @IsUrl()
  coverImage?: string;
}
