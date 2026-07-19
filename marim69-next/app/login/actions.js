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

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  }

  redirect('/dashboard');
}
