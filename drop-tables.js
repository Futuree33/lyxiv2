import 'dotenv/config';
import mysql from 'mysql2/promise';

async function dropAllTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('Disabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    console.log('Getting all tables...');
    const [tables] = await connection.query('SHOW TABLES');

    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`Dropping table: ${tableName}`);
      await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }

    console.log('Re-enabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ All tables dropped successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

dropAllTables();
