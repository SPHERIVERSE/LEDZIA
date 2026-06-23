/*
  Warnings:

  - You are about to drop the column `createdAt` on the `AttendanceRecord` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `AttendanceRecord` table. All the data in the column will be lost.
  - You are about to drop the column `deviceTimestamp` on the `AttendanceRecord` table. All the data in the column will be lost.
  - You are about to drop the column `subjectId` on the `AttendanceRecord` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sessionId,studentId]` on the table `AttendanceRecord` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sessionId` to the `AttendanceRecord` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AttendanceRecord" DROP CONSTRAINT "AttendanceRecord_subjectId_fkey";

-- AlterTable
ALTER TABLE "AttendanceRecord" DROP COLUMN "createdAt",
DROP COLUMN "date",
DROP COLUMN "deviceTimestamp",
DROP COLUMN "subjectId",
ADD COLUMN     "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sessionId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_sessionId_studentId_key" ON "AttendanceRecord"("sessionId", "studentId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
