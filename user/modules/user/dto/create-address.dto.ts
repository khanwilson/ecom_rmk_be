import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ description: 'Address label (e.g., Home, Office)' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Full name for delivery' })
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ description: 'Street address' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: 'Ward' })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiPropertyOptional({ description: 'District' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Province' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Set as default address', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
