import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PrismaModule } from './prisma/prisma.module';
import { ClassroomModule } from './classroom/classroom.module'; // Import this

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AttendanceModule,
    ClassroomModule,
  ],
})
export class AppModule {}
