import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local file
const envPath = resolve(__dirname, '../.env.local');
if (existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('No .env.local file found, using default environment variables');
  dotenv.config();
}

// Get database connection string from environment variables
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Database connection string missing. Check your environment variables.');
  process.exit(1);
}

async function addPriorityColumn() {
  const client = new Client({
    connectionString
  });

  try {
    await client.connect();
    console.log('Connected to database, checking if priority column exists...');
    
    // Check if column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'priority'
    `;
    
    const checkResult = await client.query(checkColumnQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('Priority column already exists. No changes made.');
    } else {
      // Add the priority column with default value 'medium'
      console.log('Adding priority column to tasks table...');
      await client.query(`
        ALTER TABLE tasks 
        ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'
      `);
      console.log('Priority column added successfully.');
    }
  } catch (error) {
    console.error('Error adding priority column:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
addPriorityColumn(); 