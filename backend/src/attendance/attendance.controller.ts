import { Controller, Get, Post, Body, Param, UseGuards, Request, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AttendanceService, SessionPayloadDto } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('roster/:subjectId')
  async getRoster(@Param('subjectId') subjectId: string) {
    return this.attendanceService.getRoster(subjectId);
  }

  // UPDATED: Now receives the full SessionPayloadDto and passes the real teacher ID
  @UseGuards(JwtAuthGuard)
  @Post('sync')
  async syncRecords(@Body() body: SessionPayloadDto, @Request() req) {
    const teacherId = req.user.sub; 
    return this.attendanceService.saveSession(body, teacherId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('student-dashboard')
  async getStudentDashboard(@Request() req) {
    const studentId = req.user.sub;
    if (!studentId) return [];
    return this.attendanceService.getStudentDashboard(studentId);
  }

  // UPDATED: Links the scan to a parent Session instead of creating raw records
  @UseGuards(JwtAuthGuard)
  @Post('verify-qr')
  async verifyQrAttendance(@Request() req, @Body() body: { qrToken: string }) {
    let payload;

    try {
      payload = await this.jwtService.verifyAsync(body.qrToken, {
        secret: process.env.QR_SECRET,
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Expired code. Waiting for teacher screen to refresh...');
      }
      throw new UnauthorizedException('Invalid QR Code.');
    }

    const studentId = req.user.sub;
    const subjectId = payload.subId;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_subjectId: { studentId, subjectId } },
    });

    if (!enrollment) {
      throw new UnauthorizedException('You are not enrolled in this subject.');
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    // 1. Find today's QR Session for this subject, or create one if it's the first scan
    let session = await this.prisma.session.findFirst({
      where: {
        subjectId,
        method: 'QR',
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (!session) {
      session = await this.prisma.session.create({
        data: { subjectId, method: 'QR', date: new Date() },
      });
    }

    // 2. Check if the student already scanned using the compound unique key
    const existingRecord = await this.prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: { sessionId: session.id, studentId },
      },
    });

    if (existingRecord) {
      throw new BadRequestException('Attendance already marked for today.');
    }

    // 3. Create the child record linked to the Session
    return this.prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId,
        isPresent: true,
        markedAt: new Date(),
      },
    });
  }
}
