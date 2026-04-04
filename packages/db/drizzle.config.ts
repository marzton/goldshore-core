import type { Config } from 'drizzle-kit';
import { DATABASE_URL } from './src/config';

export default {
  schema: './src/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/goldshore',
  },
} satisfies Config;
