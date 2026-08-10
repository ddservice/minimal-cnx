import Icon from '../../../components/icon';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import AppShell from '../../../components/app-shell';
import PageHeader from '../../../components/page-header';
import LoyaltyAdmin from './loyalty-admin';

export default async function AdminLoyaltyPage() {
  const { supabase, role, name, isAdmin, allowed } = await requireSession();
  if (role !== 'admin' && role !== 'co-admin') redirect('/dashboard');

  const [{ data: branches }, { data: staffProfiles }, { data: users }, { data: rewards }] = await Promise.all([
    supabase.from('branches').select('id, code, name, location, is_active').order('code'),
    supabase
      .from('staff_profiles')
      .select('id, staff_code, role, user_id, branch_id, profiles(full_name, username, nickname), branches(name, code)')
      .order('staff_code'),
    supabase
      .from('profiles')
      .select('id, username, full_name, nickname, role, is_active')
      .or('is_active.eq.true,is_active.is.null')
      .order('full_name'),
    supabase
      .from('loyalty_rewards')
      .select('id, name, points, icon, is_active, sort_order')
      .order('sort_order')
      .order('id'),
  ]);

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-building-store" title="ตั้งค่าสาขา / พนักงาน / ของรางวัล">
        <Link className="link-btn" href="/loyalty"><Icon name="ti-gift" /> หน้าสะสมแต้ม</Link>
        <Link className="link-btn" href="/admin"><Icon name="ti-users" /> ผู้ใช้งาน</Link>
      </PageHeader>
      <LoyaltyAdmin
        branches={branches || []}
        staffProfiles={staffProfiles || []}
        users={users || []}
        rewards={rewards || []}
      />
    </AppShell>
  );
}
