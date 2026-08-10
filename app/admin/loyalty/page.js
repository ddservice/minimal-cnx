import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import AppShell from '../../../components/app-shell';
import PageHeader from '../../../components/page-header';
import LoyaltyAdmin from './loyalty-admin';

export default async function AdminLoyaltyPage() {
  const { supabase, role, name, isAdmin, allowed } = await requireSession();
  if (role !== 'admin' && role !== 'co-admin') redirect('/dashboard');

  const [{ data: branches }, { data: staffProfiles }, { data: users }] = await Promise.all([
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
  ]);

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-gift" title="ตั้งค่าสะสมแต้ม">
        <Link className="link-btn" href="/admin"><i className="ti ti-users" /> ผู้ใช้งาน</Link>
        <Link className="link-btn" href="/loyalty"><i className="ti ti-arrow-left" /> หน้าสะสมแต้ม</Link>
      </PageHeader>
      <LoyaltyAdmin
        branches={branches || []}
        staffProfiles={staffProfiles || []}
        users={users || []}
      />
    </AppShell>
  );
}
