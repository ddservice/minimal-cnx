'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';
import { getReward } from '../../lib/loyalty-rewards';

const ANALYTICS_ROLES = new Set(['admin', 'co-admin', 'manager']);
const VOID_ROLES = new Set(['admin', 'co-admin', 'manager']);

function revalidateLoyalty() {
  revalidatePath('/loyalty');
  revalidatePath('/loyalty/analytics');
  revalidatePath('/loyalty/history');
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, nickname')
    .eq('id', user.id)
    .maybeSingle();
  return { supabase, user, profile };
}

/** บังคับมี staff_profiles + สาขาที่เลือก (กัน branch_id ว่าง) */
async function resolveStaffContext(supabase, userId, branchId) {
  const { data: staffProfile } = await supabase
    .from('staff_profiles')
    .select('id, branch_id, staff_code, branches(id, code, name)')
    .eq('user_id', userId)
    .maybeSingle();

  if (!staffProfile) {
    return {
      ok: false,
      message: 'บัญชียังไม่ได้ผูกกับสาขา — ให้ Admin ตั้งค่าที่ /admin/loyalty ก่อนใช้งาน',
    };
  }

  const targetBranch = branchId || staffProfile.branch_id;
  if (!targetBranch) {
    return { ok: false, message: 'กรุณาเลือกสาขาที่ทำรายการ' };
  }

  // ยืนยันว่าสาขาที่เลือกยังใช้งานอยู่
  const { data: branch } = await supabase
    .from('branches')
    .select('id, code, name, is_active')
    .eq('id', targetBranch)
    .maybeSingle();

  if (!branch || branch.is_active === false) {
    return { ok: false, message: 'สาขาที่เลือกไม่พร้อมใช้งาน' };
  }

  return { ok: true, staffProfile, branchId: branch.id, branch };
}

// 1. ค้นหาลูกค้าด้วยเบอร์โทรศัพท์ หรือ LINE User ID
export async function searchCustomerAction(query) {
  const { supabase, user } = await requireUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };

  const raw = String(query || '').trim();
  if (!raw) return { status: 'error', message: 'กรุณากรอกเบอร์โทรศัพท์หรือ LINE User ID' };

  const digits = raw.replace(/\D/g, '');
  const phoneQuery = digits.length >= 9 && !/[a-zA-Z]/.test(raw) ? digits : null;

  let q = supabase.from('customers').select('*, branches(name)').limit(1);
  if (phoneQuery) {
    q = q.eq('phone', phoneQuery);
  } else if (digits.length >= 9) {
    q = q.or(`phone.eq.${digits},line_user_id.eq.${raw}`);
  } else {
    q = q.or(`phone.eq.${raw},line_user_id.eq.${raw}`);
  }

  const { data: customers, error } = await q;
  if (error) return { status: 'error', message: error.message };

  if (customers && customers.length > 0) {
    return { status: 'ok', customer: customers[0] };
  }

  return { status: 'not_found', query: phoneQuery || raw };
}

// 2. ลงทะเบียนลูกค้าใหม่
export async function registerCustomerAction({ phone, line_user_id, name }) {
  const { supabase, user } = await requireUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };

  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 9) {
    return { status: 'error', message: 'เบอร์โทรศัพท์ไม่ถูกต้อง (อย่างน้อย 9 หลัก)' };
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      phone: cleanPhone,
      line_user_id: line_user_id ? String(line_user_id).trim() : null,
      name: name ? String(name).trim() : `ลูกค้า (${cleanPhone.slice(-4)})`,
      rfm_segment: 'New',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return { status: 'error', message: 'เบอร์โทรศัพท์หรือ LINE ID นี้ถูกลงทะเบียนไว้แล้ว' };
    return { status: 'error', message: error.message };
  }

  revalidateLoyalty();
  return { status: 'ok', customer, message: 'ลงทะเบียนลูกค้าสำเร็จ' };
}

