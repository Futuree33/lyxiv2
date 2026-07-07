import 'dotenv/config';
import mysql from 'mysql2/promise';

async function clearImages() {
  console.log('🗑️  Clearing old chat images...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [result] = await connection.query('DELETE FROM chat_images');
    console.log('✅ Cleared all chat images:', result);
    console.log('   Generate new images and they will use the new file-based system!');
  } catch (error: any) {
    console.error('❌ Failed to clear images:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

clearImages();
