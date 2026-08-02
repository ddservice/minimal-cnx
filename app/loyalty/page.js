import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import PageHeader from '../../components/page-header';
import LoyaltyClient from './loyalty-client';
import Link from 'next/link';

export default async function LoyaltyPage() {
  const { supabase, role, name, isAdmin, allowed } = await requireSession();

  // ดึงรายชื่อสาขาสำหรับให้พนักงานเลือก
  const { data: branches } = await supabase
    .from('branches')
    .select('id, code, name')
    .eq('is_active', true)
    .order('name');

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-gift" title="ระบบสะสมแต้ม (Loyalty System)">
        {(isAdmin || role === 'co-admin' || role === 'manager') && (
          <Link href="/loyalty/analytics" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <i className="ti ti-chart-bar" /> แดชบอร์ดวิเคราะห์ (CDP)
          </Link>
        )}
      </PageHeader>

      <LoyaltyClient branches={branches || []} />
    </AppShell>
  );
}
