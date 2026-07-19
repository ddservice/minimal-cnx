'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard', label: 'ภาพรวม', icon: 'ti-layout-dashboard' },
  { href: '/sales', label: 'ยอดขาย', icon: 'ti-cash' },
  { href: '/expenses', label: 'รายจ่าย', icon: 'ti-receipt' },
  { href: '/opex', label: 'ค่าดำเนินการ', icon: 'ti-building-store' },
  { href: '/reports', label: 'สรุป', icon: 'ti-chart-bar' },
  { href: '/settings', label: 'ตั้งค่า', icon: 'ti-settings' },
];

export default function AppNav({ isAdmin }) {
  const path = usePathname();
  const tabs = isAdmin ? [...TABS, { href: '/admin', label: 'ผู้ใช้', icon: 'ti-users' }] : TABS;

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
