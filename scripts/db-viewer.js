// Database viewer script for both raw SQL and Drizzle
import pkg from 'pg';
const { Client } = pkg;
import readline from 'readline';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import chalk from 'chalk';

let connectionString = process.env.POSTGRES_URL || 'postgres://postgres:postgres@localhost:5432/kanban';

// Parse command line arguments
process.argv.forEach((arg, index) => {
  if (arg === '--db' && process.argv[index + 1]) {
    connectionString = process.argv[index + 1];
  }
});

console.log(chalk.blue('Using database URL:'), chalk.yellow(connectionString));

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
    console.log(chalk.green('✓ Connected to database successfully!'));
    
    // Initialize Drizzle
    const db = drizzle(client);
    
    let exit = false;
    
    while (!exit) {
      console.log('\n' + chalk.bold.blue('===== DATABASE VIEWER MENU ====='));
      console.log(chalk.cyan('1. List all tables'));
      console.log(chalk.cyan('2. View table structure'));
      console.log(chalk.cyan('3. View table data'));
      console.log(chalk.cyan('4. Execute custom SQL query'));
      console.log(chalk.cyan('5. View table relationships'));
      console.log(chalk.cyan('6. View database stats'));
      console.log(chalk.cyan('7. Export table data to JSON'));
      console.log(chalk.red('8. Exit'));
      
      const answer = await askQuestion('Enter your choice (1-8): ');
      
      switch (answer) {
        case '1':
          await listTables(client);
          break;
        case '2':
          await viewTableStructure(client);
          break;
        case '3':
          await viewTableData(client);
          break;
        case '4':
          await executeCustomQuery(client);
          break;
        case '5':
          await viewTableRelationships(client);
          break;
        case '6':
          await viewDatabaseStats(client);
          break;
        case '7':
          await exportTableData(client);
          break;
        case '8':
          exit = true;
          console.log(chalk.green('Goodbye!'));
          break;
        default:
          console.log(chalk.red('Invalid choice. Please try again.'));
      }
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error);
  } finally {
    await client.end();
    rl.close();
  }
}

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(chalk.yellow(question), resolve);
  });
}

async function listTables(client) {
  try {
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    const tableResult = await client.query(tableQuery);
    
    console.log('\n' + chalk.bold.green('===== DATABASE TABLES ====='));
    if (tableResult.rows.length === 0) {
      console.log(chalk.red('No tables found.'));
      return;
    }
    
    console.log(chalk.cyan('Found'), chalk.white(tableResult.rows.length), chalk.cyan('tables:'));
    
    tableResult.rows.forEach((table, index) => {
      console.log(`${chalk.green(index + 1 + '.')} ${chalk.white(table.table_name)}`);
    });
  } catch (error) {
    console.error(chalk.red('Error listing tables:'), error);
  }
}

async function viewTableStructure(client) {
  try {
    const tables = await getTableList(client);
    if (tables.length === 0) return;
    
    console.log('\n' + chalk.bold.cyan('Select a table to view its structure:'));
    tables.forEach((table, index) => {
      console.log(`${chalk.green(index + 1 + '.')} ${chalk.white(table)}`);
    });
    
    const tableIndex = await askQuestion(`Enter table number (1-${tables.length}): `);
    const selectedTable = tables[parseInt(tableIndex) - 1];
    
    if (!selectedTable) {
      console.log(chalk.red('Invalid table selection.'));
      return;
    }
    
    // Get column information
    const structureQuery = `
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        column_default,
        is_nullable
      FROM 
        information_schema.columns 
      WHERE 
        table_name = $1
      ORDER BY
        ordinal_position
    `;
    const structureResult = await client.query(structureQuery, [selectedTable]);
    
    // Get primary key information
    const pkQuery = `
      SELECT
        kcu.column_name
      FROM
        information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
      WHERE
        tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = $1
    `;
    const pkResult = await client.query(pkQuery, [selectedTable]);
    const primaryKeys = pkResult.rows.map(row => row.column_name);
    
    // Get foreign key information
    const fkQuery = `
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE
        tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
    `;
    const fkResult = await client.query(fkQuery, [selectedTable]);
    const foreignKeys = fkResult.rows;
    
    console.log('\n' + chalk.bold.green(`===== STRUCTURE OF ${selectedTable.toUpperCase()} =====`));
    
    console.log(chalk.cyan('\nColumns:'));
    structureResult.rows.forEach(column => {
      let typeInfo = column.data_type;
      if (column.character_maximum_length) {
        typeInfo += `(${column.character_maximum_length})`;
      }
      
      const isPrimaryKey = primaryKeys.includes(column.column_name);
      const foreignKey = foreignKeys.find(fk => fk.column_name === column.column_name);
      
      console.log(
        `  ${chalk.green(column.column_name)} ${chalk.cyan(typeInfo)} ` +
        `${column.is_nullable === 'YES' ? chalk.yellow('NULL') : chalk.red('NOT NULL')} ` +
        `${column.column_default ? chalk.blue(`DEFAULT ${column.column_default}`) : ''} ` +
        `${isPrimaryKey ? chalk.magenta('PRIMARY KEY') : ''} ` +
        `${foreignKey ? chalk.yellow(`→ ${foreignKey.foreign_table_name}(${foreignKey.foreign_column_name})`) : ''}`
      );
    });
    
    // Get count of records
    const countResult = await client.query(`SELECT COUNT(*) FROM ${selectedTable}`);
    console.log(`\n${chalk.cyan('Total records:')} ${chalk.white(countResult.rows[0].count)}`);
    
  } catch (error) {
    console.error(chalk.red('Error viewing table structure:'), error);
  }
}