// 3. แจกแต้มสะสม (บังคับสาขา + ใบเสร็จ + Anti-Fraud)
export async function issuePointsAction({ customer_id, points, receipt_number, branch_id }) {
  const { supabase, user } = await requireUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };

  const pts = Number(points);
  if (!pts || pts <= 0 || !Number.isFinite(pts)) {
    return { status: 'error', message: 'จำนวนแต้มต้องมากกว่า 0' };
  }

  const receipt = String(receipt_number || '').trim();
  if (!receipt) {
    return { status: 'error', message: 'กรุณาระบุเลขที่ใบเสร็จ — ใช้ไล่ย้อนบิลเมื่อมีข้อสงสัย' };
  }

  const ctx = await resolveStaffContext(supabase, user.id, branch_id);
  if (!ctx.ok) return { status: 'error', message: ctx.message };

  // Anti-fraud: max 100 pts / issue
  if (pts > 100) {
    await supabase.from('loyalty_audit_logs').insert({
      action_type: 'FRAUD_ALERT_HIGH_POINTS',
      performed_by_staff_id: user.id,
      customer_id,
      branch_id: ctx.branchId,
      details: { attempted_points: pts, receipt_number: receipt, reason: 'แจกแต้มเกิน 100 แต้มในบิลเดียว' },
    });
    return { status: 'error', message: 'ปฏิเสธคำขอ: ไม่สามารถแจกแต้มเกิน 100 แต้มต่อครั้งได้ (บันทึกแจ้งเตือนแล้ว)' };
  }

  // Anti-fraud: rate limit
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('point_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('staff_id', user.id)
    .eq('customer_id', customer_id)
    .eq('transaction_type', 'earn')
    .gte('created_at', tenMinsAgo);

  if (count && count >= 5) {
    await supabase.from('loyalty_audit_logs').insert({
      action_type: 'FRAUD_ALERT_RATE_LIMIT',
      performed_by_staff_id: user.id,
      customer_id,
      branch_id: ctx.branchId,
      details: { recent_tx_count: count, attempted_points: pts, reason: 'แจกแต้มให้ลูกค้ารายเดิมเกิน 5 ครั้งใน 10 นาที' },
    });
    return { status: 'error', message: 'ปฏิเสธคำขอ: สุ่มเสี่ยงการแจกแต้มถี่ผิดปกติ (เกิน 5 ครั้งใน 10 นาที)' };
  }

  const { data: tx, error } = await supabase
    .from('point_transactions')
    .insert({
      customer_id,
      staff_id: user.id,
      branch_id: ctx.branchId,
      points: pts,
      transaction_type: 'earn',
      receipt_number: receipt,
    })
    .select()
    .single();

  if (error) return { status: 'error', message: error.message };

  await supabase.from('loyalty_audit_logs').insert({
    action_type: 'ISSUE_POINTS',
    performed_by_staff_id: user.id,
    customer_id,
    branch_id: ctx.branchId,
    details: { points: pts, receipt_number: receipt, tx_id: tx.id, staff_code: ctx.staffProfile.staff_code },
  });

  revalidateLoyalty();
  return { status: 'ok', message: `สะสมแต้มสำเร็จ +${pts} แต้ม (${ctx.branch.name})`, points: pts };
}

// 4. แลกของรางวัล
export async function redeemRewardAction({ customer_id, reward_id, branch_id }) {
  const { supabase, user } = await requireUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };

  const reward = getReward(reward_id);
  if (!reward) return { status: 'error', message: 'ไม่พบรางวัลนี้ในระบบ' };
  const pts = reward.points;
  const reward_name = reward.name;

  const ctx = await resolveStaffContext(supabase, user.id, branch_id);
  if (!ctx.ok) return { status: 'error', message: ctx.message };

  const { data: customer } = await supabase
    .from('customers')
    .select('points_balance, name')
    .eq('id', customer_id)
    .single();

  if (!customer || (customer.points_balance || 0) < pts) {
    return { status: 'error', message: `แต้มสะสมไม่เพียงพอ (แต้มที่มี: ${customer?.points_balance || 0} แต้ม)` };
  }

  const { data: tx, error: txErr } = await supabase
    .from('point_transactions')
    .insert({
      customer_id,
      staff_id: user.id,
      branch_id: ctx.branchId,
      points: -pts,
      transaction_type: 'redeem',
      note: `แลกรางวัล: ${reward_name}`,
    })
    .select('id')
    .single();

  if (txErr) return { status: 'error', message: txErr.message };

  await supabase.from('redemption_history').insert({
    customer_id,
    reward_id: reward.id,
    reward_name,
    points_used: pts,
    branch_id: ctx.branchId,
    staff_id: user.id,
  });

  await supabase.from('loyalty_audit_logs').insert({
    action_type: 'REDEEM_REWARD',
    performed_by_staff_id: user.id,
    customer_id,
    branch_id: ctx.branchId,
    details: {
      reward_id: reward.id,
      reward_name,
      points_used: pts,
      tx_id: tx?.id,
      staff_code: ctx.staffProfile.staff_code,
    },
  });

  revalidateLoyalty();
  return {
    status: 'ok',
    message: `แลกของรางวัล "${reward_name}" สำเร็จ (-${pts} แต้ม) ที่${ctx.branch.name}`,
    points_used: pts,
  };
}

