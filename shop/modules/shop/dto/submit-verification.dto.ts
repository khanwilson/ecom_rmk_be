import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class VerificationDocumentDto {
  @ApiProperty({
    example: 'business_license',
    description: 'Document type (business_license, id_card, tax_certificate, etc.)',
  })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({
    example: 'https://example.com/documents/business-license.pdf',
    description: 'Document URL',
  })
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    example: 'Business License issued 2025',
    description: 'Document description or notes',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SubmitVerificationDto {
  @ApiProperty({
    type: [VerificationDocumentDto],
    description: 'Array of verification documents',
    example: [
      {
        type: 'business_license',
        url: 'https://example.com/documents/business-license.pdf',
        description: 'Business License 2025',
      },
      {
        type: 'id_card',
        url: 'https://example.com/documents/id-card.pdf',
      },
    ],
  })
  @IsNotEmpty()
  @IsArray()
  documents: VerificationDocumentDto[];
}
