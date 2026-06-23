import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 1. Updated DTO to match the new Session-based architecture
export class SessionPayloadDto {
  subjectId: string;
  method: string; // "MANUAL" or "QR"
  records: {
    studentId: string;
    isPresent: boolean;
    deviceTimestamp: string;
  }[];
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // Used by the PWA to cache the roster while online
  async getRoster(subjectId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { subjectId },
      include: {
        student: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    return enrollments.map(e => e.student);
  }

  // 2. New flow: Create Session -> Attach Records
  async saveSession(payload: SessionPayloadDto, teacherId: string) {
    if (!payload.records || payload.records.length === 0) {
      throw new BadRequestException('Cannot save an empty session.');
    }

    // Step A: Create the Parent Session
    const session = await this.prisma.session.create({
      data: {
        subjectId: payload.subjectId,
        method: payload.method,
        date: new Date(), 
      }
    });

    // Step B: Prepare the child records
    const operations = payload.records.map(record => {
      return this.prisma.attendanceRecord.create({
        data: {
          sessionId: session.id, // Linking to the new parent
          studentId: record.studentId,
          isPresent: record.isPresent,
          markedAt: new Date(record.deviceTimestamp), 
        }
      });
    });

    // Step C: Execute all inserts safely inside a transaction
    try {
      await this.prisma.$transaction(operations);
      return { success: true, sessionId: session.id, syncedCount: operations.length };
    } catch (error) {
      console.error('Session save failed:', error);
      throw new Error('Failed to save attendance session');
    }
  }
  
  // 3. Updated Dashboard Query: Joins Session table to get dates & methods
  async getStudentDashboard(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      include: {
        subject: {
          include: { course: true, teacher: true }
        }
      }
    });

    const dashboardData = await Promise.all(
      enrollments.map(async (enr) => {
        
        // Fetch records by looking UP at the parent session's subjectId
        const records = await this.prisma.attendanceRecord.findMany({
          where: { 
            studentId: studentId, 
            session: { subjectId: enr.subjectId } 
          },
          include: {
            session: true // We need this to get the date and method!
          },
          orderBy: { 
            session: { date: 'desc' } 
          }
        });

        const totalClasses = records.length;
        const presentClasses = records.filter(r => r.isPresent).length;
        const percentage = totalClasses === 0 ? 0 : Math.round((presentClasses / totalClasses) * 100);

        return {
          subjectId: enr.subject.id,
          subjectName: enr.subject.name,
          courseName: enr.subject.course.name,
          teacherName: enr.subject.teacher.name,
          totalClasses,
          presentClasses,
          percentage,
          // Extract the details from the nested session object
          auditLogs: records.map(r => ({
            id: r.id,
            date: r.session.date,
            isPresent: r.isPresent,
            method: r.session.method 
          }))
        };
      })
    );

    return dashboardData;
  }
}
