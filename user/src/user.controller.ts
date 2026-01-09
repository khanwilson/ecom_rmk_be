import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';

@ApiTags('user')
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  getHello(): string {
    return this.userService.getHello();
  }

  @Get('test/redis')
  @ApiOperation({ summary: 'Test Redis connection and operations' })
  async testRedis() {
    return this.userService.testRedis();
  }

  @Get('test/mongodb')
  @ApiOperation({ summary: 'Test MongoDB connection and insert operation' })
  async testMongoDB() {
    return this.userService.testMongoDB();
  }
}
