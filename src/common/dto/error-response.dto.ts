import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message or array of error messages',
    example: 'Validation failed',
    oneOf: [
      { type: 'string' },
      {
        type: 'array',
        items: { type: 'string' },
      },
    ],
  })
  message: string | string[];

  @ApiProperty({
    description: 'Error name/type',
    example: 'Bad Request',
  })
  error: string;

  @ApiProperty({
    description: 'Timestamp when the error occurred',
    example: '2025-11-19T10:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path where the error occurred',
    example: '/users/123',
  })
  path: string;
}

