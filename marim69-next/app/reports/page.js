import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';
import { monthInputToLabel, currentMonthInput } from '../../lib/opex';
import MonthPicker from './month-picker';

const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const OPEX_CATS = ['ค่าใช้จ่ายดำเนินการ', 'ค่าแรงพนักงาน', 'ภาษีและอื่นๆ'];

export default async function ReportsPage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const monthInput = /^\d{4}-\d{2}$/.test(sp?.month || '') ? sp.month : currentMonthInput();
  const monthLabel = monthInputToLabel(monthInput);

  const { data: summary } = await supabase.rpc('get_monthly_summary', {
    p_month_label: monthLabel,
  });
  const sales = summary?.sales || [];
  const expenses = summary?.expenses || [];

  // สูตรตรงกับ overview เดิม
  const income = sales.reduce((a, s) => a + Number(s.net_revenue || 0), 0);
  const catSum = (c) =>
    expenses
      .filter((e) => !e.item_key && e.category === c)
      .reduce((a, e) => a + Number(e.total_amount || 0), 0);
  const matTotal = catSum('ต้นทุนวัตถุดิบ');
  const bakTotal = catSum('ต้นทุนขนมหน้าร้าน');
  const miscTotal = catSum('รายจ่ายจิปาถะ');
  const opexTotal = expenses
    .filter((e) => e.item_key && OPEX_CATS.includes(e.category))
    .reduce((a, e) => a + Number(e.total_amount || 0), 0);
  const totalExp = matTotal + bakTotal + miscTotal + opexTotal;
  const profit = income - totalExp;

  const totalCups = sales.reduce((a, s) => a + Number(s.total_cups || 0), 0);
  const pastryRev = sales.reduce((a, s) => a + Number(s.pastry_revenue || 0), 0);
  const daysRecorded = sales.length;

  const rows = [
    { label: 'ต้นทุนวัตถุดิบ', v: matTotal },
    { label: 'ต้นทุนขนม', v: bakTotal },
    { label: 'รายจ่ายจิปาถะ', v: miscTotal },
    { label: 'ค่าดำเนินการ (OPEX)', v: opexTotal },
  ];

  return (
    <div className="wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>สรุปรายเดือน</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <MonthPicker value={monthInput} />
          <Link className="link-btn" href="/dashboard">← Dashboard</Link>
        </div>
      </div>

      {/* KPI หลัก */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 16 }}>
        <Kpi label="รายรับสุทธิ (หัก GP)" value={income} color="#1e7e34" />
        <Kpi label="รายจ่ายรวม" value={totalExp} color="#c0392b" />
        <Kpi label={profit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'} value={profit} color={profit >= 0 ? '#1a5fa5' : '#c0392b'} />
      </div>

      {/* รายจ่ายแยกหมวด */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: 15 }}>รายจ่ายแยกหมวด — {monthLabel}</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 4px' }}>{r.label}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right' }}>{fmt(r.v)} ฿</td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
              <td style={{ padding: '8px 4px' }}>รวมรายจ่าย</td>
              <td style={{ padding: '8px 4px', textAlign: 'right', color: '#c0392b' }}>{fmt(totalExp)} ฿</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* สถิติการขาย */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: 15 }}>สถิติการขาย</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <Mini label="วันที่บันทึก" value={`${daysRecorded} วัน`} />
          <Mini label="ยอดขายรวม" value={`${fmt(totalCups)} แก้ว`} />
          <Mini label="รายได้ขนม" value={`${fmt(pastryRev)} ฿`} />
        </div>
      </div>

      {daysRecorded === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>ยังไม่มีข้อมูลยอดขายในเดือนนี้</p>
      )}
    </div>
  );
}

function Kpi({ label, value, color }) {
  const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
  return (
    <div style={{ ...cardStyle, marginBottom: 0 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, marginTop: 4 }}>{fmt(value)} ฿</div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

const cardStyle = {
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: 16,
  background: 'var(--surface)',
  marginBottom: 12,
};
