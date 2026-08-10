import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import PageHeader from '../../components/page-header';
import LoyaltyClient from './loyalty-client';
import Link from 'next/link';

export default async function LoyaltyPage() {
  const { supabase, role, name, isAdmin, allowed, user } = await requireSession();

  const [{ data: branches }, { data: staffProfile }] = await Promise.all([
    supabase
      .from('branches')
      .select('id, code, name')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('staff_profiles')
      .select('branch_id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const canManage = isAdmin || role === 'co-admin';
  const canAnalytics = canManage || role === 'manager';

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-gift" title="ระบบสะสมแต้ม (Loyalty System)">
        {canManage && (
          <Link href="/admin/loyalty" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <i className="ti ti-settings" /> ตั้งค่าสาขา
          </Link>
        )}
        {canAnalytics && (
          <Link href="/loyalty/analytics" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <i className="ti ti-chart-bar" /> แดชบอร์ดวิเคราะห์ (CDP)
          </Link>
        )}
      </PageHeader>

      <LoyaltyClient
        branches={branches || []}
        defaultBranchId={staffProfile?.branch_id || ''}
      />
    </AppShell>
  );
}
