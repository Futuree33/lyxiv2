import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  console.log('🔄 Applying privacy field migration...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    const migrationPath = join(__dirname, '../drizzle/0013_little_yellow_claw.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

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
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  Column already exists, continuing...');
    } else {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  } finally {
    await connection.end();
  }
}

applyMigration();
