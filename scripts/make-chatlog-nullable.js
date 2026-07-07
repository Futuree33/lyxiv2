"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const promise_1 = __importDefault(require("mysql2/promise"));
async function migrate() {
    const connection = await promise_1.default.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
    try {
        await connection.query('ALTER TABLE `chat_images` MODIFY COLUMN `chat_log_id` int');
        console.log('✅ Migration applied: chat_log_id is now nullable');
    }
    catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
    finally {
        await connection.end();
    }
}
migrate();
//# sourceMappingURL=make-chatlog-nullable.js.map