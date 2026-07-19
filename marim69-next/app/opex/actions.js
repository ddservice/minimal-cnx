'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';
import { OPEX_OPERATING } from '../../lib/opex';

const LABEL = Object.fromEntries(OPEX_OPERATING.items.map((i) => [i.key, i.label]));
const KEYS = new Set(OPEX_OPERATING.items.map((i) => i.key));

// บันทึกค่าดำเนินการรายเดือน — upsert ทีละ item (dedup ตาม item_key+month)
export async function saveOpexAction(input) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };

  const month = String(input.month_label || '');
  if (!/^\d{2}\/\d{4}$/.test(month)) {
    return { status: 'error', message: 'เดือนไม่ถูกต้อง' };
  }

  const items = input.items || {};
  let saved = 0;
  let sum = 0;
  for (const key of Object.keys(items)) {
    if (!KEYS.has(key)) continue;
    const raw = items[key];
    if (raw === '' || raw == null) continue; // เว้นว่าง = ไม่บันทึก
    const amt = Number(raw);
    if (!Number.isFinite(amt) || amt < 0) continue;

    const { data, error } = await supabase.rpc('upsert_opex_item', {
      p_data: {
        month_label: month,
        category: OPEX_OPERATING.category,
        item_name: LABEL[key],
        item_key: key,
        total_amount: amt,
        payment_method: 'อัตโนมัติ',
      },
    });
    if (error) return { status: 'error', message: error.message };
    saved++;
    sum += amt;
  }

  if (!saved) return { status: 'error', message: 'ไม่มีรายการให้บันทึก (กรอกอย่างน้อย 1 ช่อง)' };

  revalidatePath('/opex');
  revalidatePath('/dashboard');
  return {
    status: 'ok',
    message: `บันทึก ${saved} รายการ รวม ${sum.toLocaleString('th-TH')} ฿`,
  };
}
