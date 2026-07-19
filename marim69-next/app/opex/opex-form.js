'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { OPEX_OPERATING, OPEX_STAFF, OPEX_TAX } from '../../lib/opex';
import { saveOpexAction } from './actions';

const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const sumObj = (o) => Object.values(o).reduce((a, v) => a + (Number(v) || 0), 0);

export default function OpexForm({ monthInput, monthLabel, existing }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState(null);

  const initFixed = (items, saved) => {
    const o = {};
    items.forEach((it) => (o[it.key] = saved[it.key] != null ? String(saved[it.key]) : ''));
    return o;
  };

  const [operating, setOperating] = useState(() => initFixed(OPEX_OPERATING.items, existing.operating));
  const [staff, setStaff] = useState(() => initFixed(OPEX_STAFF.fixed, existing.staff));
  const [tax, setTax] = useState(() => initFixed(OPEX_TAX.items, existing.tax));
  const [employees, setEmployees] = useState(() =>
    existing.employees?.length
      ? existing.employees.map((e) => ({ label: e.label || '', amount: e.amount != null ? String(e.amount) : '' }))
      : [{ label: 'พนักงานคนที่ 1', amount: '' }]
  );

  const empTotal = employees.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const grand = sumObj(operating) + sumObj(staff) + sumObj(tax) + empTotal;

  function onMonthChange(e) {
    if (/^\d{4}-\d{2}$/.test(e.target.value)) router.push(`/opex?month=${e.target.value}`);
  }

  const setEmp = (i, k, v) => setEmployees(employees.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)));
  const addEmp = () => setEmployees([...employees, { label: `พนักงานคนที่ ${employees.length + 1}`, amount: '' }]);
  const removeEmp = (i) => setEmployees(employees.length > 1 ? employees.filter((_, idx) => idx !== i) : employees);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);
    const res = await saveOpexAction({ month_label: monthLabel, operating, staff, tax, employees });
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

      {/* หมวด 1: ค่าใช้จ่ายดำเนินการ */}
      <Section title="ค่าใช้จ่ายดำเนินการ" total={sumObj(operating)}>
        {OPEX_OPERATING.items.map((it) => (
          <Row key={it.key} label={it.label} value={operating[it.key]} onChange={(v) => setOperating({ ...operating, [it.key]: v })} />
        ))}
      </Section>

      {/* หมวด 2: ค่าแรงพนักงาน */}
      <Section title="ค่าแรงพนักงาน" total={sumObj(staff) + empTotal}>
        {OPEX_STAFF.fixed.map((it) => (
          <Row key={it.key} label={it.label} value={staff[it.key]} onChange={(v) => setStaff({ ...staff, [it.key]: v })} />
        ))}
        <div style={{ borderTop: '1px dashed var(--border)', margin: '8px 0', paddingTop: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>พนักงาน</div>
          {employees.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={e.label} onChange={(ev) => setEmp(i, 'label', ev.target.value)} placeholder="ชื่อ/ตำแหน่ง" style={{ ...inp, flex: '1 1 140px' }} />
              <input type="number" min="0" step="any" value={e.amount} onChange={(ev) => setEmp(i, 'amount', ev.target.value)} placeholder="0" style={{ ...inp, flex: '0 1 130px' }} />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>฿</span>
              {employees.length > 1 && (
                <button type="button" onClick={() => removeEmp(i)} style={btnRemove}>ลบ</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addEmp} style={btnAdd}>+ เพิ่มพนักงาน</button>
        </div>
      </Section>

      {/* หมวด 3: ภาษีและอื่นๆ */}
      <Section title="ภาษีและอื่นๆ" total={sumObj(tax)}>
        {OPEX_TAX.items.map((it) => (
          <Row key={it.key} label={it.label} value={tax[it.key]} onChange={(v) => setTax({ ...tax, [it.key]: v })} />
        ))}
      </Section>

      {/* รวม + บันทึก */}
      <div style={{ ...card, background: '#f5ede3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>ยอดรวม OPEX ทั้งหมด</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--coffee)' }}>{fmt(grand)} ฿</div>
        </div>
        <button type="submit" style={btnSave} disabled={isPending}>
          {isPending ? 'กำลังบันทึก...' : 'บันทึกค่าดำเนินการ'}
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
        เว้นว่าง = ไม่บันทึกช่องนั้น · บันทึกซ้ำเดือนเดิม = อัปเดตทับ
      </p>

      {msg && (
        <div style={{ marginTop: 8, color: msg.type === 'ok' ? '#1e7e34' : '#c0392b', fontSize: 14 }}>{msg.text}</div>
      )}
    </form>
  );
}

function Section({ title, total, children }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>{title}</h2>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>รวม <strong style={{ color: 'var(--coffee)' }}>{fmt(total)} ฿</strong></span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
      <label style={{ flex: '1 1 160px', fontSize: 14 }}>{label}</label>
      <input type="number" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" style={{ ...inp, flex: '0 1 160px' }} />
      <span style={{ fontSize: 13, color: 'var(--muted)', width: 12 }}>฿</span>
    </div>
  );
}

const card = { border: '1px solid var(--border)', borderRadius: 14, padding: 16, background: 'var(--surface)', marginBottom: 12 };
const lbl = { display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 };
const inp = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14 };
const btnRemove = { border: 0, background: '#fff0f0', color: 'var(--danger)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' };
const btnAdd = { border: '1px dashed var(--border)', background: 'var(--surface)', color: 'var(--coffee)', borderRadius: 10, padding: '8px', width: '100%', fontSize: 13, cursor: 'pointer', fontWeight: 600 };
const btnSave = { border: 0, borderRadius: 10, padding: '12px 22px', fontSize: 15, fontWeight: 700, background: 'var(--coffee)', color: '#fff', cursor: 'pointer' };
