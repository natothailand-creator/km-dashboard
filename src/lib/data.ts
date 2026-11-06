import fs from 'node:fs';
import path from 'node:path';
import { decryptJson } from './crypto';
import type { Bundle } from '../types/km';

let cache: Bundle | null = null;
/** อ่านและถอดรหัสข้อมูลทั้งหมด (ใช้ภายในเซิร์ฟเวอร์เท่านั้น ห้ามส่งออกไปที่เบราว์เซอร์ตรง ๆ) */
export function loadBundle(): Bundle {
  if (cache) return cache;
  const file = path.join(process.cwd(), 'data', 'km.enc');
  if (!fs.existsSync(file)) throw new Error('ไม่พบ data/km.enc: รัน npm run data:build ก่อน');
  cache = decryptJson<Bundle>(fs.readFileSync(file, 'utf8'));
  return cache;
}
