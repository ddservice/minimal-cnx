import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import AppShell from '../../../components/app-shell';
import PageHeader from '../../../components/page-header';
import AuditFilters from './audit-filters';
import AuditRow from './audit-row';

const VALID_TABLES = new Set(['sales_daily', 'expenses', 'business_config']);
const VALID_ACTIONS = new Set(['INSERT', 'UPDATE', 'DELETE']);
const LIMIT = 150;

export default async function AuditPage({ searchParams }) {
  const { supabase, role, name, isAdmin, allowed } = await requireSession();
  if (!isAdmin) redirect('/dashboard');

  const sp = await searchParams;
  const table = VALID_TABLES.has(sp?.table) ? sp.table : '';
  const action = VALID_ACTIONS.has(sp?.action) ? sp.action : '';

  let q = supabase
    .from('audit_log')
    .select('id, table_name, record_id, action, old_data, new_data, performed_by, performed_at')
    .order('performed_at', { ascending: false })
    .limit(LIMIT);
  if (table) q = q.eq('table_name', table);
  if (action) q = q.eq('action', action);
  const { data: rows, error } = await q;

  // ดึงชื่อผู้ทำรายการแยก (ไม่พึ่ง embed join เพื่อความชัวร์)
  const userIds = [...new Set((rows || []).map((r) => r.performed_by).filter(Boolean))];
  let profileMap = {};
  if (userIds.length) {
    const { data: profs } = await supabase.from('profiles').select('id, username, full_name').in('id', userIds);
    (profs || []).forEach((p) => { profileMap[p.id] = p; });
  }

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-history" title="ประวัติการแก้ไขข้อมูล (Audit Log)">
        <Link className="link-btn" href="/admin">← กลับหน้าผู้ใช้</Link>
      </PageHeader>

      <div style={{ marginBottom: 12 }}>
        <AuditFilters table={table} action={action} />
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)' }}>
          <div className="card-body" style={{ color: 'var(--danger)', fontSize: 13 }}>
            โหลดข้อมูลไม่สำเร็จ: {error.message}
          </div>
        </div>
      )}

      {!error && (!rows || !rows.length) && (
        <p className="muted" style={{ fontSize: 13 }}>ไม่พบรายการตามเงื่อนไขที่เลือก</p>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {(rows || []).map((r) => (
          <AuditRow key={r.id} row={r} performer={profileMap[r.performed_by]} />
        ))}
      </div>

      {rows?.length === LIMIT && (
        <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
          แสดง {LIMIT} รายการล่าสุด — ใช้ตัวกรองด้านบนเพื่อจำกัดผลลัพธ์
        </p>
      )}
    </AppShell>
  );
}
