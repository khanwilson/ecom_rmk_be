import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getDatabaseHealth() {
    return this.appService.getDatabaseHealth();
  }

  @Get('')
  getHello() {
    return 'Hello World!';
  }
}
