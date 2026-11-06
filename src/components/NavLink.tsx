'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function NavLink({ href, icon, children }: { href: string; icon: string; children: ReactNode }) {
  const path = usePathname();
  const active = path === href || path.startsWith(href + '/');
  return (
    <Link href={href} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
      active ? 'bg-axons-blue text-white shadow-[0_4px_12px_rgba(0,82,204,0.25)]' : 'text-slate-600 hover:bg-slate-50'}`}>
      <i className={`fa-solid ${icon} w-5`} />
      <span>{children}</span>
    </Link>
  );
}
