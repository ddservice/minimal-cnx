import Icon from '../../components/icon';
import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import PageHeader from '../../components/page-header';
import LoyaltyClient from './loyalty-client';
import Link from 'next/link';
import { loadActiveRewards } from '../../lib/loyalty-rewards';

export default async function LoyaltyPage() {
  const { supabase, role, name, isAdmin, allowed, user } = await requireSession();

  const [{ data: branches }, { data: staffProfile }, rewards] = await Promise.all([
    supabase
      .from('branches')
      .select('id, code, name')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('staff_profiles')
      .select('branch_id, staff_code')
      .eq('user_id', user.id)
      .maybeSingle(),
    loadActiveRewards(supabase),
  ]);

  const canManage = isAdmin || role === 'co-admin';
  const canAnalytics = canManage || role === 'manager';
  const canVoid = canAnalytics;
  const canPickBranch = canAnalytics; // staff ใช้ได้แค่สาขาที่ผูก
  const staffLinked = !!staffProfile?.branch_id;

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-gift" title="ระบบสะสมแต้ม (Loyalty System)">
        <Link href="/loyalty/history" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <Icon name="ti-history" /> ประวัติธุรกรรม
        </Link>
        {canManage && (
          <Link href="/admin/loyalty" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <Icon name="ti-settings" /> ตั้งค่าสาขา
          </Link>
        )}
        {canAnalytics && (
          <Link href="/loyalty/analytics" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <Icon name="ti-chart-bar" /> แดชบอร์ดวิเคราะห์ (CDP)
          </Link>
        )}
      </PageHeader>

      <LoyaltyClient
        branches={branches || []}
        rewards={rewards}
        defaultBranchId={staffProfile?.branch_id || ''}
        staffLinked={staffLinked}
        staffCode={staffProfile?.staff_code || ''}
        canVoid={canVoid}
        canPickBranch={canPickBranch}
      />
    </AppShell>
  );
}
