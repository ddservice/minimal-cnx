'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';

const FIELDS = ['name', 'phone', 'tax_id', 'address', 'logo_url'];

// บันทึกข้อมูลบริษัทลง business_config (key = biz_info) — ใช้ร่วมทุกเครื่อง
export async function saveBizInfo(input) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };

  const value = {};
  FIELDS.forEach((k) => { value[k] = String(input[k] || '').trim(); });

  const { error } = await supabase
    .from('business_config')
    .upsert({ key: 'biz_info', value, updated_by: user.id });
  if (error) return { status: 'error', message: error.message };

  revalidatePath('/settings');
  revalidatePath('/opex');
  return { status: 'ok', message: 'บันทึกข้อมูลบริษัทเรียบร้อย' };
}
