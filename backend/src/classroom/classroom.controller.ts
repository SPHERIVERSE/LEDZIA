import { Controller, Get, Post, Body, Param, NotFoundException, BadRequestException, UseGuards, Request } from '@nestjs/common';
import { ClassroomService } from './classroom.service';
import { PrismaService } from '../prisma/prisma.service'; 
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

@Controller('classroom')
export class ClassroomController {
  constructor(
    private readonly classroomService: ClassroomService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  @Get('institutions')
  async getInstitutions() {
    return this.prisma.institution.findMany({
      orderBy: { name: 'asc' }
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('students/all')
  async getAllStudents() {
    return this.classroomService.getAllStudents();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':subjectId/students')
  async getEnrolledStudents(@Param('subjectId') subjectId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { subjectId: subjectId },
      include: {
        student: true 
      },
    });
    return enrollments.map(e => e.student);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':subjectId/enroll')
  async enrollStudent(
    @Param('subjectId') subjectId: string,
    @Body() body: { email: string }
  ) {
    const student = await this.prisma.user.findUnique({
      where: { email: body.email }
    });

    if (!student || student.role !== 'STUDENT') {
      throw new NotFoundException('Student not found or invalid role.');
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: {
        studentId_subjectId: { studentId: student.id, subjectId }
      }
    });

    if (existing) throw new BadRequestException('Already enrolled.');

    return this.prisma.enrollment.create({
      data: { studentId: student.id, subjectId }
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('teacher-subjects')
  async getTeacherSubjects(@Request() req) {
    return this.classroomService.getTeacherSubjects(req.user.sub);
  }

  // --- NEW: Expose the analytics to the frontend ---
  @UseGuards(JwtAuthGuard)
  @Get(':subjectId/stats')
  async getSubjectStats(@Param('subjectId') subjectId: string) {
    return this.classroomService.getSubjectStats(subjectId);
  }

  // --- FIXED: Create a Session before inserting records ---
  @UseGuards(JwtAuthGuard)
  @Post('attendance/manual')
  async markManualAttendance(@Body() body: { records: any[] }) {
    if (!body.records || body.records.length === 0) {
      throw new BadRequestException('No records provided');
    }

    // Extract the subjectId from the first record
    const subjectId = body.records[0].subjectId;

    // 1. Create the Parent Session
    const session = await this.prisma.session.create({
      data: {
        subjectId,
        method: 'MANUAL',
        date: new Date()
      }
    });

    // 2. Attach the child records to the session
    const result = await this.prisma.attendanceRecord.createMany({
      data: body.records.map(record => ({
        sessionId: session.id, // Linking to the new parent
        studentId: record.studentId,
        isPresent: record.isPresent,
        markedAt: new Date(record.deviceTimestamp || new Date()),
      })),
    });

    return { message: 'Attendance saved', count: result.count };
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  async getDashboardData(@Request() req) {
    return this.classroomService.getTeacherDashboardData(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('courses')
  async createCourse(@Body() body: { name: string; code: string }) {
    return this.classroomService.createCourse(body.name, body.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subjects')
  async createSubject(@Request() req, @Body() body: { name: string; courseId: string }) {
    return this.classroomService.createSubject(body.name, body.courseId, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':subjectId/qr-token')
  async getQrToken(@Param('subjectId') subjectId: string) {
    const payload = { subId: subjectId };
    const token = await this.jwtService.signAsync(payload, {
      secret: process.env.QR_SECRET,
      expiresIn: '30s'
    });
    return { qrToken: token };
  }

  // NEW: Bulk CSV Enroll Route
  @UseGuards(JwtAuthGuard)
  @Post(':subjectId/bulk-enroll')
  async bulkEnroll(
    @Param('subjectId') subjectId: string,
    @Body() body: { students: { email: string, rollNumber: string }[] }
  ) {
    if (!body.students || body.students.length === 0) {
      throw new BadRequestException('No student data provided.');
    }
    return this.classroomService.bulkEnrollStudents(subjectId, body.students);
  }

  // NEW: Export Attendance Data
  @UseGuards(JwtAuthGuard)
  @Get(':subjectId/export')
  async exportAttendance(@Param('subjectId') subjectId: string) {
    return this.classroomService.getSubjectExportData(subjectId);
  }
}
