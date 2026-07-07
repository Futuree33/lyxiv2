"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const promise_1 = __importDefault(require("mysql2/promise"));
const fs_1 = require("fs");
const path_1 = require("path");
async function applyMigration() {
    console.log('🔄 Applying privacy field migration...');
    const connection = await promise_1.default.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true,
    });
    try {
        const migrationPath = (0, path_1.join)(__dirname, '../drizzle/0013_little_yellow_claw.sql');
        const sql = (0, fs_1.readFileSync)(migrationPath, 'utf-8');
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
    }
    catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️  Column already exists, continuing...');
        }
        else {
            console.error('❌ Migration failed:', error.message);
            process.exit(1);
        }
    }
    finally {
        await connection.end();
    }
}
applyMigration();
//# sourceMappingURL=apply-privacy-migration.js.map