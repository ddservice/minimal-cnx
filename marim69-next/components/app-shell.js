import AppNav from './app-nav';
import SignOutButton from './sign-out-button';

const ROLE_LABEL = { admin: 'Admin', 'co-admin': 'Co-Admin', manager: 'Manager', staff: 'Staff' };

// เปลือกหน้าจอมาตรฐาน: header (แบรนด์ + ผู้ใช้ + ออกจากระบบ) + แท็บเมนู
export default function AppShell({ name, role, isAdmin, allowed, children }) {
  return (
    <div className="wrap">
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon"><i className="ti ti-coffee" /></div>
          <div>
            <h1>Minimal Maerim</h1>
            <p>
              {name}
              {role ? ` · ${ROLE_LABEL[role] || role}` : ''}
            </p>
          </div>
        </div>
        <SignOutButton />
      </header>

      <AppNav isAdmin={isAdmin} allowed={allowed} />

      <main>{children}</main>
    </div>
  );
}
