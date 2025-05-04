import { spawn } from 'child_process';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get directory paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Load environment variables from .env.local
dotenv.config({ path: path.join(rootDir, '.env.local') });

// Get the connection string with fallback options
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: No database connection string found in environment variables.');
  console.log('Make sure you have DATABASE_URL or POSTGRES_URL in your .env.local file');
  process.exit(1);
}

console.log('Using database connection string:', connectionString);
console.log('Connecting to database...');

// Test the connection
const client = new Client({ connectionString });
client.connect()
  .then(() => {
    console.log('Successfully connected to the database!');
    client.end();
    
    console.log('Launching Drizzle Studio...');
    
    // Launch Drizzle Studio with the environment and specific config
    const studio = spawn('npx', ['drizzle-kit', 'studio', '--config', './drizzle-studio.config.ts', '--port', '3333'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: connectionString
      }
    });
    
    studio.on('error', (error) => {
      console.error('Failed to start Drizzle Studio:', error);
    });
    
    studio.on('close', (code) => {
      console.log(`Drizzle Studio process exited with code ${code}`);
    });
  })
  .catch(err => {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }); 