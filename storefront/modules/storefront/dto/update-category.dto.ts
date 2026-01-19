import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: 'Updated Category Name',
    description: 'Category name',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Parent category ID (for nested categories)',
  })
  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @ApiPropertyOptional({
    example: 'Updated description',
    description: 'Category description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/new-category-image.png',
    description: 'Category image URL',
  })
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Is category active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
