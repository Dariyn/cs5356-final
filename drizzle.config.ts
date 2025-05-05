import type { Config } from 'drizzle-kit';

// Use type assertion to work around type mismatches in drizzle-kit
export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
  },
} as Config;