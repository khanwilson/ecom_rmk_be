import { HttpExceptionInterceptor } from '@ecom-rmk/libs/common';
import { retryConnect } from '@ecom-rmk/libs/utils';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IdentityModule } from './identity.module';

async function bootstrap() {
  const app = await NestFactory.create(IdentityModule);
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
    .setTitle('Identity Service API')
    .setDescription('Identity and Authentication Service API Documentation')
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
    .addTag('auth', 'Authentication endpoints')
    .addTag('otp', 'OTP endpoints')
    .addTag('identity', 'Identity management endpoints')
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
        clientId: 'identity-service',
        brokers: [kafkaBroker],
      },
      consumer: {
        groupId: 'identity-service-consumer',
      },
    },
  });

  await retryConnect('Kafka microservice (ServerKafka)', app.startAllMicroservices);

  const port = process.env.IDENTITY_PORT || 3001;
  await app.listen(port);
  console.log(`✅ Identity service running on: http://localhost:${port}`);
  console.log(`📚 Swagger: http://localhost:${port}/api`);
}

bootstrap();
