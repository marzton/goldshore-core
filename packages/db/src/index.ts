import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { DATABASE_URL } from './config';

const client = postgres(DATABASE_URL);
export const db = drizzle(client, { schema });

export * from './schema';
export * from './schema.platform';
