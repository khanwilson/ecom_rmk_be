import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';


@Injectable()
export class MongoService implements OnModuleDestroy {
  private client: MongoClient | null = null;

  constructor(
    private readonly configService: ConfigService,
  ) { }

  private async getClient(): Promise<MongoClient> {
    try {
      const MongoURI = `mongodb+srv://${this.configService.getOrThrow<string>('DB_USERNAME')}:${encodeURIComponent(this.configService.getOrThrow<string>('DB_PASSWORD'))}@${this.configService.getOrThrow<string>('DB_HOST')}/?retryWrites=true&w=majority&appName=${this.configService.getOrThrow<string>('DB_APP_NAME')}`;
      if (!this.client) {
        this.client = new MongoClient(MongoURI);
        await this.client.connect();
      }
    } catch (error) {
      console.error('Error connecting to MongoDB', error);
      throw error;
    }
    return this.client;
  }

  async getDatabase() {
    const dbName = this.configService.getOrThrow<string>('DB_APP_NAME');
    const client = await this.getClient();
    return client.db(dbName);
  }

  async ping() {
    const dbName = this.configService.getOrThrow<string>('DB_APP_NAME');
    const client = await this.getClient();
    await client.db(dbName).command({ ping: 1 });
    return { status: 'ok', database: dbName };
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}

