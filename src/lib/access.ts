// กฎสิทธิ์ชุดเดียวของทั้งระบบ: Lead / Manager / Admin เห็นทุกคน | Member เห็นเฉพาะของตัวเอง
import type { Bundle, Role, Scoped } from '../types/km';

export const canSeeAll = (role: Role) => role !== 'Member';
export const homeFor = (role: Role) => (canSeeAll(role) ? '/overview' : '/me');

export function scopeFor(bundle: Bundle, memberId: string, role: Role): Scoped {
  const { users: _users, ...data } = bundle; // ไม่ส่งรหัสผ่าน/แฮชออกไปเด็ดขาด
  if (canSeeAll(role)) return data;
  return {
    ...data,
    members: data.members.filter(m => m.id === memberId),
    memberModules: data.memberModules.filter(x => x.memberId === memberId),
    results: data.results.filter(r => r.memberId === memberId),
  };
}
