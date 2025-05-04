import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Use Neon serverless driver for database connections
export function getNeonClient() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("Database connection string is missing");
  }
  
  return neon(connectionString);
}

export function getNeonDrizzle() {
  const sql = getNeonClient();
  return drizzle(sql, { schema });
}