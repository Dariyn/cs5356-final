// This script pushes the schema to the database directly
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

console.log('Pushing schema to database...');

// Get the connection string from environment variables
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL environment variable is not set');
  console.error('Please make sure your .env.local file contains DATABASE_URL');
  process.exit(1);
}
console.log('Using Neon database connection');

async function main() {
  const client = new Client({
    connectionString
  });

  try {
    await client.connect();
    console.log('Connected to database, creating tables...');
    
    // Create tables directly without migrations
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255),
      image TEXT,
      role VARCHAR(20) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await client.query(`CREATE TABLE IF NOT EXISTS boards (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await client.query(`CREATE TABLE IF NOT EXISTS columns (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      position INTEGER NOT NULL,
      board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await client.query(`CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      position INTEGER NOT NULL,
      column_id INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      due_date TIMESTAMP,
      is_completed BOOLEAN DEFAULT FALSE,
      priority VARCHAR(20) DEFAULT 'medium'
    )`);
    
    console.log('Database schema pushed successfully!');
  } catch (error) {
    console.error('Error pushing schema:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main(); 