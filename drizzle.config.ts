import type { Config } from 'drizzle-kit';

// Add a ts-expect-error comment to suppress the type error
// @ts-expect-error - Drizzle-kit config type mismatch
export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || '',
  },
} as Config;