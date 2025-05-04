import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';
import pkg from 'pg';
const { Pool } = pkg;

// Make sure to use the POSTGRES_URL environment variable
// Vercel Postgres looks for POSTGRES_URL by default
process.env.POSTGRES_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const db = drizzle(sql, { schema });

// Add direct pg client for API routes
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
export const pg = new Pool({ connectionString });

// Log when the connection is established
pg.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

export type Task = typeof schema.tasks.$inferSelect;
export type NewTask = typeof schema.tasks.$inferInsert;

export type Column = typeof schema.columns.$inferSelect;
export type NewColumn = typeof schema.columns.$inferInsert;

export type Board = typeof schema.boards.$inferSelect;
export type NewBoard = typeof schema.boards.$inferInsert;

export type User = typeof schema.users.$inferSelect;
export type NewUser = typeof schema.users.$inferInsert; 