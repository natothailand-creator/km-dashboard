import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from './crypto';
import { loadBundle } from './data';
import { homeFor, scopeFor } from './access';
import type { Role, Scoped, SessionUser } from '../types/km';

export const COOKIE = 'km_session';

export const getUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  const s = token ? verifySession(token) : null;
  if (!s) return null;
  const b = loadBundle();
  const u = b.users.find(x => x.email === s.email);
  const m = u && b.members.find(x => x.id === u.memberId);
  return m ? { memberId: m.id, name: m.name, email: m.email, role: m.role } : null; // บทบาทอ่านจากข้อมูลล่าสุดเสมอ
});

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect('/login');
  if (roles && !roles.includes(u.role)) redirect(homeFor(u.role));
  return u;
}

/** ทางเดียวที่หน้าเว็บใช้ดึงข้อมูล: กรองตามสิทธิ์ผู้ล็อกอินเสมอ */
export async function getScopedData(roles?: Role[]): Promise<{ user: SessionUser; data: Scoped }> {
  const user = await requireUser(roles);
  return { user, data: scopeFor(loadBundle(), user.memberId, user.role) };
}
