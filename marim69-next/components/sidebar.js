'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_TABS } from '../lib/perms';
import SignOutButton from './sign-out-button';

const ROLE_LABEL = { admin: 'Admin', 'co-admin': 'Co-Admin', manager: 'Manager', staff: 'Staff' };
const COLLAPSE_KEY = 'mm69_sidebar_collapsed'; // แค่ UI preference (เปิด/ยุบแถบ) ไม่ใช่ข้อมูลธุรกิจ — เก็บ localStorage ได้ปลอดภัย

// Sidebar เดียว ทำหน้าที่ 2 โหมด: rail ยุบ/ขยายได้บนเดสก์ท็อป, drawer เลื่อนเข้า-ออกบนมือถือ
// mobileOpen/setMobileOpen ถูกยกขึ้นไปให้ AppShell ถือ เพราะปุ่มแฮมเบอร์เกอร์ที่เปิด drawer
// นี้อยู่ใน .mobile-topbar ซึ่งต้องอยู่ "ข้างใน" .shell-main (ไม่ใช่ sibling ของ .sidebar ใน .shell
// ที่เป็น flex row) — ก่อนหน้านี้ mobile-topbar เป็น flex item แยกจาก .shell-main ทำให้บน Safari
// จริงมันไม่ยอมขึ้นบรรทัดใหม่แม้จะตั้ง width:100% + flex-wrap แล้ว กลายเป็นเนื้อหาถูกบีบแคบจนตัวเลขล้น
export default function Sidebar({ name, role, isAdmin, allowed, mobileOpen, setMobileOpen }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1'); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch {}
  }, [collapsed]);

  const allowSet = new Set(allowed || NAV_TABS.map((t) => t.href));
  const visible = NAV_TABS.filter((t) => allowSet.has(t.href));
  const tabs = isAdmin ? [...visible, { href: '/admin', label: 'ผู้ใช้งาน', icon: 'ti-users' }] : visible;

  return (
    <>
      <div className={`sidebar-overlay${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon sidebar-brand-icon"><i className="ti ti-coffee" /></div>
          <div className="sidebar-brand-text">
            <h1>Minimal Maerim</h1>
            <p>{name}{role ? ` · ${ROLE_LABEL[role] || role}` : ''}</p>
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            style={{ marginLeft: 'auto' }}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
          >
            <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-left'}`} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} className={`sidebar-link${path.startsWith(t.href) ? ' active' : ''}`} title={t.label}>
              <i className={`ti ${t.icon}`} />
              <span>{t.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
