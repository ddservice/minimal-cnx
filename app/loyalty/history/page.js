import Icon from '../../../components/icon';
import Link from 'next/link';
import { requirePage } from '../../../lib/session';
import AppShell from '../../../components/app-shell';
import PageHeader from '../../../components/page-header';
import HistoryClient from './history-client';

export default async function LoyaltyHistoryPage() {
  const { supabase, role, name, isAdmin, allowed, user, caps } = await requirePage('/loyalty');
  const canVoid = !!caps['/loyalty']?.edit && (role === 'admin' || role === 'co-admin' || role === 'manager');

  const [{ data: branches }, { data: staffProfiles }, { data: myStaff }] = await Promise.all([
    supabase.from('branches').select('id, code, name').eq('is_active', true).order('name'),
    supabase
      .from('staff_profiles')
      .select('user_id, staff_code, profiles(full_name, nickname)')
      .order('staff_code'),
    supabase.from('staff_profiles').select('branch_id').eq('user_id', user.id).maybeSingle(),
  ]);

  const staffOptions = (staffProfiles || []).map((sp) => ({
    id: sp.user_id,
    label: `${sp.profiles?.full_name || sp.profiles?.nickname || sp.user_id} (${sp.staff_code})`,
  }));

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-history" title="ประวัติธุรกรรมสะสมแต้ม">
        <Link href="/loyalty" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <Icon name="ti-arrow-left" /> หน้าสะสมแต้ม
        </Link>
        {(isAdmin || role === 'co-admin' || role === 'manager') && (
          <Link href="/loyalty/analytics" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <Icon name="ti-chart-bar" /> แดชบอร์ด CDP
          </Link>
        )}
      </PageHeader>

      <HistoryClient
        branches={branches || []}
        staffOptions={staffOptions}
        canVoid={canVoid}
        initialBranchId={myStaff?.branch_id || ''}
      />
    </AppShell>
  );
}
