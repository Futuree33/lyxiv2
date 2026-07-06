import { Global, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/mysql2';
import * as mysql from 'mysql2/promise';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: async () => {
        const pool = mysql.createPool({
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
        });
        return drizzle(pool, { schema, mode: 'default' });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
