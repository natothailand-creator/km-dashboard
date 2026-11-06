import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import { homeFor } from '@/lib/access';

export default async function Home() {
  const u = await getUser();
  redirect(u ? homeFor(u.role) : '/login');
}
