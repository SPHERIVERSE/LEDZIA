import { PrismaClient, Role, Institution } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

// Load the environment variables so process.env.DATABASE_URL is available
dotenv.config();

// Initialize the Postgres pool and the Prisma adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Pass the adapter into the PrismaClient
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Create 6 Institutions
  const institutionNames = [
    'Massachusetts Institute of Technology',
    'Stanford University',
    'Harvard University',
    'California Institute of Technology',
    'University of Oxford',
    'Cambridge University',
  ];

  // Explicitly type the array as Institution[] to fix the 'never' type error
  const institutions: Institution[] = [];

  for (const name of institutionNames) {
    const inst = await prisma.institution.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    institutions.push(inst);
  }
  console.log(`Seeded ${institutions.length} institutions.`);

  // Safely grab the ID of the first institution
  const primaryInstitutionId = institutions[0].id;

  // 2. Create Teacher (Linked to Institution)
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@institute.edu' },
    update: { institutionId: primaryInstitutionId },
    create: {
      email: 'teacher@institute.edu',
      name: 'Dr. Sharma',
      role: Role.TEACHER,
      institutionId: primaryInstitutionId,
    },
  });

  // 3. Create Students (Linked to Institution)
  const student1 = await prisma.user.upsert({
    where: { email: 'student1@institute.edu' },
    update: { institutionId: primaryInstitutionId },
    create: { 
      email: 'student1@institute.edu', 
      name: 'Rahul Dev', 
      role: Role.STUDENT,
      institutionId: primaryInstitutionId,
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@institute.edu' },
    update: { institutionId: primaryInstitutionId },
    create: { 
      email: 'student2@institute.edu', 
      name: 'Priya Das', 
      role: Role.STUDENT,
      institutionId: primaryInstitutionId,
    },
  });

  // 4. Create Course & Subject
  const course = await prisma.course.upsert({
    where: { code: 'BTECH-CSE-3' },
    update: {},
    create: { name: 'B.Tech Computer Science (3rd Year)', code: 'BTECH-CSE-3' },
  });

  // Find or create subject to prevent duplicate errors on multiple runs
  let subject = await prisma.subject.findFirst({
    where: { name: 'Software Engineering', courseId: course.id, teacherId: teacher.id },
  });

  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        name: 'Software Engineering',
        courseId: course.id,
        teacherId: teacher.id,
      },
    });
  }

  // 5. Enroll Students safely (Prevents unique constraint crashes)
  const enrollments = [
    { studentId: student1.id, subjectId: subject.id },
    { studentId: student2.id, subjectId: subject.id },
  ];

  for (const enroll of enrollments) {
    await prisma.enrollment.upsert({
      where: {
        studentId_subjectId: {
          studentId: enroll.studentId,
          subjectId: enroll.subjectId,
        },
      },
      update: {},
      create: enroll,
    });
  }

  console.log(`Seeding finished. Subject ID to test: ${subject.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // Close the pool connection cleanly
  });

