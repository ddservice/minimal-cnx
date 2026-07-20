import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import PageHeader from '../../components/page-header';
import { fmtMoney } from '../../lib/format';
import { monthInputToLabel, currentMonthInput, OPEX_ALL_CATEGORIES } from '../../lib/opex';
import MonthPicker from './month-picker';
import RevenueChart from './revenue-chart';
import ExpenseChart from './expense-chart';
import DataTable from '../../components/data-table';

export default async function ReportsPage({ searchParams }) {
  const { supabase, role, name, isAdmin, allowed } = await requireSession();

  const sp = await searchParams;
  const monthInput = /^\d{4}-\d{2}$/.test(sp?.month || '') ? sp.month : currentMonthInput();
  const monthLabel = monthInputToLabel(monthInput);

  const { data: summary } = await supabase.rpc('get_monthly_summary', { p_month_label: monthLabel });
  const sales = summary?.sales || [];
  const expenses = summary?.expenses || [];

  const income = sales.reduce((a, s) => a + Number(s.net_revenue || 0), 0);
  const catSum = (c) =>
    expenses.filter((e) => !e.item_key && e.category === c).reduce((a, e) => a + Number(e.total_amount || 0), 0);
  const matTotal = catSum('ต้นทุนวัตถุดิบ');
  const bakTotal = catSum('ต้นทุนขนมหน้าร้าน');
  const miscTotal = catSum('รายจ่ายจิปาถะ');
  const opexTotal = expenses
    .filter((e) => e.item_key && OPEX_ALL_CATEGORIES.includes(e.category))
    .reduce((a, e) => a + Number(e.total_amount || 0), 0);
  const totalExp = matTotal + bakTotal + miscTotal + opexTotal;
  const profit = income - totalExp;

  const totalCups = sales.reduce((a, s) => a + Number(s.total_cups || 0), 0);
  const pastryRev = sales.reduce((a, s) => a + Number(s.pastry_revenue || 0), 0);
  const daysRecorded = sales.length;

  const expRows = [
    { label: 'ต้นทุนวัตถุดิบ', v: matTotal },
    { label: 'ต้นทุนขนม', v: bakTotal },
    { label: 'รายจ่ายจิปาถะ', v: miscTotal },
    { label: 'ค่าดำเนินการ (OPEX)', v: opexTotal },
    { label: 'รวมรายจ่าย', v: totalExp, total: true },
  ];
  const expCols = [
    { key: 'label', label: 'หมวด', render: (r) => <span style={{ fontWeight: r.total ? 700 : 400 }}>{r.label}</span> },
    { key: 'v', label: 'จำนวนเงิน', align: 'right', render: (r) => (
      <strong style={{ fontWeight: r.total ? 700 : 600, color: r.total ? 'var(--danger)' : 'var(--text)' }}>{fmtMoney(r.v)} ฿</strong>
    ) },
  ];

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-chart-bar" title="สรุปรายเดือน">
        <MonthPicker value={monthInput} />
        <a className="link-btn" href={`/export?month=${monthInput}`}>
          <i className="ti ti-download" /> Excel
        </a>
      </PageHeader>

      <div className="kpis">
        <Kpi label="รายรับสุทธิ (หัก GP)" value={income} cls="green" icon="ti-trending-up" />
        <Kpi label="รายจ่ายรวม" value={totalExp} cls="red" icon="ti-trending-down" />
        <Kpi label={profit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'} value={profit} cls={profit >= 0 ? 'blue' : 'red'} icon="ti-scale" />
      </div>

      <RevenueChart sales={sales} />
      <ExpenseChart mat={matTotal} bak={bakTotal} misc={miscTotal} opex={opexTotal} />

      <div className="card">
        <div className="card-head"><i className="ti ti-list-details" /><h2>รายจ่ายแยกหมวด — {monthLabel}</h2></div>
        <div className="card-body">
          <DataTable columns={expCols} rows={expRows} rowKey={(r) => r.label} />
        </div>
      </div>

      <div className="card">
        <div className="card-head"><i className="ti ti-cup" /><h2>สถิติการขาย</h2></div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <Mini label="วันที่บันทึก" value={`${daysRecorded} วัน`} />
          <Mini label="ยอดขายรวม" value={`${fmtMoney(totalCups)} แก้ว`} />
          <Mini label="รายได้ขนม" value={`${fmtMoney(pastryRev)} ฿`} />
        </div>
      </div>

      {daysRecorded === 0 && <p className="muted" style={{ fontSize: 13 }}>ยังไม่มีข้อมูลยอดขายในเดือนนี้</p>}
    </AppShell>
  );
}

function Kpi({ label, value, cls, icon }) {
  return (
    <div className="kpi">
      <div className="kpi-label"><i className={`ti ${icon}`} /> {label}</div>
      <div className={`kpi-val ${cls}`}>{fmtMoney(value)}</div>
      <div className="kpi-sub">บาท</div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}