async function viewTableData(client) {
  try {
    const tables = await getTableList(client);
    if (tables.length === 0) return;
    
    console.log('\n' + chalk.bold.cyan('Select a table to view its data:'));
    tables.forEach((table, index) => {
      console.log(`${chalk.green(index + 1 + '.')} ${chalk.white(table)}`);
    });
    
    const tableIndex = await askQuestion(`Enter table number (1-${tables.length}): `);
    const selectedTable = tables[parseInt(tableIndex) - 1];
    
    if (!selectedTable) {
      console.log(chalk.red('Invalid table selection.'));
      return;
    }
    
    const limitStr = await askQuestion('How many rows to display? (default 10): ');
    const limit = parseInt(limitStr) || 10;
    
    const offsetStr = await askQuestion('From which row to start? (default 0): ');
    const offset = parseInt(offsetStr) || 0;
    
    const whereClause = await askQuestion('Filter condition (SQL WHERE clause without "WHERE", leave empty for none): ');
    
    let query = `SELECT * FROM ${selectedTable}`;
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const result = await client.query(query);
    
    console.log('\n' + chalk.bold.green(`===== DATA IN ${selectedTable.toUpperCase()} =====`));
    
    if (result.rows.length === 0) {
      console.log(chalk.yellow('No records found matching the criteria.'));
      return;
    }
    
    // Get the maximum width for each column for pretty formatting
    const columnWidths = {};
    const columns = Object.keys(result.rows[0]);
    
    columns.forEach(column => {
      columnWidths[column] = Math.max(
        column.length,
        ...result.rows.map(row => {
          const value = row[column];
          return value === null ? 4 : String(value).length;
        })
      );
    });
    
    // Print header
    let header = '';
    columns.forEach(column => {
      header += chalk.cyan(column.padEnd(columnWidths[column] + 2));
    });
    console.log(header);
    
    // Print separator
    let separator = '';
    columns.forEach(column => {
      separator += '-'.repeat(columnWidths[column] + 2);
    });
    console.log(separator);
    
    // Print data
    result.rows.forEach(row => {
      let line = '';
      columns.forEach(column => {
        const value = row[column] === null ? 'NULL' : String(row[column]);
        line += value.padEnd(columnWidths[column] + 2);
      });
      console.log(line);
    });
    
    const countResult = await client.query(`SELECT COUNT(*) FROM ${selectedTable}`);
    const totalRecords = parseInt(countResult.rows[0].count);
    
    console.log(`\n${chalk.cyan('Showing rows')} ${chalk.white(offset + 1)} ${chalk.cyan('to')} ${chalk.white(Math.min(offset + limit, totalRecords))} ${chalk.cyan('of')} ${chalk.white(totalRecords)}`);
    
  } catch (error) {
    console.error(chalk.red('Error viewing table data:'), error);
  }
}

async function executeCustomQuery(client) {
  try {
    console.log('\n' + chalk.bold.yellow('Execute a custom SQL query:'));
    console.log(chalk.gray('(SELECT queries only, data modification not allowed)'));
    
    const query = await askQuestion('Enter your SQL query: ');
    
    if (!query.trim().toLowerCase().startsWith('select')) {
      console.log(chalk.red('Only SELECT queries are allowed for safety.'));
      return;
    }
    
    const result = await client.query(query);
    
    console.log('\n' + chalk.bold.green('===== QUERY RESULTS ====='));
    
    if (result.rows.length === 0) {
      console.log(chalk.yellow('No results returned.'));
      return;
    }
    
    console.log(chalk.cyan(`${result.rows.length} rows returned`));
    
    // For simplicity, just print the raw results
    console.table(result.rows);
    
  } catch (error) {
    console.error(chalk.red('Error executing query:'), error);
  }
}

