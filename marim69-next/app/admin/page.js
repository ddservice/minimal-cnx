import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';
import UserManager from './user-manager';

// หน้าจัดการผู้ใช้ — เฉพาะ admin (guard ฝั่งเซิร์ฟเวอร์)
export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // ไม่ใช่ admin → เด้งกลับ dashboard (การซ่อน UI ไม่พอ — RLS/RPC กันซ้ำอยู่แล้ว)
  if (me?.role !== 'admin') redirect('/dashboard');

  // RLS บน profiles อนุญาตให้ admin เห็นทุกแถว
  const { data: users } = await supabase
    .from('profiles')
    .select('username, full_name, nickname, role, is_active')
    .order('created_at');

  return (
    <div className="wrap">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>จัดการผู้ใช้งาน</h1>
        <Link className="link-btn" href="/dashboard">
          ← กลับ Dashboard
        </Link>
      </div>

      <UserManager initialUsers={users || []} />
    </div>
  );
}
