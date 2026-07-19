'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';
import { OPEX_OPERATING, OPEX_STAFF, OPEX_TAX } from '../../lib/opex';

const OP_LABEL = Object.fromEntries(OPEX_OPERATING.items.map((i) => [i.key, i.label]));
const OP_KEYS = new Set(OPEX_OPERATING.items.map((i) => i.key));
const STAFF_LABEL = Object.fromEntries(OPEX_STAFF.fixed.map((i) => [i.key, i.label]));
const STAFF_KEYS = new Set(OPEX_STAFF.fixed.map((i) => i.key));
const TAX_LABEL = Object.fromEntries(OPEX_TAX.items.map((i) => [i.key, i.label]));
const TAX_KEYS = new Set(OPEX_TAX.items.map((i) => i.key));

// บันทึกค่า OPEX ทั้ง 3 หมวด — upsert ทีละ item (dedup ตาม item_key+month)
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

  // สร้างรายการ upsert: [{ item_key, item_name, category, amount }]
  const jobs = [];
  const pushFixed = (obj, keys, labelMap, category) => {
    for (const key of Object.keys(obj || {})) {
      if (!keys.has(key)) continue;
      const amt = toAmt(obj[key]);
      if (amt == null) continue;
      jobs.push({ item_key: key, item_name: labelMap[key], category, amount: amt });
    }
  };

  pushFixed(input.operating, OP_KEYS, OP_LABEL, OPEX_OPERATING.category);
  pushFixed(input.staff, STAFF_KEYS, STAFF_LABEL, OPEX_STAFF.category);
  pushFixed(input.tax, TAX_KEYS, TAX_LABEL, OPEX_TAX.category);

  // พนักงาน (dynamic) → key = emp{n}, ต้องมีชื่อ + ยอด
  const employees = Array.isArray(input.employees) ? input.employees : [];
  employees.forEach((e, idx) => {
    const amt = toAmt(e?.amount);
    if (amt == null) return;
    const key = `${OPEX_STAFF.empPrefix}${idx + 1}`;
    const label = String(e?.label || '').trim() || `พนักงานคนที่ ${idx + 1}`;
    jobs.push({ item_key: key, item_name: label, category: OPEX_STAFF.category, amount: amt });
  });

  if (!jobs.length) return { status: 'error', message: 'ไม่มีรายการให้บันทึก' };

  let saved = 0;
  let sum = 0;
  for (const j of jobs) {
    const { error } = await supabase.rpc('upsert_opex_item', {
      p_data: {
        month_label: month,
        category: j.category,
        item_name: j.item_name,
        item_key: j.item_key,
        total_amount: j.amount,
        payment_method: 'อัตโนมัติ',
      },
    });
    if (error) return { status: 'error', message: error.message };
    saved++;
    sum += j.amount;
  }

  revalidatePath('/opex');
  revalidatePath('/reports');
  revalidatePath('/dashboard');
  return {
    status: 'ok',
    message: `บันทึก ${saved} รายการ รวม ${sum.toLocaleString('th-TH')} ฿`,
  };
}

// '' / null = ข้าม (คืน null); ตัวเลข >= 0 = ใช้
function toAmt(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
