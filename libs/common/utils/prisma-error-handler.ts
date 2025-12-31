import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';

/**
 * Prisma Error Codes Reference:
 * P2002: Unique constraint violation
 * P2003: Foreign key constraint violation
 * P2025: Record not found
 * P2028: Transaction timeout
 * P1001: Connection error
 * P1008: Operation timeout
 */

export interface PrismaErrorMeta {
  target?: string[];
  field_name?: string;
  [key: string]: any;
}

export interface PrismaError extends Error {
  code?: string;
  meta?: PrismaErrorMeta;
  clientVersion?: string;
}

/**
 * Handles Prisma errors and converts them to appropriate HTTP exceptions
 * @param error - The error object (can be Prisma error or any error)
 * @param defaultMessage - Default message if error type cannot be determined
 * @returns HttpException appropriate for the error type
 */
export function handlePrismaError(
  error: any,
  defaultMessage: string = 'An error occurred while processing your request',
): HttpException {
  // Check for unique constraint violations (duplicate entries)
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return new ConflictException(
      `Record with this ${field} already exists. Request rolled back.`,
    );
  }

  // Check for foreign key constraint violations
  if (error.code === 'P2003') {
    const fieldName = error.meta?.field_name || 'unknown field';
    return new BadRequestException(
      `Invalid reference: ${fieldName}. Request rolled back.`,
    );
  }

  // Check for record not found
  if (error.code === 'P2025') {
    return new BadRequestException(
      'The requested record was not found. Request rolled back.',
    );
  }

  // Check for transaction timeout
  if (error.code === 'P2028' || error.message?.includes('timeout')) {
    return new InternalServerErrorException(
      'Request timeout. Please try again. All changes have been rolled back.',
    );
  }

  // Check for connection/replica set errors
  if (
    error.code === 'P1001' ||
    error.code === 'P1008' ||
    error.message?.includes('replica set') ||
    error.message?.includes('connection')
  ) {
    return new InternalServerErrorException(
      'Database connection error. Please try again later. Request rolled back.',
    );
  }

  // Generic Prisma errors (all Prisma errors start with 'P')
  if (error.code?.startsWith('P')) {
    return new BadRequestException(
      `Database error: ${error.message || 'Unknown error'}. Request rolled back.`,
    );
  }

  // If it's already an HttpException, return it as is
  if (error instanceof HttpException) {
    return error;
  }

  // Unknown errors - log and return generic error
  console.error('Unhandled error in Prisma operation:', {
    error: error.message,
    code: error.code,
    stack: error.stack,
  });

  return new InternalServerErrorException(
    `${defaultMessage}. Request rolled back. Please try again.`,
  );
}

