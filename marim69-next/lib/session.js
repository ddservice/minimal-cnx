import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

// ตรวจ session + ดึง profile ครั้งเดียว ใช้ร่วมทุกหน้า (คืน supabase client มาใช้ต่อได้)
export async function requireSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, username, nickname')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role || 'manager';
  return {
    supabase,
    user,
    profile,
    role,
    isAdmin: role === 'admin',
    name: profile?.full_name || profile?.username || 'ผู้ใช้',
  };
}
