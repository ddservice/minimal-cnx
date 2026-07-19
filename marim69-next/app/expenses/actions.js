'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';
import { EXPENSE_CATEGORY_VALUES } from '../../lib/expense-categories';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

// บันทึกรายจ่ายหลายรายการ (append) — total คำนวณฝั่งเซิร์ฟเวอร์รวม VAT
export async function saveExpensesAction(input) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };

  const date = String(input.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { status: 'error', message: 'วันที่ไม่ถูกต้อง' };
  }
  const category = String(input.category || '');
  if (!EXPENSE_CATEGORY_VALUES.includes(category)) {
    return { status: 'error', message: 'หมวดหมู่ไม่ถูกต้อง' };
  }

  const rows = Array.isArray(input.rows) ? input.rows : [];
  const records = rows
    .filter((r) => String(r.item_name || '').trim() && num(r.unit_price) > 0)
    .map((r) => {
      const price = num(r.unit_price);
      const qty = num(r.quantity) || 1;
      const vat = !!r.vat;
      // VAT 7% บวกเข้า total (ตรงกับ dashboard เดิม: pEff = price * 1.07)
      const total = Math.round((vat ? price * 1.07 : price) * qty * 100) / 100;
      return {
        date,
        category,
        subcategory: String(r.supplier || '').trim() || null,
        item_name: String(r.item_name).trim(),
        unit: String(r.unit || '').trim(),
        unit_price: price,
        quantity: qty,
        total_amount: total,
        payment_method: String(r.payment_method || 'บัญชี หจก.'),
        month_label: '', // trigger ตั้งค่าจาก date ให้เอง
        recorded_by: user.id,
      };
    });

  if (!records.length) {
    return { status: 'error', message: 'กรุณากรอกอย่างน้อย 1 รายการ (ชื่อ + ราคา)' };
  }

  const { error } = await supabase.from('expenses').insert(records);
  if (error) return { status: 'error', message: error.message };

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  const sum = records.reduce((a, r) => a + r.total_amount, 0);
  return {
    status: 'ok',
    message: `บันทึก ${records.length} รายการ รวม ${sum.toLocaleString('th-TH')} ฿`,
  };
}
