// กฎตรวจแถวนำเข้า: ตรงกับคอลัมน์ "ตรวจสอบ" ใน Import_Template (Excel) + เพิ่มเรื่องสิทธิ์ผู้อัปโหลด
import type { Role } from '../../types/km';

export interface ImportRow {
  email: string | null; module_id: string | null; test_type: string | null;
  mc_score_pct: number | null; essay_score_pct: number | null; attempt_no: number | null;
  test_date: string | null; essay_confirmed_by: string | null;
}
export interface ModuleRule { active: boolean; pass_score: number; mc_weight: number; essay_weight: number }
export interface ImportContext {
  uploader: { id: string; role: Role };
  membersByEmail: Map<string, string>;          // อีเมลตัวพิมพ์เล็ก -> member id
  modules: Map<string, ModuleRule>;             // module id ตัวพิมพ์ใหญ่
  statusByKey: Map<string, 'C' | 'P' | 'N'>;    // `${memberId}|${MODULEID}`
  instructorIdByModule: Map<string, string>;
  instructorEmailByModule: Map<string, string>; // ตัวพิมพ์เล็ก
  maxAttempts: number;
}
export interface RowIssue { row: number; severity: 'error' | 'warning'; message: string }

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
export const moduleKey = (s: string | null | undefined) => (s ?? '').trim().toUpperCase();

export function normalizeTestType(v: string | null | undefined): 'Pre' | 'Post' | null {
  const t = norm(v);
  return t === 'pre' ? 'Pre' : t === 'post' ? 'Post' : null;
}

/** Pre = คะแนนปรนัยล้วน | Post = ปรนัย×น้ำหนัก + อัตนัย×น้ำหนัก (null ถ้ายังไม่มีอัตนัย) */
export function computeTotal(type: 'Pre' | 'Post', mc: number, essay: number | null,
                             w: { mc_weight: number; essay_weight: number }): number | null {
  if (type === 'Pre') return mc;
  if (essay === null) return null;
  return mc * w.mc_weight + essay * w.essay_weight;
}

export function validateRows(rows: ImportRow[], ctx: ImportContext): RowIssue[] {
  const issues: RowIssue[] = [];
  const keyOf = (r: ImportRow) => [norm(r.email), moduleKey(r.module_id), norm(r.test_type), r.attempt_no].join('|');
  const counts = new Map<string, number>();
  rows.forEach(r => counts.set(keyOf(r), (counts.get(keyOf(r)) ?? 0) + 1));

  rows.forEach((r, i) => {
    const row = i + 2; // แถวใน Excel (แถว 1 = หัวตาราง)
    const err = (message: string) => issues.push({ row, severity: 'error', message });
    const warn = (message: string) => issues.push({ row, severity: 'warning', message });

    const memberId = ctx.membersByEmail.get(norm(r.email));
    const modId = moduleKey(r.module_id);
    const mod = ctx.modules.get(modId);
    const type = normalizeTestType(r.test_type);

    if (!memberId) err('ไม่พบอีเมลใน Members');
    if (!mod) err('module_id ไม่ถูกต้อง');
    else if (!mod.active) err('Module นี้ยังไม่ใช้งาน');
    if (!type) err('test_type ต้องเป็น Pre หรือ Post');
    if (!isNum(r.mc_score_pct)) err('ไม่มีคะแนนปรนัย');
    if ((isNum(r.mc_score_pct) && (r.mc_score_pct < 0 || r.mc_score_pct > 100)) ||
        (isNum(r.essay_score_pct) && (r.essay_score_pct < 0 || r.essay_score_pct > 100))) err('คะแนนต้องอยู่ระหว่าง 0-100');
    if (!r.test_date || !/^\d{4}-\d{2}-\d{2}$/.test(r.test_date)) err('ไม่มีวันที่สอบ (รูปแบบ YYYY-MM-DD)');
    if (!isNum(r.attempt_no)) err('ไม่มี attempt_no');

    if (memberId && mod && type) {
      const st = ctx.statusByKey.get(`${memberId}|${modId}`);
      if (type === 'Pre' ? st !== 'P' : st !== 'P' && st !== 'N') err('ไม่ใช่ P ของ Module นี้');
    }
    if (type === 'Pre' && isNum(r.attempt_no) && r.attempt_no !== 1) err('Pre-test ต้อง attempt_no = 1');
    if (type === 'Post' && isNum(r.attempt_no) && (r.attempt_no < 1 || r.attempt_no > ctx.maxAttempts)) err('สอบเกินจำนวนครั้งที่กำหนด');
    if ((counts.get(keyOf(r)) ?? 0) > 1) err('แถวซ้ำ');
    if (isNum(r.essay_score_pct) && !(r.essay_confirmed_by ?? '').trim()) err('คะแนนอัตนัยไม่มีผู้ยืนยัน');

    // สิทธิ์ผู้อัปโหลด: Admin หรือผู้สอนของ Module นั้นเท่านั้น
    if (mod && ctx.uploader.role !== 'Admin' && ctx.instructorIdByModule.get(modId) !== ctx.uploader.id)
      err('คุณไม่ใช่ผู้สอนของ Module นี้');

    if (type === 'Pre' && isNum(r.essay_score_pct)) warn('Pre-test ไม่ต้องมีคะแนนอัตนัย');
    if (type === 'Post' && !isNum(r.essay_score_pct)) warn('Post-test ยังไม่มีคะแนนอัตนัย (จะยังไม่ตัดสินผ่าน/ไม่ผ่าน)');
    const instr = ctx.instructorEmailByModule.get(modId);
    if (isNum(r.essay_score_pct) && instr && norm(r.essay_confirmed_by) !== instr) warn('ผู้ยืนยันไม่ใช่ผู้สอนของ Module');
  });
  return issues;
}
