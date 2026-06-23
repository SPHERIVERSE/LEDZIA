import { Injectable, UnauthorizedException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // 1. Unified OTP Generator for both Registration and Password Resets
  async requestOtp(email: string, reason: 'register' | 'reset') {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (reason === 'register' && existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }
    if (reason === 'reset' && !existingUser) {
      throw new NotFoundException('No account found with this email.');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await this.prisma.otp.upsert({
      where: { email },
      update: { code: otpCode, expiresAt },
      create: { email, code: otpCode, expiresAt },
    });

    console.log(`[TEST MODE] ${reason.toUpperCase()} OTP for ${email} is: ${otpCode}`);
    return { message: 'OTP generated (Testing Mode)' };
  }

  // 2. Registration (Now requires OTP verification and Password Hashing)
  async registerUser(body: any) {
    // 1. Verify OTP first
    const otpRecord = await this.prisma.otp.findUnique({ where: { email: body.email } });
    if (!otpRecord || otpRecord.code !== body.otp) throw new UnauthorizedException('Invalid OTP code.');
    if (new Date() > otpRecord.expiresAt) throw new UnauthorizedException('OTP has expired.');

    const hashedPassword = await bcrypt.hash(body.password, 10);
    let user;

    // 2. Check for an existing account
    const existingUser = await this.prisma.user.findUnique({ where: { email: body.email } });

    if (existingUser) {
      if (existingUser.isRegistered) {
        throw new ConflictException('An account with this email already exists.');
      }
      
      // 3. CLAIMING A STUB ACCOUNT
      user = await this.prisma.user.update({
        where: { email: body.email },
        data: {
          name: body.name,
          password: hashedPassword,
          role: body.role,
          institutionId: body.institutionId,
          isRegistered: true, // The account is now officially claimed!
        }
      });
    } else {
      // 4. NORMAL REGISTRATION (No stub existed)
      user = await this.prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          password: hashedPassword,
          role: body.role,
          institutionId: body.institutionId,
          isRegistered: true,
        },
      });
    }

    // Cleanup OTP and auto-login
    await this.prisma.otp.delete({ where: { email: body.email } });
    const token = await this.generateToken(user);

    return {
      message: 'Identity Secured.',
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    };
  }

  // 3. New Standard Password Login
  async loginWithPassword(email: string, passwordString: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = await bcrypt.compare(passwordString, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const token = await this.generateToken(user);
    return {
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    };
  }

  // 4. Password Reset Execution
  async resetPassword(body: any) {
    const otpRecord = await this.prisma.otp.findUnique({ where: { email: body.email } });
    if (!otpRecord || otpRecord.code !== body.otp) throw new UnauthorizedException('Invalid OTP code.');
    if (new Date() > otpRecord.expiresAt) throw new UnauthorizedException('OTP has expired.');

    const hashedPassword = await bcrypt.hash(body.newPassword, 10);

    await this.prisma.user.update({
      where: { email: body.email },
      data: { password: hashedPassword }
    });

    await this.prisma.otp.delete({ where: { email: body.email } });
    return { message: 'Password has been reset successfully.' };
  }

  async generateToken(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role, institutionId: user.institutionId };
    return this.jwtService.sign(payload);
  }
}