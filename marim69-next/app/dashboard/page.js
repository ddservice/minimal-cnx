import Link from 'next/link';
import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import { fmtMoney } from '../../lib/format';
import { OPEX_ALL_CATEGORIES } from '../../lib/opex';

function monthLabel() {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const ACTIONS = [
  { href: '/sales', label: 'บันทึกยอดขาย', icon: 'ti-cash', desc: 'ยอดขายรายวัน + delivery' },
  { href: '/expenses', label: 'บันทึกรายจ่าย', icon: 'ti-receipt', desc: 'วัตถุดิบ / ขนม / จิปาถะ' },
  { href: '/opex', label: 'ค่าดำเนินการ', icon: 'ti-building-store', desc: 'ค่าเช่า / พนักงาน / ภาษี' },
  { href: '/reports', label: 'สรุปรายเดือน', icon: 'ti-chart-bar', desc: 'รายรับ-รายจ่าย + กราฟ' },
];

export default async function DashboardPage() {
  const { supabase, role, name, isAdmin } = await requireSession();
  const ml = monthLabel();

  const { data: summary } = await supabase.rpc('get_monthly_summary', { p_month_label: ml });
  const sales = summary?.sales || [];
  const expenses = summary?.expenses || [];

  const income = sales.reduce((a, s) => a + Number(s.net_revenue || 0), 0);
  const regExp = expenses
    .filter((e) => !e.item_key)
    .reduce((a, e) => a + Number(e.total_amount || 0), 0);
  const opexExp = expenses
    .filter((e) => e.item_key && OPEX_ALL_CATEGORIES.includes(e.category))
    .reduce((a, e) => a + Number(e.total_amount || 0), 0);
  const totalExp = regExp + opexExp;
  const profit = income - totalExp;
  const totalCups = sales.reduce((a, s) => a + Number(s.total_cups || 0), 0);
  const pastryPieces = sales.reduce((a, s) => a + Number(s.pastry_pieces || 0), 0);
  const freeCups = sales.reduce((a, s) => a + Number(s.free_cups || 0), 0);

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin}>
      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label"><i className="ti ti-trending-up" /> รายรับเดือนนี้</div>
          <div className="kpi-val green">{fmtMoney(income)}</div>
          <div className="kpi-sub">บาท (หัก GP) · {ml}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><i className="ti ti-trending-down" /> รายจ่ายเดือนนี้</div>
          <div className="kpi-val red">{fmtMoney(totalExp)}</div>
          <div className="kpi-sub">บาท</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><i className="ti ti-scale" /> {profit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'}</div>
          <div className={`kpi-val ${profit >= 0 ? 'blue' : 'red'}`}>{fmtMoney(profit)}</div>
          <div className="kpi-sub">บาท / เดือน</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><i className="ti ti-cup" /> ยอดขายรวม</div>
          <div className="kpi-val">{fmtMoney(totalCups)}</div>
          <div className="kpi-sub">แก้ว</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><i className="ti ti-cookie" /> ขนม</div>
          <div className="kpi-val">{fmtMoney(pastryPieces)}</div>
          <div className="kpi-sub">ชิ้น</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><i className="ti ti-gift" /> แก้วฟรี</div>
          <div className="kpi-val">{fmtMoney(freeCups)}</div>
          <div className="kpi-sub">แก้ว</div>
        </div>
      </div>

      <div className="card-head" style={{ background: 'transparent', border: 0, padding: '4px 2px 10px' }}>
        <i className="ti ti-bolt" /> <span>เมนูลัด</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="card" style={{ textDecoration: 'none', color: 'inherit', marginBottom: 0 }}>
            <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="brand-icon" style={{ width: 42, height: 42, fontSize: 21, boxShadow: 'none' }}>
                <i className={`ti ${a.icon}`} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{a.label}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{a.desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
