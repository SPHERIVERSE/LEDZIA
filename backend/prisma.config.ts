import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

// Load .env variables manually for the CLI
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  // Add this new migrations block for Prisma 7
  migrations: {
    seed: 'npx ts-node prisma/seed.ts',
  },
});
