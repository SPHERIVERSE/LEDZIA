import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Adjust path if needed

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true, // Makes the JwtService available anywhere without importing the module again
      secret: process.env.JWT_SECRET || 'fallback-secret-key-for-dev',
      signOptions: { expiresIn: '7d' }, // 7 days is reasonable for an attendance app PWA
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule], 
})
export class AuthModule {}
