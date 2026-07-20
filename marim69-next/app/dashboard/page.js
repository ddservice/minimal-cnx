import Link from 'next/link';
import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import Kpi from '../../components/kpi';
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
  const { supabase, role, name, isAdmin, allowed } = await requireSession();
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
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <div className="kpis">
        <Kpi icon="ti-trending-up" label="รายรับเดือนนี้" value={fmtMoney(income)} sub={`บาท (หัก GP) · ${ml}`} cls="green" />
        <Kpi icon="ti-trending-down" label="รายจ่ายเดือนนี้" value={fmtMoney(totalExp)} sub="บาท" cls="red" />
        <Kpi icon="ti-scale" label={profit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'} value={fmtMoney(profit)} sub="บาท / เดือน" cls={profit >= 0 ? 'blue' : 'red'} />
        <Kpi icon="ti-cup" label="ยอดขายรวม" value={fmtMoney(totalCups)} sub="แก้ว" />
        <Kpi icon="ti-cookie" label="ขนม" value={fmtMoney(pastryPieces)} sub="ชิ้น" />
        <Kpi icon="ti-gift" label="แก้วฟรี" value={fmtMoney(freeCups)} sub="แก้ว" />
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
