import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import PageHeader from '../../components/page-header';
import UserManager from './user-manager';

export default async function AdminPage() {
  const { supabase, role, name, isAdmin, allowed, profile } = await requireSession();
  if (!isAdmin) redirect('/dashboard');

  const { data: users } = await supabase
    .from('profiles')
    .select('username, full_name, nickname, role, is_active')
    .order('created_at');

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-users" title="จัดการผู้ใช้งาน">
        <Link className="link-btn" href="/admin/audit"><i className="ti ti-history" /> ประวัติการแก้ไข</Link>
      </PageHeader>
      <UserManager initialUsers={users || []} myUsername={profile?.username} />
    </AppShell>
  );
}
