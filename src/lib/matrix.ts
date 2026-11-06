// สร้างข้อมูลแต่ละช่องของ Skill Matrix ตามมุมมอง (ใช้กับหน้า /skill-matrix)
import type { KmStatus, Member, ModuleRec, Scoped } from '../types/km';
import { bestPost, preScore } from './metrics';

export type Mode = 'status' | 'pre' | 'post' | 'gain';
export const MODES: { id: Mode; label: string }[] = [
  { id: 'status', label: 'สถานะ (C/P/N)' }, { id: 'pre', label: 'ก่อนเรียน (Pre)' },
  { id: 'post', label: 'หลังเรียน (Post)' }, { id: 'gain', label: 'ผลต่างพัฒนาการ (+Gain)' },
];
export type Tone = 'green' | 'amber' | 'red' | 'grey' | 'sky' | 'plain' | 'none';
export interface Cell { tone: Tone; text: string; relevant: boolean; known: boolean; gain: number | null; title: string }

export function buildCell(d: Scoped, mem: Member, mod: ModuleRec, status: KmStatus | undefined, mode: Mode): Cell {
  if (!status) return { tone: 'none', text: '', relevant: false, known: false, gain: null, title: '' };
  const pre = preScore(d, mem.id, mod.id), postRec = bestPost(d, mem.id, mod.id), post = postRec?.total ?? null;
  const gain = pre !== null && post !== null ? post - pre : null;
  const { knowHigh: hi, knowMid: mid } = d.settings;
  const title = [mem.name, `${mod.product} / ${mod.name}`, `สถานะ: ${status}`, `Pre: ${pre === null ? '-' : Math.round(pre)}`,
    `Post: ${postRec === null ? '-' : post === null ? 'รอคะแนนอัตนัย' : Math.round(post)}`,
    gain === null ? '' : `Gain: ${gain >= 0 ? '+' : ''}${gain.toFixed(0)}`].filter(Boolean).join('\n');
  const mk = (tone: Tone, text: string, known: boolean, relevant = true): Cell => ({ tone, text, relevant, known, gain, title });

  if (mode === 'status') return mk(status === 'C' ? 'green' : status === 'P' ? 'amber' : 'sky', status === 'C' ? '✔ C' : status === 'P' ? '● P' : '✔ N', status !== 'P');

  if (mode === 'pre') {
    if (status === 'C') return mk('green', '✔ รู้', true);
    if (pre === null) return mk('grey', '-', false);
    const n = String(Math.round(pre));
    return pre >= hi ? mk('green', `✔ ${n}`, true) : pre >= mid ? mk('amber', `● ${n}`, false) : mk('red', `✖ ${n}`, false);
  }

  if (mode === 'post') {
    if (status === 'C') return mk('green', '✔ รู้', true);
    if (status === 'N') return mk('green', post === null ? '✔ N' : `✔ ${Math.round(post)}`, true);
    if (postRec) return post === null ? mk('amber', '… อัตนัย', false) : mk('red', `✖ ${Math.round(post)}`, false);
    return pre !== null ? mk('amber', '● เรียน', false) : mk('grey', '-', false);
  }

  // gain: เฉพาะผู้ที่ต้องเรียน (P/N)
  if (status === 'C') return mk('none', '', false, false);
  if (gain === null) return mk('grey', '-', false, false);
  const g = Math.round(gain);
  return mk(g >= 30 ? 'green' : g < 0 ? 'red' : 'plain', `${g >= 0 ? '▲ +' : '▼ '}${g}`, false, true);
}

export const TONE_CLASS: Record<Tone, string> = {
  green: 'bg-emerald-100 text-emerald-800 font-bold', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-axons-red',
  grey: 'bg-slate-100 text-slate-400', sky: 'bg-sky-100 text-sky-800 font-bold', plain: 'bg-white text-slate-700', none: 'bg-slate-50/40',
};

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
