import { Injectable } from '@nestjs/common';

@Injectable()
export class IdentityService {
  health() {
    return {
      status: 'ok',
      service: 'identity',
      timestamp: new Date().toISOString(),
    };
  }
}


