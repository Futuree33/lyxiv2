"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mysql2_1 = require("drizzle-orm/mysql2");
const migrator_1 = require("drizzle-orm/mysql2/migrator");
const promise_1 = __importDefault(require("mysql2/promise"));
async function runMigrations() {
    console.log('🔄 Starting database migrations...');
    const connection = await promise_1.default.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true,
    });
    const db = (0, mysql2_1.drizzle)(connection);
    try {
        await (0, migrator_1.migrate)(db, { migrationsFolder: './drizzle' });
        console.log('✅ Migrations completed successfully!');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
    finally {
        await connection.end();
    }
}
runMigrations();
//# sourceMappingURL=migrate.js.map