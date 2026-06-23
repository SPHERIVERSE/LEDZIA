import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  // Generates OTPs based on 'reason'
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() body: { email: string, reason: 'register' | 'reset' }) {
    return this.authService.requestOtp(body.email, body.reason);
  }

  // Complete Registration with OTP + Password
  @Post('register')
  async register(@Body() body: any) {
    return this.authService.registerUser(body);
  }

  // Standard Password Login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    return this.authService.loginWithPassword(body.email, body.password);
  }

  // Complete Password Reset
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile/name')
  async updateName(@Request() req, @Body() body: { name: string }) {
    const updatedUser = await this.prisma.user.update({
      where: { id: req.user.sub },
      data: { name: body.name }
    });
    return { name: updatedUser.name };
  }
}