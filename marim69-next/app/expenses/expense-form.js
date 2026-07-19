'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../lib/expense-categories';
import { saveExpensesAction } from './actions';

const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });

const emptyRow = () => ({
  item_name: '',
  supplier: '',
  quantity: '1',
  unit: '',
  unit_price: '',
  vat: false,
  payment_method: 'บัญชี หจก.',
});

function rowTotal(r) {
  const price = Number(r.unit_price) || 0;
  const qty = Number(r.quantity) || 0;
  return Math.round((r.vat ? price * 1.07 : price) * qty * 100) / 100;
}

export default function ExpenseForm({ date, category }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState(null);
  const [rows, setRows] = useState([emptyRow()]);

  const grand = rows.reduce((a, r) => a + rowTotal(r), 0);

  const setRow = (i, k, v) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows([...rows, emptyRow()]);
  const removeRow = (i) => setRows(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows);

  function nav(nextDate, nextCat) {
    router.push(`/expenses?date=${nextDate}&category=${encodeURIComponent(nextCat)}`);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);
    const res = await saveExpensesAction({ date, category, rows });
    setMsg({ text: res.message, type: res.status === 'ok' ? 'ok' : 'err' });
    if (res.status === 'ok') {
      setRows([emptyRow()]);
      startTransition(() => router.refresh());
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {/* วันที่ + หมวด */}
      <div style={card}>
        <div style={grid}>
          <div>
            <label style={lbl}>วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && nav(e.target.value, category)}
              style={inp}
            />
          </div>
          <div>
            <label style={lbl}>หมวดหมู่</label>
            <select value={category} onChange={(e) => nav(date, e.target.value)} style={inp}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* รายการ */}
      {rows.map((r, i) => (
        <div key={i} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 13, color: 'var(--muted)' }}>รายการที่ {i + 1}</strong>
            {rows.length > 1 && (
              <button type="button" onClick={() => removeRow(i)} style={btnRemove}>ลบ</button>
            )}
          </div>
          <div style={grid}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>ชื่อรายการ *</label>
              <input value={r.item_name} onChange={(e) => setRow(i, 'item_name', e.target.value)} placeholder="เช่น เมล็ดกาแฟ" style={inp} />
            </div>
            <div>
              <label style={lbl}>ผู้ขาย/ซัพพลายเออร์</label>
              <input value={r.supplier} onChange={(e) => setRow(i, 'supplier', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>จำนวน</label>
              <input type="number" min="0" step="any" value={r.quantity} onChange={(e) => setRow(i, 'quantity', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>หน่วย</label>
              <input value={r.unit} onChange={(e) => setRow(i, 'unit', e.target.value)} placeholder="กก. / ถุง" style={inp} />
            </div>
            <div>
              <label style={lbl}>ราคา/หน่วย (฿) *</label>
              <input type="number" min="0" step="any" value={r.unit_price} onChange={(e) => setRow(i, 'unit_price', e.target.value)} placeholder="0" style={inp} />
            </div>
            <div>
              <label style={lbl}>ชำระด้วย</label>
              <select value={r.payment_method} onChange={(e) => setRow(i, 'payment_method', e.target.value)} style={inp}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={r.vat} onChange={(e) => setRow(i, 'vat', e.target.checked)} />
                VAT 7%
              </label>
            </div>
          </div>
          <div style={{ textAlign: 'right', marginTop: 8, fontSize: 13 }}>
            รวม: <strong style={{ color: 'var(--coffee)' }}>{fmt(rowTotal(r))} ฿</strong>
            {r.vat && <span style={{ color: 'var(--muted)', fontSize: 11 }}> (รวม VAT)</span>}
          </div>
        </div>
      ))}

      <button type="button" onClick={addRow} style={btnAdd}>+ เพิ่มรายการ</button>

      {/* สรุป + บันทึก */}
      <div style={{ ...card, background: '#f5ede3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>ยอดรวมที่จะบันทึก</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--coffee)' }}>{fmt(grand)} ฿</div>
        </div>
        <button type="submit" style={btnSave} disabled={isPending}>
          {isPending ? 'กำลังบันทึก...' : 'บันทึกรายจ่าย'}
        </button>
      </div>

      {msg && (
        <div style={{ marginTop: 14, marginBottom: 20, color: msg.type === 'ok' ? '#1e7e34' : '#c0392b', fontSize: 14 }}>
          {msg.text}
        </div>
      )}
    </form>
  );
}

const card = { border: '1px solid var(--border)', borderRadius: 14, padding: 16, background: 'var(--surface)', marginBottom: 12 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 };
const lbl = { display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 };
const inp = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14 };
const btnRemove = { border: 0, background: '#fff0f0', color: 'var(--danger)', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' };
const btnAdd = { border: '1px dashed var(--border)', background: 'var(--surface)', color: 'var(--coffee)', borderRadius: 10, padding: '10px', width: '100%', fontSize: 14, cursor: 'pointer', marginBottom: 12, fontWeight: 600 };
const btnSave = { border: 0, borderRadius: 10, padding: '12px 22px', fontSize: 15, fontWeight: 700, background: 'var(--coffee)', color: '#fff', cursor: 'pointer' };
