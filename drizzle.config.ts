import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export default defineConfig({
  dialect: 'mysql',
  schema: './src/database/schema.ts',
  out: './drizzle',

  dbCredentials: {
    host: requiredEnv('DB_HOST'),
    port: Number(process.env.DB_PORT || 3306),
    user: requiredEnv('DB_USER'),
    password: requiredEnv('DB_PASSWORD'),
    database: requiredEnv('DB_NAME'),
  },
});
