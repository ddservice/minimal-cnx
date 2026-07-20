import Sidebar from './sidebar';

const ROLE_LABEL = { admin: 'Admin', 'co-admin': 'Co-Admin', manager: 'Manager', staff: 'Staff' };

// เปลือกหน้าจอมาตรฐาน: sidebar (rail ยุบได้บนเดสก์ท็อป / drawer บนมือถือ) + เนื้อหาหลัก
export default function AppShell({ name, role, isAdmin, allowed, children }) {
  return (
    <div className="shell">
      <Sidebar name={name} role={role} isAdmin={isAdmin} allowed={allowed} />
      <div className="shell-main">
        {/* บริบทผู้ใช้งานที่มองเห็นได้แม้ sidebar จะถูกยุบเป็นแบบไอคอนอย่างเดียว (ตอนนั้นชื่อใน sidebar จะถูกซ่อน) */}
        <div className="desktop-topbar">
          <span className="desktop-topbar-brand">Minimal Maerim</span>
          <div className="desktop-topbar-user">
            <span className="desktop-topbar-avatar">{(name || '?').charAt(0).toUpperCase()}</span>
            <span className="desktop-topbar-name">
              {name}
              <small>{role ? ROLE_LABEL[role] || role : ''}</small>
            </span>
          </div>
        </div>
        <div className="shell-container">{children}</div>
      </div>
    </div>
  );
}