async function viewTableRelationships(client) {
  try {
    const query = `
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu 
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `;
    
    const result = await client.query(query);
    
    console.log('\n' + chalk.bold.green('===== TABLE RELATIONSHIPS ====='));
    
    if (result.rows.length === 0) {
      console.log(chalk.yellow('No relationships found.'));
      return;
    }
    
    // Group by source table
    const relationships = {};
    
    result.rows.forEach(row => {
      if (!relationships[row.table_name]) {
        relationships[row.table_name] = [];
      }
      
      relationships[row.table_name].push({
        column: row.column_name,
        foreignTable: row.foreign_table_name,
        foreignColumn: row.foreign_column_name
      });
    });
    
    Object.keys(relationships).forEach(table => {
      console.log(chalk.cyan(`\nTable: ${chalk.white(table)}`));
      
      relationships[table].forEach(rel => {
        console.log(`  ${chalk.green(rel.column)} ${chalk.yellow('→')} ${chalk.white(rel.foreignTable)}(${chalk.green(rel.foreignColumn)})`);
      });
    });
    
  } catch (error) {
    console.error(chalk.red('Error viewing relationships:'), error);
  }
}

async function viewDatabaseStats(client) {
  try {
    console.log('\n' + chalk.bold.green('===== DATABASE STATISTICS ====='));
    
    // Get table counts
    const tableCountQuery = `
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const tableCountResult = await client.query(tableCountQuery);
    console.log(chalk.cyan('Total tables:'), chalk.white(tableCountResult.rows[0].count));
    
    // Get table statistics
    const tableStatsQuery = `
      SELECT
        relname AS table_name,
        n_live_tup AS row_count,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size
      FROM
        pg_stat_user_tables
      ORDER BY
        n_live_tup DESC
    `;
    
    const tableStatsResult = await client.query(tableStatsQuery);
    
    console.log('\n' + chalk.cyan('Table Statistics:'));
    console.log(chalk.green('Table').padEnd(30), 
                chalk.green('Rows').padEnd(15), 
                chalk.green('Size'));
    console.log('-'.repeat(60));
    
    tableStatsResult.rows.forEach(row => {
      console.log(
        chalk.white(row.table_name).padEnd(30),
        chalk.white(row.row_count).padEnd(15),
        chalk.white(row.total_size)
      );
    });
    
    // Database size
    const dbSizeQuery = `
      SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size
    `;
    const dbSizeResult = await client.query(dbSizeQuery);
    
    console.log('\n' + chalk.cyan('Total database size:'), 
                chalk.white(dbSizeResult.rows[0].db_size));
    
  } catch (error) {
    console.error(chalk.red('Error viewing database stats:'), error);
  }
}

async function exportTableData(client) {
  try {
    const tables = await getTableList(client);
    if (tables.length === 0) return;
    
    console.log('\n' + chalk.bold.cyan('Select a table to export:'));
    tables.forEach((table, index) => {
      console.log(`${chalk.green(index + 1 + '.')} ${chalk.white(table)}`);
    });
    
    const tableIndex = await askQuestion(`Enter table number (1-${tables.length}): `);
    const selectedTable = tables[parseInt(tableIndex) - 1];
    
    if (!selectedTable) {
      console.log(chalk.red('Invalid table selection.'));
      return;
    }
    
    const whereClause = await askQuestion('Filter condition (SQL WHERE clause without "WHERE", leave empty for none): ');
    
    let query = `SELECT * FROM ${selectedTable}`;
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }
    
    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.log(chalk.yellow('No records found to export.'));
      return;
    }
    
    const filename = `${selectedTable}_export.json`;
    const fs = await import('fs');
    
    fs.writeFileSync(
      filename, 
      JSON.stringify(result.rows, null, 2)
    );
    
    console.log(chalk.green(`Exported ${result.rows.length} records to ${filename}`));
    
  } catch (error) {
    console.error(chalk.red('Error exporting data:'), error);
  }
}

async function getTableList(client) {
  const tableQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  const tableResult = await client.query(tableQuery);
  
  if (tableResult.rows.length === 0) {
    console.log(chalk.red('No tables found in database.'));
    return [];
  }
  
  return tableResult.rows.map(row => row.table_name);
}

main(); 