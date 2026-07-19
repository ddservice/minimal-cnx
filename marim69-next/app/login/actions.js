'use server';

import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

// Login ทำงานฝั่งเซิร์ฟเวอร์ทั้งหมด — รหัสผ่านไม่ผ่าน client-side logic ที่แก้ได้
export async function login(prevState, formData) {
  const supabase = await createClient();

  const usernameRaw = String(formData.get('username') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');

  if (!usernameRaw || !password) {
    return { error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
  }

  // ระบบเดิมใช้ email แบบ <username>@marim69.internal
  const email = usernameRaw.includes('@')
    ? usernameRaw
    : `${usernameRaw}@marim69.internal`;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  }

  // เช็กว่าบัญชียังใช้งานได้อยู่ก่อนปล่อยผ่าน — ถ้าถูกปิดใช้งาน (is_active=false) ให้เซ็นเอาต์ทันที
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    return { error: 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ' };
  }

  redirect('/dashboard');
}
