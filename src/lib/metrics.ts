import type { ResultRec, Scoped, Settings } from '../types/km';

export type Level = 'know' | 'partial' | 'none';
export const LEVEL_LABEL: Record<Level, string> = { know: 'รู้จริง', partial: 'รู้บางส่วน', none: 'ไม่รู้' };
export const levelOf = (score: number | null, s: Settings): Level | null =>
  score === null ? null : score >= s.knowHigh ? 'know' : score >= s.knowMid ? 'partial' : 'none';

export const preScore = (d: Scoped, memberId: string, moduleId: string): number | null =>
  d.results.find(r => r.memberId === memberId && r.moduleId === moduleId && r.testType === 'Pre')?.mc ?? null;

/** คะแนน Post ที่ดีที่สุด (นับครั้งที่ดีที่สุดตามที่ตกลงไว้) */
export function bestPost(d: Scoped, memberId: string, moduleId: string): ResultRec | null {
  const list = d.results.filter(r => r.memberId === memberId && r.moduleId === moduleId && r.testType === 'Post');
  if (!list.length) return null;
  return list.reduce((a, b) => ((b.total ?? -1) > (a.total ?? -1) ? b : a));
}

export type Progress = 'done' | 'failed' | 'learning' | 'notstarted';
export const PROGRESS_LABEL: Record<Progress, string> = { done: 'เรียนสำเร็จ', failed: 'สอบไม่ผ่าน', learning: 'กำลังเรียน', notstarted: 'ยังไม่เริ่ม' };
export function progressOf(d: Scoped, memberId: string, moduleId: string, status: string): Progress | null {
  if (status === 'N') return 'done';
  if (status !== 'P') return null;
  const post = bestPost(d, memberId, moduleId);
  if (post) return 'failed';
  return preScore(d, memberId, moduleId) !== null ? 'learning' : 'notstarted';
}

export function moduleRows(d: Scoped) {
  return d.modules.filter(m => m.active).map(m => {
    const mms = d.memberModules.filter(x => x.moduleId === m.id);
    const c = mms.filter(x => x.status === 'C').length;
    const p = mms.filter(x => x.status === 'P').length;
    const n = mms.filter(x => x.status === 'N').length;
    const learners = mms.filter(x => x.status !== 'C');
    const preDone = learners.filter(x => preScore(d, x.memberId, m.id) !== null).length;
    const course = d.courses.find(x => x.moduleId === m.id) ?? null;
    return { module: m, c, p, n, before: c, after: c + n, target: c + p + n, preDone, learners: learners.length,
             course, single: c + n <= 1, noCourse: p > 0 && !course };
  });
}

export function kpis(d: Scoped) {
  const rows = moduleRows(d);
  const w = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + r.module.complexity * f(r), 0);
  const baseline = w(r => r.c), current = w(r => r.c + r.n), target = w(r => r.c + r.p + r.n);

  const pairs = d.memberModules.filter(x => x.status !== 'C');
  const withPost = pairs.map(x => bestPost(d, x.memberId, x.moduleId)).filter((r): r is ResultRec => !!r && r.total !== null);
  const gains = pairs.flatMap(x => {
    const pre = preScore(d, x.memberId, x.moduleId), post = bestPost(d, x.memberId, x.moduleId);
    return pre !== null && post && post.total !== null ? [post.total - pre] : [];
  });
  const progress = { done: 0, failed: 0, learning: 0, notstarted: 0 };
  pairs.forEach(x => { const g = progressOf(d, x.memberId, x.moduleId, x.status); if (g) progress[g]++; });

  return {
    modules: rows.length, members: d.members.length, baseline, current, target,
    passRate: withPost.length ? Math.round((withPost.filter(r => r.passed).length / withPost.length) * 100) : null,
    avgGain: gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : null,
    singlePoint: rows.filter(r => r.single).length, progress, rows,
  };
}

/** ชื่อต้นของผู้ที่รู้ Module นี้ (สถานะ C หรือ N) */
export function knowerNames(d: Scoped, moduleId: string): string[] {
  return d.memberModules.filter(x => x.moduleId === moduleId && x.status !== 'P')
    .map(x => d.members.find(m => m.id === x.memberId)?.name.split(' ')[0] ?? x.memberId);
}

/** Module ที่มีผู้สอบ Post-test (คะแนนครบ) เรียงตามอัตราไม่ผ่านสูงสุด */
export function failRows(d: Scoped) {
  return d.modules.filter(m => m.active).flatMap(m => {
    const pairs = d.memberModules.filter(x => x.moduleId === m.id && x.status !== 'C');
    const posts = pairs.map(x => bestPost(d, x.memberId, m.id)).filter((r): r is ResultRec => !!r && r.total !== null);
    if (!posts.length) return [];
    const failed = posts.filter(r => !r.passed).length;
    return [{ module: m, examinees: posts.length, failed, rate: failed / posts.length }];
  }).sort((a, b) => b.rate - a.rate || b.failed - a.failed);
}

export interface FollowUp { memberId: string; name: string; kind: 'failed' | 'essay' | 'nopre'; issue: string; sort: string }
/** รายการที่ต้องติดตาม: สอบไม่ผ่าน, รอคะแนนอัตนัย, เลยวัน Pre-test แล้วยังไม่ทำ */
export function followUps(d: Scoped, today: string): FollowUp[] {
  const out: FollowUp[] = [];
  const thaiDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  for (const x of d.memberModules) {
    if (x.status !== 'P') continue;
    const mod = d.modules.find(m => m.id === x.moduleId), mem = d.members.find(m => m.id === x.memberId);
    if (!mod || !mem || !mod.active) continue;
    const base = { memberId: mem.id, name: mem.name };
    const post = bestPost(d, x.memberId, x.moduleId);
    if (post) {
      if (post.total === null) out.push({ ...base, kind: 'essay', issue: `รอคะแนนอัตนัย: ${mod.name}`, sort: post.testDate });
      else if (!post.passed) out.push({ ...base, kind: 'failed', issue: `สอบ Post-test ไม่ผ่าน: ${mod.name} (${Math.round(post.total)} คะแนน)`, sort: post.testDate });
      continue;
    }
    if (preScore(d, x.memberId, x.moduleId) === null) {
      const date = d.courses.find(c => c.moduleId === mod.id)?.preTestDate;
      if (date && date < today) out.push({ ...base, kind: 'nopre', issue: `ยังไม่ทำ Pre-test: ${mod.name} (กำหนด ${thaiDate(date)})`, sort: date });
    }
  }
  const order = { failed: 0, essay: 1, nopre: 2 } as const;
  return out.sort((a, b) => order[a.kind] - order[b.kind] || a.sort.localeCompare(b.sort));
}
