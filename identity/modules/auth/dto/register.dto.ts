import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', required: true })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+84901234567', required: true })
  @IsNotEmpty()
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}

