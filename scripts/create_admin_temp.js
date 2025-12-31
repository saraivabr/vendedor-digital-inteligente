import 'dotenv/config';
import db from '../src/database/db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function createAdmin() {
    const email = 'admin@vendedor.com';
    const password = 'admin';
    const name = 'Admin User';
    const role = 'admin';

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    try {
        db.db.prepare(`
            INSERT INTO users (id, email, password_hash, name, role, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        `).run(id, email, hashedPassword, name, role);

        console.log('Admin user created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            const existing = db.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
            db.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashedPassword, existing.id);
            console.log('Admin user updated successfully (password reset).');
            console.log('Email:', email);
            console.log('Password:', password);
        } else {
            console.error('Error creating admin:', err);
        }
    }
}

createAdmin();
