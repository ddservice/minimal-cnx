'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';

// ตรวจว่าผู้เรียกเป็น admin จริง (ฝั่งเซิร์ฟเวอร์)
// เป็น defense-in-depth — RPC admin_* ก็เช็ค role ซ้ำใน Postgres อีกชั้น
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  return { supabase, ok: profile?.role === 'admin' };
}

const DENY = { status: 'error', message: 'เฉพาะ Admin เท่านั้น' };

export async function createUserAction(input) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return DENY;

  const username = String(input.username || '').trim().toLowerCase();
  const password = String(input.password || '');
  if (!username) return { status: 'error', message: 'กรุณาระบุชื่อผู้ใช้' };
  if (password.length < 6)
    return { status: 'error', message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' };

  const { data, error } = await supabase.rpc('admin_create_user', {
    p_username: username,
    p_full_name: String(input.full_name || username).trim(),
    p_nickname: String(input.nickname || '').trim(),
    p_password: password,
    p_role: String(input.role || 'staff'),
  });
  if (error) return { status: 'error', message: error.message };
  if (data?.status === 'error') return { status: 'error', message: data.message };

  revalidatePath('/admin');
  return { status: 'ok', message: `สร้างผู้ใช้ "${username}" เรียบร้อย` };
}

export async function updateUserAction(input) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return DENY;

  const username = String(input.username || '').trim();
  if (!username) return { status: 'error', message: 'ไม่พบชื่อผู้ใช้' };

  const upd = {};
  if (input.full_name !== undefined) upd.full_name = String(input.full_name).trim();
  if (input.nickname !== undefined) upd.nickname = String(input.nickname).trim();
  if (input.role !== undefined) upd.role = String(input.role);

  const { error } = await supabase
    .from('profiles')
    .update(upd)
    .eq('username', username);
  if (error) return { status: 'error', message: error.message };

  revalidatePath('/admin');
  return { status: 'ok', message: 'บันทึกการแก้ไขเรียบร้อย' };
}

export async function resetPasswordAction(input) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return DENY;

  const username = String(input.username || '').trim();
  const newPassword = String(input.new_password || '');
  if (newPassword.length < 6)
    return { status: 'error', message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' };

  const { data, error } = await supabase.rpc('admin_reset_password', {
    p_username: username,
    p_new_password: newPassword,
  });
  if (error) return { status: 'error', message: error.message };
  if (data?.status === 'error') return { status: 'error', message: data.message };

  return { status: 'ok', message: `รีเซ็ตรหัสผ่าน "${username}" เรียบร้อย` };
}

export async function deleteUserAction(input) {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return DENY;

  const username = String(input.username || '').trim();
  const { data, error } = await supabase.rpc('admin_delete_user', {
    p_username: username,
  });
  if (error) return { status: 'error', message: error.message };
  if (data?.status === 'error') return { status: 'error', message: data.message };

  revalidatePath('/admin');
  return { status: 'ok', message: `ลบผู้ใช้ "${username}" เรียบร้อย` };
}
