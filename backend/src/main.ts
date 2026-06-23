import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable explicit CORS handling
  app.enableCors({
    origin: [
      'http://localhost:3000', 
      'https://builds-mit-mileage-subaru.trycloudflare.com'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });

  await app.listen(5000); 
  console.log(`Backend Application is running on: http://localhost:5000`);
}
bootstrap();

