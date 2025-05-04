// Simple database admin script
import pkg from 'pg';
const { Client } = pkg;
import readline from 'readline';

const connectionString = 'postgres://postgres:postgres@localhost:5432/kanban';
console.log('Using database URL:', connectionString);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  const client = new Client({
    connectionString
  });

  try {
    await client.connect();
    console.log('Connected to database successfully!');
    
    let exit = false;
    
    while (!exit) {
      console.log('\n----- Database Admin Menu -----');
      console.log('1. List users');
      console.log('2. Make a user an admin');
      console.log('3. View tables');
      console.log('4. Exit');
      
      const answer = await askQuestion('Enter your choice (1-4): ');
      
      switch (answer) {
        case '1':
          await listUsers(client);
          break;
        case '2':
          await makeAdmin(client);
          break;
        case '3':
          await viewTables(client);
          break;
        case '4':
          exit = true;
          break;
        default:
          console.log('Invalid choice. Please try again.');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    rl.close();
  }
}

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function listUsers(client) {
  try {
    const result = await client.query('SELECT * FROM users');
    console.log('\n----- Users -----');
    if (result.rows.length === 0) {
      console.log('No users found.');
    } else {
      result.rows.forEach(user => {
        console.log(`ID: ${user.id}, Name: ${user.name || 'N/A'}, Email: ${user.email}, Role: ${user.role}`);
      });
    }
  } catch (error) {
    console.error('Error listing users:', error);
  }
}

async function makeAdmin(client) {
  try {
    const email = await askQuestion('Enter the email of the user to make admin: ');
    const result = await client.query('UPDATE users SET role = $1 WHERE email = $2 RETURNING *', ['admin', email]);
    
    if (result.rowCount === 0) {
      console.log(`No user found with email ${email}`);
    } else {
      console.log(`User ${email} has been made an admin successfully!`);
    }
  } catch (error) {
    console.error('Error making user admin:', error);
  }
}

async function viewTables(client) {
  try {
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const tableResult = await client.query(tableQuery);
    
    console.log('\n----- Database Tables -----');
    if (tableResult.rows.length === 0) {
      console.log('No tables found.');
      return;
    }
    
    for (const table of tableResult.rows) {
      const tableName = table.table_name;
      console.log(`\nTable: ${tableName}`);
      
      // Get table structure
      const structureQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `;
      const structureResult = await client.query(structureQuery, [tableName]);
      
      console.log('Columns:');
      structureResult.rows.forEach(column => {
        console.log(`  - ${column.column_name} (${column.data_type})`);
      });
      
      // Get count of records
      const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
      console.log(`Total records: ${countResult.rows[0].count}`);
    }
  } catch (error) {
    console.error('Error viewing tables:', error);
  }
}

main(); 