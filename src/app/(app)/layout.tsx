import type { ReactNode } from 'react';
import { requireUser } from '@/lib/session';
import { canSeeAll } from '@/lib/access';
import { NavLink } from '@/components/NavLink';
import { logout } from '../login/actions';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const u = await requireUser();
  return (
    <div className="h-screen flex overflow-hidden">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between z-20 shrink-0">
        <div>
          <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
            <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M20 70 L48 20 L62 42 L34 70 Z" fill="#00A859" />
              <path d="M52 20 L80 70 L66 70 L48 38 Z" fill="#0052CC" />
            </svg>
            <div>
              <span className="text-xl font-bold tracking-wider text-slate-800">AXONS</span>
              <span className="block text-[10px] text-slate-400 font-medium tracking-widest uppercase">Academy &amp; Skills</span>
            </div>
          </div>
          <nav className="p-3 space-y-1">
            {canSeeAll(u.role) && <NavLink href="/overview" icon="fa-chart-pie">ภาพรวมทีม</NavLink>}
            {canSeeAll(u.role) && <NavLink href="/skill-matrix" icon="fa-table-cells">Skill Matrix</NavLink>}
            <NavLink href="/me" icon="fa-user-gear">การเรียนของฉัน</NavLink>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center space-x-3 bg-slate-50/50">
          <span className="w-10 h-10 rounded-full bg-axons-blue text-white flex items-center justify-center shrink-0"><i className="fa-solid fa-user" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{u.name}</p>
            <p className="text-xs text-slate-400 truncate">{u.role}</p>
          </div>
          <form action={logout}>
            <button type="submit" title="ออกจากระบบ" className="text-slate-400 hover:text-slate-600 p-1 border-0 bg-transparent"><i className="fa-solid fa-arrow-right-from-bracket" /></button>
          </form>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>
      </main>
    </div>
  );
}
