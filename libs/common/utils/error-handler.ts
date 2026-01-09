import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';

/**
 * Error Codes Reference:
 * P2002: Unique constraint violation
 * P2003: Foreign key constraint violation
 * P2025: Record not found
 * P2028: Transaction timeout
 * P1001: Connection error
 * P1008: Operation timeout
 */

export interface ErrorMeta {
  target?: string[];
  field_name?: string;
  [key: string]: any;
}

export interface PrismaError extends Error {
  code?: string;
  meta?: ErrorMeta;
  clientVersion?: string;
}

/**
 * Handles errors and converts them to appropriate HTTP exceptions
 * @param error - The error object (can be any error)
 * @param message - Default message if error type cannot be determined
 * @returns HttpException appropriate for the error type
 */
export function handleError(error: any, message: string = ''): HttpException {
  console.error(`❌ Got Failed:`, error);
  // Check for unique constraint violations (duplicate entries)
  if (error.code === 'P2002') {
    let field = 'field';
    if (typeof error.meta?.target === 'string') {
      field = error.meta?.target;
    } else if (Array.isArray(error.meta?.target) && error.meta?.target.length > 0) {
      field = error.meta?.target[0];
    }
    return new ConflictException(
      message || `Record with this ${field} already exists. Request rolled back.`
    );
  }

  // Check for foreign key constraint violations
  if (error.code === 'P2003') {
    const fieldName = error.meta?.field_name || 'unknown field';
    return new BadRequestException(
      message || `Invalid reference: ${fieldName}. Request rolled back.`
    );
  }

  // Check for record not found
  if (error.code === 'P2025') {
    return new BadRequestException(
      message || 'The requested record was not found. Request rolled back.'
    );
  }

  // Check for transaction timeout
  if (error.code === 'P2028' || error.message?.includes('timeout')) {
    return new InternalServerErrorException(
      message || 'Request timeout. Please try again. All changes have been rolled back.'
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
      message || 'Database connection error. Please try again later. Request rolled back.'
    );
  }

  // If it's already an HttpException, return it as is
  if (error instanceof HttpException) {
    return error;
  }

  return new InternalServerErrorException(
    `An error occurred while processing your request. Request rolled back. Please try again.`
  );
}
