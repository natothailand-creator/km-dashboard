import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireUser } from '@/lib/session';
import { canSeeAll } from '@/lib/access';
import { logout } from '../login/actions';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const u = await requireUser();
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">KM Dashboard</div>
        <nav>
          {canSeeAll(u.role) && <><Link href="/overview">ภาพรวมทีม</Link><Link href="/skill-matrix">Skill Matrix</Link></>}
          <Link href="/me">การเรียนของฉัน</Link>
        </nav>
        <div className="who">{u.name}<small>{u.role}</small>
          <form action={logout}><button type="submit">ออกจากระบบ</button></form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
