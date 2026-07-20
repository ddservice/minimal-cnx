'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_TABS } from '../lib/perms';
import SignOutButton from './sign-out-button';

const ROLE_LABEL = { admin: 'Admin', 'co-admin': 'Co-Admin', manager: 'Manager', staff: 'Staff' };
const COLLAPSE_KEY = 'mm69_sidebar_collapsed'; // แค่ UI preference (เปิด/ยุบแถบ) ไม่ใช่ข้อมูลธุรกิจ — เก็บ localStorage ได้ปลอดภัย

// Sidebar เดียว ทำหน้าที่ 2 โหมด: rail ยุบ/ขยายได้บนเดสก์ท็อป, drawer เลื่อนเข้า-ออกบนมือถือ
export default function Sidebar({ name, role, isAdmin, allowed }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1'); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch {}
  }, [collapsed]);
  // ปิด drawer อัตโนมัติเมื่อเปลี่ยนหน้า (มือถือ)
  useEffect(() => { setMobileOpen(false); }, [path]);

  const allowSet = new Set(allowed || NAV_TABS.map((t) => t.href));
  const visible = NAV_TABS.filter((t) => allowSet.has(t.href));
  const tabs = isAdmin ? [...visible, { href: '/admin', label: 'ผู้ใช้งาน', icon: 'ti-users' }] : visible;

  return (
    <>
      {/* แถบบนสุดสำหรับมือถือ — ปุ่มแฮมเบอร์เกอร์เปิด drawer */}
      <div className="mobile-topbar">
        <button type="button" className="mobile-topbar-btn" onClick={() => setMobileOpen(true)} aria-label="เปิดเมนู">
          <i className="ti ti-menu-2" />
        </button>
        <div className="brand-icon sidebar-brand-icon" style={{ width: 30, height: 30, fontSize: 15 }}><i className="ti ti-coffee" /></div>
        <strong style={{ fontSize: 14 }}>Minimal Maerim</strong>
      </div>

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
