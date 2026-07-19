import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import PageHeader from '../../components/page-header';
import { fmtMoney } from '../../lib/format';
import { OPEX_ALL_CATEGORIES } from '../../lib/opex';
import ProfitChart from './profit-chart';

const MONTHS = 12;

function lastMonths(n) {
  const out = [];
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  for (let i = 0; i < n; i++) {
    out.unshift({ label: `${String(m).padStart(2, '0')}/${y}` });
    m--; if (m < 1) { m = 12; y--; }
  }
  return out;
}

function summarize(summary) {
  const sales = summary?.sales || [];
  const expenses = summary?.expenses || [];
  const income = sales.reduce((a, s) => a + Number(s.net_revenue || 0), 0);
  const reg = expenses.filter((e) => !e.item_key).reduce((a, e) => a + Number(e.total_amount || 0), 0);
  const opex = expenses.filter((e) => e.item_key && OPEX_ALL_CATEGORIES.includes(e.category)).reduce((a, e) => a + Number(e.total_amount || 0), 0);
  const exp = reg + opex;
  return { income, exp, profit: income - exp, hasData: sales.length > 0 || expenses.length > 0 };
}

const pct = (cur, prev) => (prev ? ((cur - prev) / Math.abs(prev)) * 100 : null);

export default async function AnalyticsPage() {
  const { supabase, role, name, isAdmin } = await requireSession();

  const months = lastMonths(MONTHS);
  const results = await Promise.all(
    months.map(async (mo) => {
      const { data } = await supabase.rpc('get_monthly_summary', { p_month_label: mo.label });
      return { label: mo.label, ...summarize(data) };
    })
  );

  const withData = results.filter((r) => r.hasData);
  const totalProfit = withData.reduce((a, r) => a + r.profit, 0);
  const avgProfit = withData.length ? totalProfit / withData.length : 0;
  // ใหม่ล่าสุดก่อนในตาราง
  const tableRows = [...results].reverse();

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin}>
      <PageHeader icon="ti-chart-line" title="วิเคราะห์ (ย้อนหลัง 12 เดือน)" />

      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label"><i className="ti ti-calendar-stats" /> เดือนที่มีข้อมูล</div>
          <div className="kpi-val">{withData.length}</div>
          <div className="kpi-sub">จาก {MONTHS} เดือน</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><i className="ti ti-sum" /> กำไรรวม</div>
          <div className={`kpi-val ${totalProfit >= 0 ? 'blue' : 'red'}`}>{fmtMoney(totalProfit)}</div>
          <div className="kpi-sub">บาท</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><i className="ti ti-scale" /> กำไรเฉลี่ย/เดือน</div>
          <div className={`kpi-val ${avgProfit >= 0 ? 'green' : 'red'}`}>{fmtMoney(avgProfit)}</div>
          <div className="kpi-sub">บาท</div>
        </div>
      </div>

      <ProfitChart data={results} />

      <div className="card">
        <div className="card-head"><i className="ti ti-table" /><h2>ตารางเปรียบเทียบรายเดือน</h2></div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 460 }}>
            <thead>
              <tr style={{ textAlign: 'right', color: 'var(--muted)' }}>
                <th style={{ ...th, textAlign: 'left' }}>เดือน</th>
                <th style={th}>รายรับ</th>
                <th style={th}>รายจ่าย</th>
                <th style={th}>กำไร</th>
                <th style={th}>MoM</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => {
                const prev = tableRows[i + 1];
                const mom = r.hasData && prev?.hasData ? pct(r.profit, prev.profit) : null;
                return (
                  <tr key={r.label} style={{ borderTop: '1px solid var(--border)', opacity: r.hasData ? 1 : 0.45 }}>
                    <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>{r.label}</td>
                    <td style={tdNum}>{fmtMoney(r.income)}</td>
                    <td style={tdNum}>{fmtMoney(r.exp)}</td>
                    <td style={{ ...tdNum, color: r.profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{fmtMoney(r.profit)}</td>
                    <td style={{ ...tdNum, color: mom == null ? 'var(--muted)' : mom >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {mom == null ? '—' : `${mom >= 0 ? '+' : ''}${mom.toFixed(0)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

const th = { padding: '7px 8px', fontWeight: 600 };
const td = { padding: '8px' };
const tdNum = { padding: '8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
