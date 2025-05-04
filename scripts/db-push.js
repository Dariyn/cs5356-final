// This script pushes the schema to the database directly
import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

console.log('Pushing schema to database...');

// Set the connection string directly
const connectionString = 'postgres://postgres:postgres@localhost:5432/kanban';
console.log('Using database URL:', connectionString);

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
      is_completed BOOLEAN DEFAULT FALSE
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