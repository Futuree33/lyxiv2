"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const promise_1 = __importDefault(require("mysql2/promise"));
async function checkImage() {
    const connection = await promise_1.default.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
    try {
        const [rows] = await connection.query('SELECT id, image_url, scene_description, created_at FROM chat_images ORDER BY created_at DESC LIMIT 5');
        console.log('Latest images in database:');
        console.log(JSON.stringify(rows, null, 2));
    }
    finally {
        await connection.end();
    }
}
checkImage();
//# sourceMappingURL=check-image.js.map