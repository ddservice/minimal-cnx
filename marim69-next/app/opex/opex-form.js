'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { OPEX_OPERATING } from '../../lib/opex';
import { saveOpexAction } from './actions';

const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });

export default function OpexForm({ monthInput, monthLabel, existing }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState(null);

  const [amounts, setAmounts] = useState(() => {
    const init = {};
    OPEX_OPERATING.items.forEach((it) => {
      init[it.key] = existing[it.key] != null ? String(existing[it.key]) : '';
    });
    return init;
  });

  const total = OPEX_OPERATING.items.reduce((a, it) => a + (Number(amounts[it.key]) || 0), 0);

  function onMonthChange(e) {
    const m = e.target.value;
    if (/^\d{4}-\d{2}$/.test(m)) router.push(`/opex?month=${m}`);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);
    const res = await saveOpexAction({ month_label: monthLabel, items: amounts });
    setMsg({ text: res.message, type: res.status === 'ok' ? 'ok' : 'err' });
    if (res.status === 'ok') startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={card}>
        <label style={lbl}>เดือน</label>
        <input type="month" value={monthInput} onChange={onMonthChange} style={{ ...inp, maxWidth: 200 }} />
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>({monthLabel})</span>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: 15, marginBottom: 12 }}>รายการค่าใช้จ่าย</h2>
        {OPEX_OPERATING.items.map((it) => (
          <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 160px', fontSize: 14 }}>{it.label}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={amounts[it.key]}
              onChange={(e) => setAmounts({ ...amounts, [it.key]: e.target.value })}
              placeholder="0"
              style={{ ...inp, flex: '0 1 160px' }}
            />
            <span style={{ fontSize: 13, color: 'var(--muted)', width: 20 }}>฿</span>
          </div>
        ))}
      </div>

      <div style={{ ...card, background: '#f5ede3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>ยอดรวมค่าดำเนินการ</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--coffee)' }}>{fmt(total)} ฿</div>
        </div>
        <button type="submit" style={btnSave} disabled={isPending}>
          {isPending ? 'กำลังบันทึก...' : 'บันทึกค่าดำเนินการ'}
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
        เว้นว่างช่องไหน = ไม่บันทึกช่องนั้น · บันทึกซ้ำเดือนเดิม = อัปเดตทับ (ไม่เพิ่มซ้ำ)
      </p>

      {msg && (
        <div style={{ marginTop: 8, color: msg.type === 'ok' ? '#1e7e34' : '#c0392b', fontSize: 14 }}>
          {msg.text}
        </div>
      )}
    </form>
  );
}

const card = { border: '1px solid var(--border)', borderRadius: 14, padding: 16, background: 'var(--surface)', marginBottom: 12 };
const lbl = { display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 };
const inp = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14 };
const btnSave = { border: 0, borderRadius: 10, padding: '12px 22px', fontSize: 15, fontWeight: 700, background: 'var(--coffee)', color: '#fff', cursor: 'pointer' };
