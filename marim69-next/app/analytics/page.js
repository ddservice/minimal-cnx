import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import PageHeader from '../../components/page-header';
import { fmtMoney } from '../../lib/format';
import { OPEX_ALL_CATEGORIES } from '../../lib/opex';
import ProfitChart from './profit-chart';
import RangePicker from './range-picker';

const MATERIAL_CATEGORY = 'ต้นทุนวัตถุดิบ';
const isMonth = (s) => /^\d{4}-\d{2}$/.test(s || '');

function monthsBetween(from, to) {
  let [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  const out = [];
  let guard = 0;
  while ((fy < ty || (fy === ty && fm <= tm)) && guard < 60) {
    out.push({ label: `${String(fm).padStart(2, '0')}/${fy}`, input: `${fy}-${String(fm).padStart(2, '0')}` });
    fm++; if (fm > 12) { fm = 1; fy++; }
    guard++;
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

export default async function AnalyticsPage({ searchParams }) {
  const { supabase, role, name, isAdmin, allowed } = await requireSession();
  const sp = await searchParams;

  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const curInput = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let from = isMonth(sp?.from) ? sp.from : `${now.getFullYear()}-01`; // ค่าเริ่มต้น = ปีปัจจุบัน
  let to = isMonth(sp?.to) ? sp.to : curInput;
  if (from > to) [from, to] = [to, from];

  const months = monthsBetween(from, to);
  const results = await Promise.all(
    months.map(async (mo) => {
      const { data } = await supabase.rpc('get_monthly_summary', { p_month_label: mo.label });
      return { label: mo.label, data, ...summarize(data) };
    })
  );

  // ── รวมข้อมูลวัตถุดิบทั้งช่วง ──
  const matAgg = {};   // ชื่อ → { total, count }
  const supAgg = {};   // ซัพพลายเออร์ → total
  results.forEach((r) => {
    (r.data?.expenses || [])
      .filter((e) => !e.item_key && e.category === MATERIAL_CATEGORY)
      .forEach((e) => {
        const nm = (e.item_name || '').trim();
        if (nm) {
          matAgg[nm] = matAgg[nm] || { total: 0, count: 0 };
          matAgg[nm].total += Number(e.total_amount || 0);
          matAgg[nm].count += 1;
        }
        const sup = (e.subcategory || '').trim();
        if (sup) supAgg[sup] = (supAgg[sup] || 0) + Number(e.total_amount || 0);
      });
  });
  const topSpend = Object.entries(matAgg).map(([n, v]) => ({ n, ...v })).sort((a, b) => b.total - a.total).slice(0, 8);
  const topOrders = Object.entries(matAgg).map(([n, v]) => ({ n, ...v })).sort((a, b) => b.count - a.count).slice(0, 8);
  const topSup = Object.entries(supAgg).map(([n, total]) => ({ n, total })).sort((a, b) => b.total - a.total).slice(0, 6);

  const withData = results.filter((r) => r.hasData);
  const totalProfit = withData.reduce((a, r) => a + r.profit, 0);
  const avgProfit = withData.length ? totalProfit / withData.length : 0;
  const best = withData.slice().sort((a, b) => b.profit - a.profit)[0];
  const tableRows = [...results].reverse();

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-chart-line" title="วิเคราะห์">
        <RangePicker from={from} to={to} />
      </PageHeader>

      <div className="kpis">
        <Kpi icon="ti-calendar-stats" label="ช่วงที่เลือก" val={`${withData.length}/${months.length}`} sub="เดือนที่มีข้อมูล" plain />
        <Kpi icon="ti-sum" label="กำไรรวม" val={fmtMoney(totalProfit)} sub="บาท" cls={totalProfit >= 0 ? 'blue' : 'red'} />
        <Kpi icon="ti-scale" label="กำไรเฉลี่ย/เดือน" val={fmtMoney(avgProfit)} sub="บาท" cls={avgProfit >= 0 ? 'green' : 'red'} />
        <Kpi icon="ti-trophy" label="เดือนกำไรสูงสุด" val={best ? best.label : '—'} sub={best ? `${fmtMoney(best.profit)} ฿` : ''} plain />
      </div>

      <ProfitChart data={results} />

      {/* วัตถุดิบใช้เยอะสุด */}
      <div className="card">
        <div className="card-head"><i className="ti ti-package" /><h2>วัตถุดิบใช้จ่ายเยอะสุด (ตามยอดเงิน)</h2></div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {topSpend.length ? (
            <table style={tbl}>
              <thead><tr style={thr}><th style={{ ...th, textAlign: 'left' }}>#</th><th style={{ ...th, textAlign: 'left' }}>รายการ</th><th style={th}>ยอดรวม</th><th style={th}>จำนวนครั้ง</th></tr></thead>
              <tbody>
                {topSpend.map((m, i) => (
                  <tr key={m.n} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={td}>{i + 1}</td>
                    <td style={td}>{m.n}</td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>{fmtMoney(m.total)} ฿</td>
                    <td style={tdNum}>{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted" style={{ fontSize: 13, margin: 0 }}>ยังไม่มีข้อมูลวัตถุดิบในช่วงนี้</p>}
        </div>
      </div>

      {/* สั่งบ่อยสุด + ซัพพลายเออร์ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div className="card">
          <div className="card-head"><i className="ti ti-shopping-cart" /><h2>สั่งซื้อบ่อยสุด (จำนวนครั้ง)</h2></div>
          <div className="card-body">
            {topOrders.length ? topOrders.map((m, i) => (
              <div key={m.n} style={rankRow}><span>{i + 1}. {m.n}</span><strong>{m.count} ครั้ง</strong></div>
            )) : <p className="muted" style={{ fontSize: 13, margin: 0 }}>—</p>}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><i className="ti ti-building-warehouse" /><h2>ซัพพลายเออร์ยอดสูงสุด</h2></div>
          <div className="card-body">
            {topSup.length ? topSup.map((s, i) => (
              <div key={s.n} style={rankRow}><span>{i + 1}. {s.n}</span><strong>{fmtMoney(s.total)} ฿</strong></div>
            )) : <p className="muted" style={{ fontSize: 13, margin: 0 }}>—</p>}
          </div>
        </div>
      </div>

      {/* ตารางรายเดือน */}
      <div className="card">
        <div className="card-head"><i className="ti ti-table" /><h2>เปรียบเทียบรายเดือน</h2></div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table style={{ ...tbl, minWidth: 460 }}>
            <thead>
              <tr style={thr}>
                <th style={{ ...th, textAlign: 'left' }}>เดือน</th><th style={th}>รายรับ</th><th style={th}>รายจ่าย</th><th style={th}>กำไร</th><th style={th}>MoM</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => {
                const prev = tableRows[i + 1];
                const mom = r.hasData && prev?.hasData ? pct(r.profit, prev.profit) : null;
                return (
                  <tr key={r.label} style={{ borderTop: '1px solid var(--border)', opacity: r.hasData ? 1 : 0.45 }}>
                    <td style={{ ...td, fontWeight: 600 }}>{r.label}</td>
                    <td style={tdNum}>{fmtMoney(r.income)}</td>
                    <td style={tdNum}>{fmtMoney(r.exp)}</td>
                    <td style={{ ...tdNum, color: r.profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{fmtMoney(r.profit)}</td>
                    <td style={{ ...tdNum, color: mom == null ? 'var(--muted)' : mom >= 0 ? 'var(--success)' : 'var(--danger)' }}>{mom == null ? '—' : `${mom >= 0 ? '+' : ''}${mom.toFixed(0)}%`}</td>
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

function Kpi({ icon, label, val, sub, cls, plain }) {
  return (
    <div className="kpi">
      <div className="kpi-label"><i className={`ti ${icon}`} /> {label}</div>
      <div className={`kpi-val ${plain ? '' : cls || ''}`} style={plain ? { fontSize: 20 } : undefined}>{val}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

const tbl = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thr = { textAlign: 'right', color: 'var(--muted)' };
const th = { padding: '7px 8px', fontWeight: 600, textAlign: 'right' };
const td = { padding: '8px' };
const tdNum = { padding: '8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const rankRow = { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderTop: '1px solid var(--border)', fontSize: 13 };
