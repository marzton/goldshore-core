import type { Config } from 'drizzle-kit';
import { DATABASE_URL } from './src/config';

export default {
  schema: './src/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: DATABASE_URL,
  },
} satisfies Config;
