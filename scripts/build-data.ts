// สร้าง data/km.enc จาก Master + ไฟล์ผลสอบใน imports/ (รันในเครื่องคุณเท่านั้น)
//   npm run data:build            (ใช้ master/KM_Master_Data.xlsx)
//   npm run data:build -- path/to/master.xlsx
// ต้องมี KM_DATA_KEY ใน environment (โหลดจาก .env.local อัตโนมัติ)
import fs from 'node:fs';
import path from 'node:path';
import { readMaster } from '../src/lib/master';
import { parseImportFile } from '../src/lib/import/parse';
import { validateRows, computeTotal, normalizeTestType, moduleKey, type ImportContext } from '../src/lib/import/validate';
import { encryptJson, hashPassword, randomPassword } from '../src/lib/crypto';
import type { Bundle, MemberModule, ResultRec, UserRec } from '../src/types/km';

// โหลด .env.local แบบง่าย (ไม่ต้องพึ่งแพ็กเกจเพิ่ม)
if (fs.existsSync('.env.local')) for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*([^#\s]+)/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const readJson = <T>(f: string, d: T): T => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as T) : d);
const norm = (s: string | null) => (s ?? '').trim().toLowerCase();
const fail = (msg: string): never => { console.error('\n✗ ' + msg); process.exit(1); };

const masterFile = process.argv[2] ?? 'master/KM_Master_Data.xlsx';
if (!fs.existsSync(masterFile)) fail(`ไม่พบไฟล์ Master: ${masterFile}`);
const master = readMaster(masterFile);
if (master.errors.length) fail('ข้อมูล Master ยังไม่พร้อม:\n  - ' + master.errors.join('\n  - '));
const { settings, members, modules, baseline, courses } = master;
const moduleById = new Map(modules.map(m => [moduleKey(m.id), m]));
const emailById = new Map(members.map(m => [m.id, m.email]));

const ctx: ImportContext = {
  uploader: { id: 'local', role: 'Admin' },
  membersByEmail: new Map(members.map(m => [m.email, m.id])),
  modules: new Map(modules.map(m => [moduleKey(m.id), { active: m.active, pass_score: m.passScore, mc_weight: m.mcWeight, essay_weight: m.essayWeight }])),
  statusByKey: new Map(baseline.map(x => [`${x.memberId}|${moduleKey(x.moduleId)}`, x.status])),
  instructorIdByModule: new Map(courses.filter(c => c.instructorId).map(c => [moduleKey(c.moduleId), c.instructorId as string])),
  instructorEmailByModule: new Map(courses.filter(c => c.instructorId).map(c => [moduleKey(c.moduleId), emailById.get(c.instructorId as string) ?? ''])),
  maxAttempts: settings.maxAttempts,
};

// ---- 1) ตรวจไฟล์นำเข้าทั้งหมดก่อน ถ้ามีแถวผิดให้หยุด (ไม่บันทึกอะไรเลย)
const files = fs.existsSync('imports') ? fs.readdirSync('imports').filter(f => /\.xlsx$/i.test(f) && !f.startsWith('~$')).sort() : [];
const imported: ResultRec[] = [];
let blocked = false;
for (const f of files) {
  const rows = parseImportFile(path.join('imports', f));
  const issues = validateRows(rows, ctx);
  const errs = issues.filter(i => i.severity === 'error'), warns = issues.filter(i => i.severity === 'warning');
  console.log(`• ${f}: ${rows.length} แถว, ผิด ${errs.length}, เตือน ${warns.length}`);
  [...errs, ...warns].forEach(i => console.log(`    แถว ${i.row} [${i.severity === 'error' ? 'ผิด' : 'เตือน'}] ${i.message}`));
  if (errs.length) { blocked = true; continue; }
  for (const r of rows) {
    const type = normalizeTestType(r.test_type)!, modId = moduleKey(r.module_id), mod = moduleById.get(modId)!;
    const total = computeTotal(type, r.mc_score_pct!, r.essay_score_pct, { mc_weight: mod.mcWeight, essay_weight: mod.essayWeight });
    imported.push({ memberId: ctx.membersByEmail.get(norm(r.email))!, moduleId: mod.id, testType: type, attempt: r.attempt_no!,
      mc: r.mc_score_pct!, essay: r.essay_score_pct, total, passed: total !== null && total >= mod.passScore, testDate: r.test_date! });
  }
}
if (blocked) fail('มีแถวที่ผิดในไฟล์นำเข้า แก้ไขแล้วรันใหม่ (ยังไม่ได้บันทึกอะไร)');

// ---- 2) รวมกับผลเดิม (ไฟล์เดิมนำเข้าซ้ำ = ทับแถวเดิม ไม่สร้างซ้ำ)
const key = (r: ResultRec) => `${r.memberId}|${r.moduleId}|${r.testType}|${r.attempt}`;
const store = new Map(readJson<ResultRec[]>('data/results.json', []).map(r => [key(r), r]));
imported.forEach(r => store.set(key(r), r));
const results = [...store.values()];
fs.writeFileSync('data/results.json', JSON.stringify(results, null, 1));

// ---- 3) คำนวณสถานะ: P ที่สอบ Post ผ่านแล้ว -> N
const passedPost = new Set(results.filter(r => r.testType === 'Post' && r.passed).map(r => `${r.memberId}|${moduleKey(r.moduleId)}`));
let promoted = 0;
const memberModules: MemberModule[] = baseline.map(x => {
  if (x.status === 'P' && passedPost.has(`${x.memberId}|${moduleKey(x.moduleId)}`)) { promoted++; return { ...x, status: 'N' as const }; }
  return x;
});

// ---- 4) ผู้ใช้: ออกรหัสผ่านเริ่มต้นให้คนที่ยังไม่มี (คนเดิมคงรหัสเดิม)
const userStore = new Map(readJson<UserRec[]>('data/users.local.json', []).map(u => [u.email, u]));
const users: UserRec[] = [];
const fresh: { email: string; name: string; password: string }[] = [];
for (const m of members) {
  const old = userStore.get(m.email);
  if (old) { users.push({ ...old, memberId: m.id }); continue; }
  const password = randomPassword();
  users.push({ email: m.email, memberId: m.id, ...hashPassword(password) });
  fresh.push({ email: m.email, name: m.name, password });
}
fs.writeFileSync('data/users.local.json', JSON.stringify(users, null, 1));
if (fresh.length) {
  fs.writeFileSync('data/initial-passwords.csv', '\ufeffemail,name,password\n' + fresh.map(f => `${f.email},"${f.name}",${f.password}`).join('\n') + '\n');
  console.log(`\n! ออกรหัสผ่านใหม่ ${fresh.length} คน -> data/initial-passwords.csv (แจกแล้วลบไฟล์นี้ทิ้ง)`);
}

// ---- 5) เข้ารหัสและเขียน data/km.enc
const bundle: Bundle = { generatedAt: new Date().toISOString(), settings, users, members, modules, memberModules, courses, results };
fs.writeFileSync('data/km.enc', encryptJson(bundle));
console.log(`\n✓ สร้าง data/km.enc แล้ว: ${members.length} คน, ${modules.length} Module, ${results.length} ผลสอบ, เปลี่ยน P→N ${promoted} รายการ`);
