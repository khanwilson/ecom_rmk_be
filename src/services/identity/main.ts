import { HttpException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionInterceptor } from 'libs/common';
import { IdentityAppModule } from './identity.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(IdentityAppModule);
  const configService = app.get(ConfigService);

  app.useGlobalInterceptors(new HttpExceptionInterceptor());
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

  const config = new DocumentBuilder()
    .setTitle('Identity Service API')
    .setDescription('Identity microservice (auth, identity, OTP)')
    .setVersion('1.0')
    .addTag('identity', 'Identity service endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Connect Kafka Microservice
  const kafkaBroker = configService.get('KAFKA_BROKER');
  const kafkaConfig = {
    client: {
      clientId: 'ecom-rmk-consumer-server',
      brokers: [kafkaBroker],
    },
    consumer: {
      groupId: 'ecom-rmk-consumer-group',
      allowAutoTopicCreation: true,
    },
  };
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: kafkaConfig,
  });

  // Start all microservices
  console.log(`🚀 Services starting...`);
  await app.startAllMicroservices();

  const port = configService.get('IDENTITY_PORT') || 3100;
  await app.listen(port);
  console.log(`✅ Identity service running on: http://localhost:${port}`);
  console.log(`📚 Swagger: http://localhost:${port}/api`);
}

bootstrap();


