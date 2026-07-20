import Sidebar from './sidebar';

// เปลือกหน้าจอมาตรฐาน: sidebar (rail ยุบได้บนเดสก์ท็อป / drawer บนมือถือ) + เนื้อหาหลัก
export default function AppShell({ name, role, isAdmin, allowed, children }) {
  return (
    <div className="shell">
      <Sidebar name={name} role={role} isAdmin={isAdmin} allowed={allowed} />
      <div className="shell-main">
        <div className="shell-container">{children}</div>
      </div>
    </div>
  );
}
