'use client';

import { useRouter } from 'next/navigation';

const TABLES = [
  { value: '', label: 'ทุกตาราง' },
  { value: 'sales_daily', label: 'ยอดขาย' },
  { value: 'expenses', label: 'รายจ่าย' },
  { value: 'business_config', label: 'ตั้งค่าระบบ' },
];
const ACTIONS = [
  { value: '', label: 'ทุกการกระทำ' },
  { value: 'INSERT', label: 'เพิ่ม' },
  { value: 'UPDATE', label: 'แก้ไข' },
  { value: 'DELETE', label: 'ลบ' },
];

export default function AuditFilters({ table, action }) {
  const router = useRouter();

  function go(nextTable, nextAction) {
    const p = new URLSearchParams();
    if (nextTable) p.set('table', nextTable);
    if (nextAction) p.set('action', nextAction);
    router.push(`/admin/audit${p.toString() ? `?${p}` : ''}`);
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <select className="input" style={{ maxWidth: 160 }} value={table} onChange={(e) => go(e.target.value, action)}>
        {TABLES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <select className="input" style={{ maxWidth: 160 }} value={action} onChange={(e) => go(table, e.target.value)}>
        {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>
    </div>
  );
}
