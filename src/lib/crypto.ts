// เข้ารหัสข้อมูล (AES-256-GCM), แฮชรหัสผ่าน (scrypt), เซ็นคุกกี้ล็อกอิน (HMAC) ใช้เฉพาะ Node (เซิร์ฟเวอร์/สคริปต์)
import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';

function dataKey(): Buffer {
  const k = Buffer.from(process.env.KM_DATA_KEY ?? '', 'base64');
  if (k.length !== 32) throw new Error('KM_DATA_KEY ต้องเป็น base64 ของ 32 bytes (สร้างด้วย npm run data:keys)');
  return k;
}
function sessionSecret(): string {
  const s = process.env.SESSION_SECRET ?? '';
  if (s.length < 32) throw new Error('SESSION_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร');
  return s;
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', dataKey(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(value), 'utf8'), c.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') });
}
export function decryptJson<T>(text: string): T {
  const o = JSON.parse(text) as { iv: string; tag: string; data: string };
  const d = createDecipheriv('aes-256-gcm', dataKey(), Buffer.from(o.iv, 'base64'));
  d.setAuthTag(Buffer.from(o.tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(o.data, 'base64')), d.final()]).toString('utf8')) as T;
}

export function hashPassword(pw: string, saltHex: string = randomBytes(16).toString('hex')) {
  return { salt: saltHex, hash: scryptSync(pw.normalize('NFKC'), Buffer.from(saltHex, 'hex'), 64).toString('hex') };
}
export function verifyPassword(pw: string, saltHex: string, hashHex: string): boolean {
  const a = Buffer.from(hashPassword(pw, saltHex).hash, 'hex');
  const b = Buffer.from(hashHex, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ตัดตัวที่สับสน (l, I, O, 0, 1)
export function randomPassword(len = 14): string {
  return Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

export function signSession(p: { email: string; exp: number }): string {
  const body = Buffer.from(JSON.stringify(p)).toString('base64url');
  return `${body}.${createHmac('sha256', sessionSecret()).update(body).digest('base64url')}`;
}
export function verifySession(token: string): { email: string; exp: number } | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expect = createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { email: string; exp: number };
  return p.exp > Date.now() ? p : null;
}
