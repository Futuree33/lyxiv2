import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyLatestMigration() {
  console.log('🔄 Applying latest migration...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    // Read the latest migration file
    const migrationPath = join(__dirname, '../drizzle/0008_fluffy_ser_duncan.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    // Split by statement breakpoint and execute each statement
    const statements = sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`📝 Executing ${statements.length} statements...`);

    for (const statement of statements) {
      console.log(`   ${statement.substring(0, 60)}...`);
      await connection.query(statement);
    }

    console.log('✅ Migration applied successfully!');
  } catch (error: any) {
    // Ignore "duplicate key" errors for index drops
    if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.log('⚠️  Index already dropped, continuing...');
    } else if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  Column already exists, continuing...');
    } else {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  } finally {
    await connection.end();
  }
}

applyLatestMigration();
