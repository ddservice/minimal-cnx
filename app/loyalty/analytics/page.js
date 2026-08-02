import { requireSession } from '../../../lib/session';
import AppShell from '../../../components/app-shell';
import PageHeader from '../../../components/page-header';
import Kpi from '../../../components/kpi';
import DataTable from '../../../components/data-table';
import { getLoyaltyAnalyticsAction } from '../actions';
import PointDistributionChart from './distribution-chart';
import Link from 'next/link';

export default async function LoyaltyAnalyticsPage() {
  const { supabase, role, name, isAdmin, allowed } = await requireSession();

  const res = await getLoyaltyAnalyticsAction();
  const { transactions = [], customers = [], branches = [], auditLogs = [] } = res?.data || {};

  // 1. คำนวณ KPI รวม
  const totalIssued = transactions.filter((t) => t.points > 0).reduce((a, t) => a + t.points, 0);
  const totalRedeemed = Math.abs(transactions.filter((t) => t.points < 0).reduce((a, t) => a + t.points, 0));
  const activeCustomers = customers.length;
  const fraudAlertsCount = auditLogs.filter((l) => l.action_type?.startsWith('FRAUD_ALERT')).length;

  // 2. แยกแต้มตามสาขา
  const branchMap = {};
  branches.forEach((b) => { branchMap[b.id] = { name: b.name, issued: 0, redeemed: 0 }; });
  transactions.forEach((t) => {
    if (t.branch_id && branchMap[t.branch_id]) {
      if (t.points > 0) branchMap[t.branch_id].issued += t.points;
      else branchMap[t.branch_id].redeemed += Math.abs(t.points);
    }
  });
  const branchMetrics = Object.values(branchMap);

  // 3. ผลงานพนักงานและการตรวจสอบการแจกแต้ม (Staff Performance)
  const staffMap = {};
  transactions.forEach((t) => {
    const sName = t.profiles?.full_name || t.profiles?.nickname || 'บาริสต้า/พนักงาน';
    const sId = t.staff_id || 'unknown';
    if (!staffMap[sId]) staffMap[sId] = { id: sId, name: sName, issued: 0, redeemed: 0, txCount: 0 };
    if (t.points > 0) staffMap[sId].issued += t.points;
    else staffMap[sId].redeemed += Math.abs(t.points);
    staffMap[sId].txCount += 1;
  });
  const staffRows = Object.values(staffMap).sort((a, b) => b.issued - a.issued);

  // 4. กลุ่มลูกค้า CDP (RFM Segments Breakdown)
  const rfmCounts = { Champions: 0, Loyal: 0, Potential: 0, 'At-Risk': 0, Lost: 0, New: 0 };
  customers.forEach((c) => {
    const seg = c.rfm_segment || 'New';
    rfmCounts[seg] = (rfmCounts[seg] || 0) + 1;
  });

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-chart-bar" title="แดชบอร์ดวิเคราะห์สถิติแต้ม & CDP">
        <Link href="/loyalty" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'gap', textDecoration: 'none' }}>
          <i className="ti ti-arrow-left" /> กลับหน้าสะสมแต้ม
        </Link>
      </PageHeader>

      {/* KPI Tiles */}
      <div className="kpis">
        <Kpi icon="ti-gift" label="แต้มสะสมทั้งหมดที่แจก" value={totalIssued.toLocaleString()} sub="แต้ม" cls="green" />
        <Kpi icon="ti-trophy" label="แต้มที่ถูกแลกใช้งาน" value={totalRedeemed.toLocaleString()} sub="แต้ม" cls="blue" />
        <Kpi icon="ti-users" label="สมาชิกทั้งหมด" value={activeCustomers.toLocaleString()} sub="คน" plain />
        <Kpi icon="ti-alert-triangle" label="การแจ้งเตือนสุ่มเสี่ยง (Anti-Fraud)" value={fraudAlertsCount.toLocaleString()} sub="ครั้ง" cls={fraudAlertsCount > 0 ? 'red' : 'green'} />
      </div>

      {/* กราฟแจก vs แลกแต้มแยกตามสาขา */}
      <div className="card">
        <div className="card-head">
          <i className="ti ti-chart-bar" /> <h2>สถิติการแจก vs แลกแต้ม แยกตามสาขา (Branch Distribution)</h2>
        </div>
        <div className="card-body">
          <PointDistributionChart branchMetrics={branchMetrics} />
        </div>
      </div>

      {/* กลุ่มพฤติกรรมลูกค้า (CDP / RFM Segmentation) */}
      <div className="card">
        <div className="card-head">
          <i className="ti ti-user-check" /> <h2>การแบ่งกลุ่มลูกค้าตามพฤติกรรม (AI CDP / RFM Segments)</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <RfmTile label="Champions (ลูกค้าประจำชื่นชอบมาก)" count={rfmCounts.Champions} color="#16a34a" />
            <RfmTile label="Loyal (ลูกค้ามาสม่ำเสมอ)" count={rfmCounts.Loyal} color="#2563eb" />
            <RfmTile label="Potential (มีโอกาสเป็นลูกค้าประจำ)" count={rfmCounts.Potential} color="#d97706" />
            <RfmTile label="At-Risk (เริ่มห่างหาย >30 วัน)" count={rfmCounts['At-Risk']} color="#dc2626" />
            <RfmTile label="Lost (ขาดยาว >60 วัน)" count={rfmCounts.Lost} color="#6b7280" />
            <RfmTile label="New (สมาชิกใหม่)" count={rfmCounts.New} color="#8b5cf6" />
          </div>
        </div>
      </div>

      {/* รายงานผลงานพนักงาน (Staff Performance & Fraud Audit) */}
      <div className="card">
        <div className="card-head">
          <i className="ti ti-user-star" /> <h2>รายงานการออกแต้มแยกตามบาริสต้า/พนักงาน (Staff Performance)</h2>
        </div>
        <div className="card-body">
          <DataTable
            rows={staffRows}
            rowKey={(r) => r.id}
            emptyText="ยังไม่มีข้อมูลการออกแต้มของพนักงาน"
            columns={[
              { key: 'name', label: 'พนักงาน / บาริสต้า' },
              { key: 'txCount', label: 'จำนวนรายการทำ', align: 'right', render: (r) => `${r.txCount} รายการ` },
              { key: 'issued', label: 'แต้มที่แจก (+Earned)', align: 'right', render: (r) => <strong style={{ color: '#16a34a' }}>+{r.issued.toLocaleString()}</strong> },
              { key: 'redeemed', label: 'แต้มที่แลก (-Redeemed)', align: 'right', render: (r) => <strong style={{ color: '#ea580c' }}>-{r.redeemed.toLocaleString()}</strong> },
            ]}
          />
        </div>
      </div>

      {/* บันทึก Audit Log ป้องกันทุจริตล่าสุด */}
      <div className="card">
        <div className="card-head">
          <i className="ti ti-shield-alert" /> <h2>บันทึกตรวจสอบย้อนหลังล่าสุด (Anti-Fraud Audit Logs)</h2>
        </div>
        <div className="card-body">
          <DataTable
            rows={auditLogs}
            rowKey={(r) => r.id}
            emptyText="ยังไม่มีรายการบันทึก Audit"
            columns={[
              { key: 'created_at', label: 'เวลา', render: (r) => new Date(r.created_at).toLocaleString('th-TH') },
              {
                key: 'action_type',
                label: 'ประเภทแอ็กชัน',
                render: (r) => (
                  <span
                    style={{
                      fontWeight: 700,
                      color: r.action_type.startsWith('FRAUD_ALERT') ? '#dc2626' : 'var(--color-primary)',
                    }}
                  >
                    {r.action_type}
                  </span>
                ),
              },
              { key: 'staff', label: 'พนักงานผู้ทำรายการ', render: (r) => r.profiles?.full_name || r.profiles?.nickname || 'ระบบ' },
              { key: 'details', label: 'รายละเอียด', render: (r) => JSON.stringify(r.details) },
            ]}
          />
        </div>
      </div>
    </AppShell>
  );
}

function RfmTile({ label, count, color }) {
  return (
    <div style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{count || 0} <span style={{ fontSize: 12, fontWeight: 600 }}>คน</span></div>
    </div>
  );
}
