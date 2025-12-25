"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class ErrorResponseDto {
    @(0, swagger_1.ApiProperty)({
        description: 'HTTP status code',
        example: 400,
    })
    statusCode;
    @(0, swagger_1.ApiProperty)({
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
    message;
    @(0, swagger_1.ApiProperty)({
        description: 'Error name/type',
        example: 'Bad Request',
    })
    error;
    @(0, swagger_1.ApiProperty)({
        description: 'Timestamp when the error occurred',
        example: '2025-11-19T10:00:00.000Z',
    })
    timestamp;
    @(0, swagger_1.ApiProperty)({
        description: 'Request path where the error occurred',
        example: '/users/123',
    })
    path;
}
exports.ErrorResponseDto = ErrorResponseDto;
