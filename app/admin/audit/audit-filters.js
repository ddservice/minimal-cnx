'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const TABLES = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'sales_daily', label: 'ยอดขาย' },
  { value: 'expenses', label: 'รายจ่าย' },
  { value: 'business_config', label: 'ตั้งค่าระบบ' },
  { value: 'profiles', label: 'บัญชีผู้ใช้' },
  { value: 'auth', label: 'เข้าสู่ระบบ' },
  { value: 'access', label: 'ถูกปฏิเสธสิทธิ์' },
  { value: 'admin', label: 'จัดการผู้ใช้' },
  { value: 'reports', label: 'ส่งออกไฟล์' },
  { value: 'customers', label: 'ลูกค้าสะสมแต้ม' },
  { value: 'point_transactions', label: 'ธุรกรรมแต้ม' },
  { value: 'redemption_history', label: 'แลกรางวัล' },
];
const ACTIONS = [
  { value: '', label: 'ทุกการกระทำ' },
  { value: 'INSERT', label: 'เพิ่ม' },
  { value: 'UPDATE', label: 'แก้ไข' },
  { value: 'DELETE', label: 'ลบ' },
  { value: 'LOGIN', label: 'ล็อกอินสำเร็จ' },
  { value: 'LOGIN_FAIL', label: 'ล็อกอินไม่สำเร็จ' },
  { value: 'LOGOUT', label: 'ออกจากระบบ' },
  { value: 'DENY', label: 'ถูกปฏิเสธ' },
  { value: 'EXPORT', label: 'ส่งออก' },
  { value: 'IMPORT', label: 'นำเข้าไฟล์' },
  { value: 'CREATE_USER', label: 'สร้างผู้ใช้' },
  { value: 'RESET_PASSWORD', label: 'รีเซ็ตรหัส' },
];

export default function AuditFilters({ table, action, ip, q }) {
  const router = useRouter();
  const [ipDraft, setIpDraft] = useState(ip || '');
  const [qDraft, setQDraft] = useState(q || '');

  function go(next) {
    const p = new URLSearchParams();
    if (next.table) p.set('table', next.table);
    if (next.action) p.set('action', next.action);
    if (next.ip) p.set('ip', next.ip);
    if (next.q) p.set('q', next.q);
    router.push(`/admin/audit${p.toString() ? `?${p}` : ''}`);
  }

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        go({ table, action, ip: ipDraft.trim(), q: qDraft.trim() });
      }}
    >
      <div className="card-body" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" style={{ maxWidth: 180 }} value={table} onChange={(e) => go({ table: e.target.value, action, ip, q })}>
          {TABLES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 180 }} value={action} onChange={(e) => go({ table, action: e.target.value, ip, q })}>
          {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <input className="input" style={{ maxWidth: 160 }} placeholder="กรอง IP" value={ipDraft} onChange={(e) => setIpDraft(e.target.value)} />
        <input className="input" style={{ maxWidth: 180 }} placeholder="ชื่อผู้ใช้" value={qDraft} onChange={(e) => setQDraft(e.target.value)} />
        <button className="btn btn-coffee" type="submit" style={{ padding: '8px 14px' }}>ค้นหา</button>
      </div>
    </form>
  );
}
