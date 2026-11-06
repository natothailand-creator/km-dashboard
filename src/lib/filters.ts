import type { Scoped } from '../types/km';

export interface Filters { product?: string; team?: string }

/** กรองข้อมูลที่ผ่านการกรองสิทธิ์แล้ว ตาม Product และทีม (ไม่ขยายสิทธิ์ ใช้ได้แค่ตัดให้แคบลง) */
export function filterScoped(d: Scoped, f: Filters): Scoped {
  const modules = d.modules.filter(m => !f.product || m.product === f.product);
  const members = d.members.filter(m => !f.team || m.team === f.team);
  const mod = new Set(modules.map(m => m.id)), mem = new Set(members.map(m => m.id));
  return {
    ...d, modules, members,
    memberModules: d.memberModules.filter(x => mod.has(x.moduleId) && mem.has(x.memberId)),
    results: d.results.filter(r => mod.has(r.moduleId) && mem.has(r.memberId)),
    courses: d.courses.filter(c => mod.has(c.moduleId)),
  };
}
