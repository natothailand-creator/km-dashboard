// อ่านไฟล์ Import_Template.xlsx (ใช้ในสคริปต์ในเครื่องเท่านั้น)
import * as XLSX from 'xlsx';
import type { ImportRow } from './validate';

const pad = (n: number) => String(n).padStart(2, '0');
export function toIsoDate(v: unknown): string | null {
  if (v instanceof Date) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); return d ? `${d.y}-${pad(d.m)}-${pad(d.d)}` : null; }
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}
const str = (v: unknown) => { const s = String(v ?? '').trim(); return s === '' ? null : s; };
const num = (v: unknown) => { const s = str(v); if (s === null) return null; const n = Number(s); return Number.isFinite(n) ? n : null; };

export function parseImportFile(file: string): ImportRow[] {
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets['Import_Template'] ?? wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, blankrows: false });
  return grid.slice(1, 501)
    .filter(c => !String(c[8] ?? '').includes('ตัวอย่าง')) // ข้ามแถวตัวอย่างในเทมเพลต
    .map(c => ({
      email: str(c[0]), module_id: str(c[1]), test_type: str(c[2]), mc_score_pct: num(c[3]), essay_score_pct: num(c[4]),
      attempt_no: num(c[5]), test_date: toIsoDate(c[6]), essay_confirmed_by: str(c[7]),
    }))
    .filter(r => Object.values(r).some(v => v !== null));
}
