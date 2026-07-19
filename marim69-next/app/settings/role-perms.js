'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { NAV_TABS, MANAGED_ROLES } from '../../lib/perms';
import { saveRolePerms } from './actions';

export default function RolePerms({ perms }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState(null);
  // state[role][href] = boolean (default true)
  const [state, setState] = useState(() => {
    const s = {};
    MANAGED_ROLES.forEach((r) => {
      s[r.value] = {};
      NAV_TABS.forEach((t) => { s[r.value][t.href] = perms?.[r.value]?.[t.href] !== false; });
    });
    return s;
  });

  const toggle = (role, href) =>
    setState((s) => ({ ...s, [role]: { ...s[role], [href]: !s[role][href] } }));

  async function onSave() {
    setMsg(null);
    const res = await saveRolePerms(state);
    setMsg({ text: res.message, type: res.status === 'ok' ? 'ok' : 'err' });
    if (res.status === 'ok') startTransition(() => router.refresh());
  }

  return (
    <div className="card">
      <div className="card-head"><i className="ti ti-lock-access" /><h2>สิทธิ์การมองเห็นเมนู (ตามตำแหน่ง)</h2></div>
      <div className="card-body" style={{ overflowX: 'auto' }}>
        <p className="muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 12 }}>
          Admin เห็นทุกเมนูเสมอ · ติ๊ก = ตำแหน่งนั้นเห็นเมนูนั้น (เป็นการซ่อนเมนู ไม่ใช่ล็อกข้อมูล — ข้อมูลยังกันด้วย RLS)
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>เมนู</th>
              {MANAGED_ROLES.map((r) => <th key={r.value} style={{ padding: '6px 8px', fontWeight: 600 }}>{r.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {NAV_TABS.map((t) => (
              <tr key={t.href} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '7px 8px' }}><i className={`ti ${t.icon}`} style={{ marginRight: 6, color: 'var(--taupe)' }} />{t.label}</td>
                {MANAGED_ROLES.map((r) => (
                  <td key={r.value} style={{ padding: '7px 8px', textAlign: 'center' }}>
                    <input type="checkbox" checked={state[r.value][t.href]} onChange={() => toggle(r.value, t.href)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-coffee" type="button" onClick={onSave} disabled={isPending} style={{ marginTop: 14 }}>
          <i className="ti ti-device-floppy" /> {isPending ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์'}
        </button>
        {msg && <div style={{ marginTop: 12, fontSize: 14, color: msg.type === 'ok' ? 'var(--success)' : 'var(--danger)' }}>{msg.text}</div>}
      </div>
    </div>
  );
}
