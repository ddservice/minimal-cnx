import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';
import { EXPENSE_CATEGORY_VALUES } from '../../lib/expense-categories';
import ExpenseForm from './expense-form';

function todayISO() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });

export default async function ExpensesPage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const date = sp?.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO();
  const category = EXPENSE_CATEGORY_VALUES.includes(sp?.category)
    ? sp.category
    : EXPENSE_CATEGORY_VALUES[0];

  // รายการที่บันทึกไว้แล้วของวัน+หมวดนี้ (read-only) — RLS: authenticated อ่านได้
  const { data: existing } = await supabase
    .from('expenses')
    .select('item_name, subcategory, unit, unit_price, quantity, total_amount, payment_method')
    .eq('date', date)
    .eq('category', category)
    .order('logged_at', { ascending: true });

  const existingSum = (existing || []).reduce((a, r) => a + Number(r.total_amount || 0), 0);

  return (
    <div className="wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>บันทึกรายจ่าย</h1>
        <Link className="link-btn" href="/dashboard">← กลับ Dashboard</Link>
      </div>

      <ExpenseForm date={date} category={category} />

      {/* รายการที่บันทึกไว้แล้ว */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 16, background: 'var(--surface)', marginTop: 8 }}>
        <h2 style={{ marginTop: 0, fontSize: 15 }}>
          รายการที่บันทึกแล้ว ({date})
        </h2>
        {!existing || !existing.length ? (
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>ยังไม่มีรายการในหมวดนี้</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                    <th style={th}>รายการ</th>
                    <th style={th}>ผู้ขาย</th>
                    <th style={{ ...th, textAlign: 'right' }}>จำนวน</th>
                    <th style={{ ...th, textAlign: 'right' }}>ราคา/หน่วย</th>
                    <th style={{ ...th, textAlign: 'right' }}>รวม (฿)</th>
                    <th style={th}>ชำระด้วย</th>
                  </tr>
                </thead>
                <tbody>
                  {existing.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={td}>{r.item_name}</td>
                      <td style={td}>{r.subcategory || '-'}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmt(r.quantity)} {r.unit || ''}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmt(r.unit_price)}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmt(r.total_amount)}</td>
                      <td style={td}>{r.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'right', marginTop: 10, fontSize: 14 }}>
              รวมทั้งหมด: <strong style={{ color: 'var(--coffee)' }}>{fmt(existingSum)} ฿</strong>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const th = { padding: '6px 8px', fontWeight: 600 };
const td = { padding: '6px 8px' };
