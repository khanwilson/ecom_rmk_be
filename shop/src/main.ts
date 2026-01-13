import { HttpExceptionInterceptor } from '@ecom-rmk/libs/common';
import { retryConnect } from '@ecom-rmk/libs/utils';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ShopModule } from './shop.module';

async function bootstrap() {
  const app = await NestFactory.create(ShopModule);
  const configService = app.get(ConfigService);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Apply global exception interceptor for consistent error responses
  app.useGlobalInterceptors(new HttpExceptionInterceptor());

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Shop Service API')
    .setDescription('Shop management Service API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'accessToken'
    )
    .addTag('shop', 'Shop management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Connect Kafka microservice
  const kafkaBroker = configService.get<string>('KAFKA_BROKER', 'kafka:9092');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'shop-service',
        brokers: [kafkaBroker],
      },
      consumer: {
        groupId: 'shop-service-consumer',
      },
    },
  });

  await retryConnect('Kafka microservice (ServerKafka)', app.startAllMicroservices);

  const port = parseInt(configService.get<string>('SHOP_PORT', '3004'), 10) || 3004;
  await app.listen(port);
  console.log(`✅ Shop service running on: http://localhost:${port}`);
  console.log(`📚 Swagger: http://localhost:${port}/api`);
}

bootstrap();
