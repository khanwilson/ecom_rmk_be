import { NestFactory } from '@nestjs/core';
import { HttpException, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionInterceptor } from './common/interceptors/http-exception.interceptor';

async function bootstrap() {
  // Create hybrid application (HTTP + Kafka Microservice)
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global exception interceptor
  app.useGlobalInterceptors(new HttpExceptionInterceptor());

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          return Object.values(error.constraints || {}).join(', ');
        });
        return new HttpException(
          {
            statusCode: 400,
            message: messages,
            error: 'Bad Request',
            timestamp: new Date().toISOString(),
          },
          400,
        );
      },
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('ecom_rmk_be API')
    .setDescription('API documentation for CozyFocus backend')
    .setVersion('1.0')
    .addTag('kafka', 'Kafka messaging endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('subscriptions', 'Subscription management endpoints')
    .addTag('transactions', 'Transaction management endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Connect Kafka Microservice
  const kafkaBroker = configService.get('KAFKA_BROKER', 'kafka:9092');
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'ecom-rmk-consumer',
        brokers: [kafkaBroker],
      },
      consumer: {
        groupId: 'ecom-rmk-consumer-group',
      },
    },
  });

  // Start all microservices
  await app.startAllMicroservices();

  // Start HTTP server
  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  console.log(`📨 Kafka broker: ${kafkaBroker}`);
  console.log(`✅ HTTP Server running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
