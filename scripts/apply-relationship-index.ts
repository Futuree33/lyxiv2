import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lyxi',
  });

  console.log('🔄 Adding unique index to relationship_levels...');

  try {
    await connection.execute(
      'ALTER TABLE `relationship_levels` ADD CONSTRAINT `user_character_idx` UNIQUE(`user_id`,`character_id`)'
    );
    console.log('✅ Unique index added successfully!');
  } catch (error: any) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('⚠️  Index already exists, continuing...');
    } else {
      throw error;
    }
  } finally {
    await connection.end();
  }
}

migrate().catch(console.error);
