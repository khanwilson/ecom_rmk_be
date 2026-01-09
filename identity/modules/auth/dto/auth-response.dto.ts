import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  identity: {
    id: string;
    email: string;
    phoneNumber: string;
    phoneCountry: string;
    status: string;
    emailVerified: boolean;
  };
}
