import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './server.js';

const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD || '';
if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Set a valid ADMIN_EMAIL in .env before seeding.');
if (password.length < 12) throw new Error('Set ADMIN_PASSWORD to at least 12 characters in .env before seeding.');
const hash = await bcrypt.hash(password, 12);
const [roles] = await pool.execute("SELECT id FROM roles WHERE name='admin' LIMIT 1");
if (!roles[0]) throw new Error('Run database/schema.sql first');
await pool.execute(`INSERT INTO users(role_id,full_name,email,password_hash,status)
  VALUES(?,?,?,?, 'active') ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),password_hash=VALUES(password_hash),status='active'`,
  [roles[0].id,'إدارة مدرستي',email,hash]);
console.log(`Admin ready: ${email}`);
await pool.end();
