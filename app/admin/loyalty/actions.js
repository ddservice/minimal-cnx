'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';

async function requireLoyaltyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false, user: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = profile?.role;
  const ok = role === 'admin' || role === 'co-admin';
  return { supabase, ok, user, role };
}

const DENY = { status: 'error', message: 'เฉพาะ Admin หรือ Co-Admin เท่านั้น' };

function revalidateLoyaltyAdmin() {
  revalidatePath('/admin/loyalty');
  revalidatePath('/loyalty');
  revalidatePath('/admin');
}

export async function upsertBranchAction(input) {
  const { supabase, ok } = await requireLoyaltyAdmin();
  if (!ok) return DENY;

  const code = String(input.code || '').trim().toUpperCase();
  const name = String(input.name || '').trim();
  const location = String(input.location || '').trim();
  if (!code || !name) return { status: 'error', message: 'กรุณาระบุรหัสและชื่อสาขา' };

  if (input.id) {
    const { error } = await supabase
      .from('branches')
      .update({
        code,
        name,
        location: location || null,
        is_active: input.is_active !== false,
      })
      .eq('id', input.id);
    if (error) return { status: 'error', message: error.message };
  } else {
    const { error } = await supabase.from('branches').insert({
      code,
      name,
      location: location || null,
      is_active: true,
    });
    if (error) {
      if (error.code === '23505') return { status: 'error', message: 'รหัสสาขานี้มีอยู่แล้ว' };
      return { status: 'error', message: error.message };
    }
  }

  revalidateLoyaltyAdmin();
  return { status: 'ok', message: 'บันทึกสาขาเรียบร้อย' };
}

export async function toggleBranchAction({ id, is_active }) {
  const { supabase, ok } = await requireLoyaltyAdmin();
  if (!ok) return DENY;
  if (!id) return { status: 'error', message: 'ไม่พบสาขา' };

  const { error } = await supabase
    .from('branches')
    .update({ is_active: !!is_active })
    .eq('id', id);
  if (error) return { status: 'error', message: error.message };

  revalidateLoyaltyAdmin();
  return { status: 'ok', message: is_active ? 'เปิดใช้งานสาขาแล้ว' : 'ปิดใช้งานสาขาแล้ว' };
}

export async function upsertStaffProfileAction(input) {
  const { supabase, ok } = await requireLoyaltyAdmin();
  if (!ok) return DENY;

  const user_id = String(input.user_id || '').trim();
  const branch_id = String(input.branch_id || '').trim();
  const staff_code = String(input.staff_code || '').trim().toUpperCase();
  const role = String(input.role || 'staff').trim();

  if (!user_id || !branch_id || !staff_code) {
    return { status: 'error', message: 'กรุณาเลือกผู้ใช้ สาขา และรหัสพนักงาน' };
  }

  if (input.id) {
    const { error } = await supabase
      .from('staff_profiles')
      .update({ user_id, branch_id, staff_code, role })
      .eq('id', input.id);
    if (error) {
      if (error.code === '23505') return { status: 'error', message: 'รหัสพนักงานหรือการผูกผู้ใช้+สาขานี้ซ้ำ' };
      return { status: 'error', message: error.message };
    }
  } else {
    const { error } = await supabase.from('staff_profiles').insert({
      user_id,
      branch_id,
      staff_code,
      role,
    });
    if (error) {
      if (error.code === '23505') return { status: 'error', message: 'รหัสพนักงานหรือการผูกผู้ใช้+สาขานี้ซ้ำ' };
      return { status: 'error', message: error.message };
    }
  }

  revalidateLoyaltyAdmin();
  return { status: 'ok', message: 'บันทึกการผูกพนักงาน–สาขาเรียบร้อย' };
}

export async function deleteStaffProfileAction({ id }) {
  const { supabase, ok } = await requireLoyaltyAdmin();
  if (!ok) return DENY;
  if (!id) return { status: 'error', message: 'ไม่พบรายการ' };

  const { error } = await supabase.from('staff_profiles').delete().eq('id', id);
  if (error) return { status: 'error', message: error.message };

  revalidateLoyaltyAdmin();
  return { status: 'ok', message: 'ลบการผูกพนักงานแล้ว' };
}
