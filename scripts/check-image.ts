import 'dotenv/config';
import mysql from 'mysql2/promise';

async function checkImage() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [rows] = await connection.query(
      'SELECT id, image_url, scene_description, created_at FROM chat_images ORDER BY created_at DESC LIMIT 5'
    );
    console.log('Latest images in database:');
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await connection.end();
  }
}

checkImage();
