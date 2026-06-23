import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassroomService {
  constructor(private prisma: PrismaService) {}

  // Temporary method to bypass the need for a JWT Guard right now
  async getSeededTeacherSubjects() {
    const teacher = await this.prisma.user.findUnique({
      where: { email: 'teacher@institute.edu' }
    });

    if (!teacher) return [];

    return this.prisma.subject.findMany({
      where: { teacherId: teacher.id },
      include: {
        course: {
          select: { name: true, code: true },
        },
      },
    });
  }

  // We will use this one later when Auth is fully locked down
  async getTeacherSubjects(teacherId: string) {
    return this.prisma.subject.findMany({
      where: { teacherId },
      include: {
        course: {
          select: { name: true, code: true },
        },
      },
    });
  }

  // NEW: Fetch all registered students for the directory
  async getAllStudents() {
    return this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, email: true, rollNumber: true },
      orderBy: { rollNumber: 'asc' }
    });
  }

  async getTeacherDashboardData(teacherId: string) {
    const courses = await this.prisma.course.findMany({
      include: {
        subjects: {
          where: { teacherId: teacherId },
          include: {
            sessions: true // CHANGED: 'attendance' is now 'sessions'
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Map the data so the frontend receives a simple 'classesConducted' number
    return courses.map(course => ({
      ...course,
      subjects: course.subjects.map(subject => {
        // Sort sessions newest to oldest
        const sortedSessions = subject.sessions.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        return {
          id: subject.id,
          name: subject.name,
          classesConducted: sortedSessions.length,
          // Grab the 3 most recent sessions for the mini-timeline
          recentSessions: sortedSessions.slice(0, 3).map(s => ({
            id: s.id,
            date: s.date,
            method: s.method
          }))
        };
      })
    }));
  }

  async createCourse(name: string, code: string) {
    return this.prisma.course.create({
      data: { name, code }
    });
  }

  async createSubject(name: string, courseId: string, teacherId: string) {
    return this.prisma.subject.create({
      data: { name, courseId, teacherId }
    });
  }
  
  // NEW METHOD: Generates detailed subject analytics for the Faculty UI
  async getSubjectStats(subjectId: string) {
    // 1. NEW: Fetch the Subject and its associated Course details
    const subjectInfo = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      include: { course: true }
    });

    if (!subjectInfo) throw new Error("Subject not found");

    // 2. Fetch the total number of sessions held for this subject
    const totalSessions = await this.prisma.session.count({
      where: { subjectId }
    });

    // 3. Fetch the 10 most recent sessions (with total students present)
    const recentSessions = await this.prisma.session.findMany({
      where: { subjectId },
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        _count: {
          select: { records: { where: { isPresent: true } } }
        }
      }
    });

    // 4. Fetch enrolled students and compute their individual percentages
    const enrollments = await this.prisma.enrollment.findMany({
      where: { subjectId },
      include: {
        student: { select: { id: true, name: true, email: true, rollNumber: true } }
      }
    });

    const studentStats = await Promise.all(
      enrollments.map(async (enr) => {
        const presentCount = await this.prisma.attendanceRecord.count({
          where: { 
            studentId: enr.studentId, 
            session: { subjectId }, 
            isPresent: true 
          }
        });

        return {
          id: enr.student.id,
          name: enr.student.name,
          email: enr.student.email,
          rollNumber: enr.student.rollNumber,
          totalPresent: presentCount,
          percentage: totalSessions === 0 ? 0 : Math.round((presentCount / totalSessions) * 100)
        };
      })
    );

    return {
      subjectName: subjectInfo.name,          // NEW: Sending Subject Name
      courseName: subjectInfo.course.name,    // NEW: Sending Course Name
      totalSessions,
      recentSessions: recentSessions.map(s => ({
        id: s.id,
        date: s.date,
        method: s.method,
        presentCount: s._count.records
      })),
      students: studentStats
    };
  }

  // Bulk Enroll via CSV data
  async bulkEnrollStudents(subjectId: string, studentsData: { email: string, rollNumber: string }[]) {
    let enrolledCount = 0;
    const errors: string[] = [];

    for (const data of studentsData) {
      // FIX 1: Convert empty strings to actual database nulls
      const cleanRollNumber = data.rollNumber?.trim() === "" ? null : data.rollNumber?.trim();

      try {
        // Find or create the user (Stub generation)
        let user = await this.prisma.user.findUnique({ where: { email: data.email } });
        
        if (!user) {
          // Create the Stub Account
          user = await this.prisma.user.create({
            data: {
              email: data.email,
              name: 'Pending Registration', 
              rollNumber: cleanRollNumber, 
              role: 'STUDENT',
              isRegistered: false, 
            }
          });
        } else if (!user.rollNumber && cleanRollNumber) {
          // If they registered manually earlier but didn't have a roll number, update it
          await this.prisma.user.update({
            where: { email: data.email },
            data: { rollNumber: cleanRollNumber }
          });
        }

        // Safely create the enrollment
        const existingEnrollment = await this.prisma.enrollment.findUnique({
          where: { studentId_subjectId: { studentId: user.id, subjectId } }
        });

        if (!existingEnrollment) {
          await this.prisma.enrollment.create({
            data: { studentId: user.id, subjectId }
          });
          enrolledCount++;
        }
      } catch (error) {
        // FIX 2: If this specific row fails (like a duplicate roll number), log it and move to the next!
        console.error(`Failed to process ${data.email}:`, error);
        errors.push(data.email);
        continue;
      }
    }

    return { 
      message: 'Bulk enrollment complete', 
      added: enrolledCount,
      failed: errors.length 
    };
  }

  // NEW: Generate the Matrix Format for CSV/Excel Export
  async getSubjectExportData(subjectId: string) {
    // 1. Fetch subject details for the filename
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      include: { course: true }
    });
    if (!subject) throw new Error("Subject not found");

    // 2. Fetch all sessions (Ordered oldest to newest for left-to-right columns)
    const sessions = await this.prisma.session.findMany({
      where: { subjectId },
      orderBy: { date: 'asc' }
    });

    // 3. Fetch all enrolled students
    const enrollments = await this.prisma.enrollment.findMany({
      where: { subjectId },
      include: { student: true }
    });

    // 4. Fetch all attendance records for this subject
    const allRecords = await this.prisma.attendanceRecord.findMany({
      where: { session: { subjectId } }
    });

    const totalSessions = sessions.length;

    // 5. Build the Data Grid
    const matrix = enrollments.map(enr => {
      // Base student columns
      const studentRow: any = {
        "Roll Number": enr.student.rollNumber || "N/A",
        "Name": enr.student.name,
        "Email": enr.student.email,
      };

      let presentCount = 0;

      // Dynamic Date Columns: e.g., "12-Jun (QR)"
      sessions.forEach(session => {
        const dateLabel = `${session.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} (${session.method})`;
        
        const record = allRecords.find(r => r.sessionId === session.id && r.studentId === enr.student.id);
        
        if (record && record.isPresent) {
          studentRow[dateLabel] = "Present";
          presentCount++;
        } else {
          studentRow[dateLabel] = "Absent";
        }
      });

      // Summary Columns
      studentRow["Total Classes"] = totalSessions;
      studentRow["Classes Attended"] = presentCount;
      studentRow["Percentage"] = totalSessions === 0 ? "0%" : `${Math.round((presentCount / totalSessions) * 100)}%`;

      return studentRow;
    });

    // Clean up filename (replace spaces with underscores)
    const safeFilename = `${subject.course.name}_${subject.name}_Attendance`.replace(/[^a-zA-Z0-9_]/g, '_');

    return {
      filename: safeFilename,
      data: matrix
    };
  }
}
