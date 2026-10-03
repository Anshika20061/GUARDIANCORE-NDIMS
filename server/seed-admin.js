import bcrypt from 'bcryptjs';
import 'dotenv/config';
import pool from './db.js';

try {
  const email = 'admin@guardian.local';
  const password = 'DemoPass123!';
  const hash = await bcrypt.hash(password, 10);
  await pool.execute(
    `INSERT INTO users (name,email,password_hash,role)
     VALUES ('Demo Administrator',?,?, 'Admin')
     ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role='Admin', active=TRUE`,
    [email, hash]
  );
  console.log(`Demo account ready: ${email} / ${password}`);
} finally {
  await pool.end();
}
