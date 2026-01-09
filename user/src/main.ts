import { HttpExceptionInterceptor } from '@ecom-rmk/libs/common';
import { retryConnect } from '@ecom-rmk/libs/utils';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UserModule } from './user.module';

async function bootstrap() {
  const app = await NestFactory.create(UserModule);
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
    .setTitle('User Service API')
    .setDescription('User profiles, addresses, and preferences Service API Documentation')
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
    .addTag('user', 'User management endpoints')
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
        clientId: 'user-service',
        brokers: [kafkaBroker],
      },
      consumer: {
        groupId: 'user-service-consumer',
      },
    },
  });

  await retryConnect('Kafka microservice (ServerKafka)', app.startAllMicroservices);

  const port = parseInt(configService.get<string>('USER_PORT', '3003'), 10) || 3003;
  await app.listen(port);
  console.log(`✅ User service running on: http://localhost:${port}`);
  console.log(`📚 Swagger: http://localhost:${port}/api`);
}

bootstrap();
