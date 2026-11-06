'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { hashPassword, signSession, verifyPassword } from '@/lib/crypto';
import { loadBundle } from '@/lib/data';
import { homeFor } from '@/lib/access';
import { COOKIE } from '@/lib/session';

const HOURS = 8;

export async function login(form: FormData) {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const b = loadBundle();
  const u = b.users.find(x => x.email === email);
  const ok = u ? verifyPassword(password, u.salt, u.hash) : (hashPassword(password), false); // เวลาตอบใกล้เคียงกันทั้งสองกรณี
  if (!ok || !u) {
    await new Promise(r => setTimeout(r, 700));
    redirect('/login?error=1');
  }
  (await cookies()).set(COOKIE, signSession({ email, exp: Date.now() + HOURS * 3600_000 }), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: HOURS * 3600,
  });
  const m = b.members.find(x => x.id === u.memberId);
  redirect(m ? homeFor(m.role) : '/me');
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect('/login');
}
