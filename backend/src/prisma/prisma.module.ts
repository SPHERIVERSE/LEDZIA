import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService], // This allows AuthModule and AttendanceModule to use it
})
export class PrismaModule {}
