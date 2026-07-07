import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

config(); // Load .env file

async function applyAtmosphericMigration() {
  const connection = await createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lyxi',
    multipleStatements: true,
  });

  try {
    console.log('🔄 Applying atmospheric migration...');

    const migrationPath = path.join(__dirname, '..', 'drizzle', '0014_immersive_atmosphere.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await connection.execute(statement);
        console.log('✅ Executed:', statement.substring(0, 50) + '...');
      } catch (error: any) {
        // Ignore duplicate column/table errors
        if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log('⚠️  Already exists, skipping:', statement.substring(0, 50) + '...');
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Atmospheric migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

applyAtmosphericMigration();
