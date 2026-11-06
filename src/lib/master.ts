// อ่าน KM_Master_Data.xlsx (ชีต Members, Modules, Member_Module, Courses, Settings)
import * as XLSX from 'xlsx';
import type { CourseRec, Member, MemberModule, ModuleRec, Role, Settings } from '../types/km';
import { toIsoDate } from './import/parse';

const clean = (v: unknown) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s === '' ? null : s; };
const numv = (v: unknown, d: number) => {
  if (v === null || v === undefined || String(v).trim() === '') return d; // ช่องว่าง (เช่น สูตรที่ไม่มีค่าที่คำนวณไว้) ใช้ค่าเริ่มต้น
  const n = typeof v === 'number' ? v : Number(String(v).replace('%', ''));
  return Number.isFinite(n) ? n : d;
};
const ROLES: Role[] = ['Member', 'Lead', 'Manager', 'Admin'];

export function readMaster(file: string) {
  const wb = XLSX.readFile(file);
  const sheet = (n: string) => {
    if (!wb.Sheets[n]) throw new Error(`ไม่พบชีต ${n} ในไฟล์ Master`);
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[n], { defval: null });
  };

  const st = Object.fromEntries(sheet('Settings').map(r => [String(r['รายการ']), r['ค่า']]));
  const settings: Settings = {
    passScore: numv(st['pass_score'], 80), knowHigh: numv(st['know_high'], 80),
    knowMid: numv(st['know_mid'], 50), maxAttempts: numv(st['max_attempts'], 3),
  };

  const errors: string[] = [];
  const members: Member[] = sheet('Members').filter(r => /^U\d+$/.test(String(r['member_id'] ?? ''))).map(r => {
    const email = clean(r['อีเมลบริษัท'])?.toLowerCase() ?? '';
    const name = clean(r['ชื่อ-นามสกุล']) ?? '';
    const role = (clean(r['บทบาท']) ?? 'Member') as Role;
    if (!email) errors.push(`${name}: ยังไม่มีอีเมล`);
    if (!ROLES.includes(role)) errors.push(`${name}: บทบาท "${role}" ไม่ถูกต้อง`);
    return { id: String(r['member_id']), name, email, team: clean(r['ทีม (ตามไฟล์เดิม)']), role };
  });
  const dup = members.map(m => m.email).filter((e, i, a) => e && a.indexOf(e) !== i);
  if (dup.length) errors.push(`อีเมลซ้ำ: ${[...new Set(dup)].join(', ')}`);

  const modules: ModuleRec[] = sheet('Modules').filter(r => /^M\d+$/.test(String(r['module_id'] ?? ''))).map(r => ({
    id: String(r['module_id']), product: clean(r['Product']) ?? '', name: clean(r['Module']) ?? '',
    complexity: numv(r['Complexity (1-3)'], 1), active: clean(r['ใช้งาน (Y/N)']) === 'Y',
    passScore: numv(r['คะแนนผ่าน'], settings.passScore), mcWeight: numv(r['น้ำหนักปรนัย'], 0.6), essayWeight: numv(r['น้ำหนักอัตนัย'], 0.4),
  }));

  const baseline: MemberModule[] = sheet('Member_Module')
    .filter(r => clean(r['member_id']) && ['C', 'P', 'N'].includes(String(r['สถานะ (C/P/N)'])))
    .map(r => ({ memberId: String(r['member_id']), moduleId: String(r['module_id']), status: String(r['สถานะ (C/P/N)']) as 'C' | 'P' | 'N' }));

  const nameById = new Map(members.map(m => [m.id, m.name]));
  const courses: CourseRec[] = sheet('Courses').filter(r => /^C\d+$/.test(String(r['course_id'] ?? ''))).map(r => {
    const iid = clean(r['instructor_id']);
    return {
      id: String(r['course_id']), moduleId: String(r['module_id']), name: clean(r['ชื่อคอร์ส']) ?? '',
      instructorId: iid, instructorName: iid ? nameById.get(iid) ?? null : null,
      courseStatus: clean(r['สถานะคอร์ส']) ?? 'Not start', examStatus: clean(r['สถานะข้อสอบ']) ?? 'Not start',
      preTestDate: toIsoDate(r['วันที่ Pre-test']), trainDate: toIsoDate(r['วันที่อบรม']), postTestDate: toIsoDate(r['วันที่ Post-test']),
    };
  });
  return { settings, members, modules, baseline, courses, errors };
}
