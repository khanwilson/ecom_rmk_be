import { Module } from '@nestjs/common';
import { KafkaClientModule } from './kafka-client.module';
import { KafkaController } from './kafka.controller';
import { KafkaConsumerService } from './kafka-consumer.service';

@Module({
  imports: [KafkaClientModule],
  controllers: [KafkaController],
  providers: [KafkaConsumerService],
  exports: [KafkaClientModule],
})
export class KafkaModule {}


