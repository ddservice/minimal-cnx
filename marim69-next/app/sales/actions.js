'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';
import { computeNetRevenue } from '../../lib/gp';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const int = (v) => Math.trunc(num(v));

// บันทึกยอดขายรายวัน — คำนวณ net ฝั่งเซิร์ฟเวอร์ (ไม่เชื่อค่าจาก client)
export async function saveSalesAction(input) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };

  const date = String(input.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { status: 'error', message: 'วันที่ไม่ถูกต้อง' };
  }

  const payload = {
    date,
    total_cups: int(input.total_cups),
    kshop_amount: num(input.kshop_amount),
    cash_amount: num(input.cash_amount),
    shopee_before_gp: num(input.shopee_before_gp),
    grab_before_gp: num(input.grab_before_gp),
    lineman_before_gp: num(input.lineman_before_gp),
    free_cups: int(input.free_cups),
    free_cup_cost: num(input.free_cup_cost),
    pastry_pieces: int(input.pastry_pieces),
    pastry_revenue: num(input.pastry_revenue),
  };
  // net_revenue คำนวณจากค่าดิบเสมอ (authoritative ฝั่ง server)
  payload.net_revenue = computeNetRevenue(payload);

  // upsert ตาม date (RPC เดิม, SECURITY DEFINER, ตั้ง recorded_by = auth.uid())
  const { error } = await supabase.rpc('upsert_sales_daily', { p_data: payload });
  if (error) return { status: 'error', message: error.message };

  revalidatePath('/sales');
  revalidatePath('/dashboard');
  return {
    status: 'ok',
    message: `บันทึกยอดขายวันที่ ${date} เรียบร้อย (สุทธิ ${payload.net_revenue.toLocaleString('th-TH')} ฿)`,
  };
}
