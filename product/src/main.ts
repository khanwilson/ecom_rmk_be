import { retryConnectKafkaService } from '@ecom-rmk/libs/utils';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ProductModule } from './product.module';

async function bootstrap() {
  const app = await NestFactory.create(ProductModule);
  const configService = app.get(ConfigService);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Product Service API')
    .setDescription('Product Management Service API Documentation')
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
      'JWT-auth',
    )
    .addTag('product', 'Product management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Connect Kafka microservice
  const kafkaBroker = configService.get<string>(
    'KAFKA_BROKER',
    'kafka:9092',
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'product-service',
        brokers: [kafkaBroker],
      },
      consumer: {
        groupId: 'product-service-consumer',
      },
    },
  });

  await retryConnectKafkaService(app.startAllMicroservices());

  const port = process.env.PRODUCT_PORT || 3002;
  await app.listen(port);
  console.log(`✅ Product service running on: http://localhost:${port}`);
  console.log(`📚 Swagger: http://localhost:${port}/api`);
  console.log(`🔌 Kafka broker: ${kafkaBroker}`);
}

bootstrap();
