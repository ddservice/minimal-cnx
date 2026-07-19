'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_TABS } from '../lib/perms';

export default function AppNav({ isAdmin, allowed }) {
  const path = usePathname();
  const allowSet = new Set(allowed || NAV_TABS.map((t) => t.href));
  const visible = NAV_TABS.filter((t) => allowSet.has(t.href));
  const tabs = isAdmin ? [...visible, { href: '/admin', label: 'ผู้ใช้', icon: 'ti-users' }] : visible;

  return (
    <nav className="app-nav">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={`nav-tab${path.startsWith(t.href) ? ' active' : ''}`}>
          <i className={`ti ${t.icon}`} />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