// 5. ยกเลิกธุรกรรม (สร้างแถว reverse — ไม่ลบของเดิม) manager+
export async function voidTransactionAction({ tx_id, reason }) {
  const { supabase, user, profile } = await requireUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };
  if (!VOID_ROLES.has(profile?.role)) {
    return { status: 'error', message: 'เฉพาะ Manager / Co-Admin / Admin เท่านั้นที่ยกเลิกได้' };
  }

  const why = String(reason || '').trim();
  if (!why || why.length < 3) {
    return { status: 'error', message: 'กรุณาระบุเหตุผลการยกเลิก (อย่างน้อย 3 ตัวอักษร)' };
  }

  const { data: original, error: findErr } = await supabase
    .from('point_transactions')
    .select('id, customer_id, staff_id, branch_id, points, transaction_type, note, receipt_number')
    .eq('id', tx_id)
    .maybeSingle();

  if (findErr || !original) return { status: 'error', message: 'ไม่พบธุรกรรม' };
  if (original.transaction_type === 'adjust' && String(original.note || '').startsWith('VOID:')) {
    return { status: 'error', message: 'รายการนี้เป็นรายการยกเลิกอยู่แล้ว' };
  }

  // กัน void ซ้ำ: ถ้ามี adjust ที่อ้าง tx เดิมแล้ว
  const { data: existingVoid } = await supabase
    .from('point_transactions')
    .select('id')
    .eq('transaction_type', 'adjust')
    .ilike('note', `VOID:${original.id}%`)
    .limit(1);
  if (existingVoid?.length) {
    return { status: 'error', message: 'ธุรกรรมนี้ถูกยกเลิกไปแล้ว' };
  }

  const reversePts = -Number(original.points);
  const { data: voidTx, error: voidErr } = await supabase
    .from('point_transactions')
    .insert({
      customer_id: original.customer_id,
      staff_id: user.id,
      branch_id: original.branch_id,
      points: reversePts,
      transaction_type: 'adjust',
      receipt_number: original.receipt_number,
      note: `VOID:${original.id} | ${why}`,
    })
    .select('id')
    .single();

  if (voidErr) return { status: 'error', message: voidErr.message };

  await supabase.from('loyalty_audit_logs').insert({
    action_type: 'VOID_TRANSACTION',
    performed_by_staff_id: user.id,
    customer_id: original.customer_id,
    branch_id: original.branch_id,
    details: {
      original_tx_id: original.id,
      void_tx_id: voidTx.id,
      original_points: original.points,
      reverse_points: reversePts,
      reason: why,
    },
  });

  revalidateLoyalty();
  return { status: 'ok', message: 'ยกเลิกธุรกรรมสำเร็จ (สร้างรายการย้อนกลับแล้ว)' };
}

// 6. ประวัติธุรกรรมแบบกรองได้ (ทุก role ที่ล็อกอิน — staff เห็นได้เพื่อไล่บิล)
export async function listTransactionsAction(filters = {}) {
  const { supabase, user } = await requireUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };

  const limit = Math.min(Number(filters.limit) || 100, 300);
  let q = supabase
    .from('point_transactions')
    .select('*, branches(name, code), profiles(full_name, nickname), customers(name, phone)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.branch_id) q = q.eq('branch_id', filters.branch_id);
  if (filters.staff_id) q = q.eq('staff_id', filters.staff_id);
  if (filters.customer_id) q = q.eq('customer_id', filters.customer_id);
  if (filters.transaction_type) q = q.eq('transaction_type', filters.transaction_type);
  if (filters.date_from) q = q.gte('created_at', `${filters.date_from}T00:00:00`);
  if (filters.date_to) q = q.lte('created_at', `${filters.date_to}T23:59:59.999`);
  if (filters.phone) {
    const phone = String(filters.phone).replace(/\D/g, '');
    if (phone) {
      const { data: cust } = await supabase.from('customers').select('id').eq('phone', phone).maybeSingle();
      if (!cust) return { status: 'ok', transactions: [] };
      q = q.eq('customer_id', cust.id);
    }
  }

  const { data, error } = await q;
  if (error) return { status: 'error', message: error.message };
  return { status: 'ok', transactions: data || [] };
}

// 7. ดึงข้อมูลสถิติ CDP / สาขา
export async function getLoyaltyAnalyticsAction() {
  const { supabase, user, profile } = await requireUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };
  if (!ANALYTICS_ROLES.has(profile?.role)) {
    return { status: 'error', message: 'ไม่มีสิทธิ์ดูแดชบอร์ดวิเคราะห์' };
  }

  const [
    { data: txs },
    { data: customers },
    { data: branches },
    { data: auditLogs },
    { data: staffProfiles },
  ] = await Promise.all([
    supabase.from('point_transactions').select('*, branches(name, code), profiles(full_name, nickname), customers(name, phone)'),
    supabase.from('customers').select('*'),
    supabase.from('branches').select('*'),
    supabase
      .from('loyalty_audit_logs')
      .select('*, profiles(full_name, nickname), branches(name)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('staff_profiles').select('user_id, staff_code, branch_id, profiles(full_name, nickname), branches(name)'),
  ]);

  return {
    status: 'ok',
    data: {
      transactions: txs || [],
      customers: customers || [],
      branches: branches || [],
      auditLogs: auditLogs || [],
      staffProfiles: staffProfiles || [],
    },
  };
}
