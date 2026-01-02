/**
 * JWT Payload Interface
 * Standard payload structure for JWT tokens across all microservices
 */

export enum IdentityStatus {
  AVAILABLE = 'AVAILABLE',
  LOCKED = 'LOCKED',
  BANNED = 'BANNED',
  DELETED = 'DELETED',
  PENDING = 'PENDING',
  NAN = 'NAN',
}
export interface JwtPayload {
  sub: string; // identity id
  email: string;
  phone: string;
  status: IdentityStatus;
  iat?: number; // issued at (automatically added by JWT)
  exp?: number; // expiration (automatically added by JWT)
}

