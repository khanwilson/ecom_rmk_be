import { Injectable } from '@nestjs/common';
import { MongoService } from './database/mongo.service';

@Injectable()
export class AppService {
  constructor(private readonly mongoService: MongoService) { }

  async getDatabaseHealth() {
    return this.mongoService.ping();
  }
}
