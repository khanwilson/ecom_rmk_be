/**
 * JWT Payload Interface
 * Standard payload structure for JWT tokens across all microservices
 */
export interface JwtPayload {
  sub: string; // identity id
  email: string;
  phone: string;
  iat?: number; // issued at (automatically added by JWT)
  exp?: number; // expiration (automatically added by JWT)
}

