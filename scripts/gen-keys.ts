import { randomBytes } from 'node:crypto';
console.log('ใส่ค่าเหล่านี้ใน .env.local (เครื่องคุณ) และใน Environment Variables ของที่โฮสต์ ห้าม commit');
console.log(`KM_DATA_KEY=${randomBytes(32).toString('base64')}`);
console.log(`SESSION_SECRET=${randomBytes(48).toString('base64url')}`);
