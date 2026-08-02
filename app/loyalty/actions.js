'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';

// 1. ค้นหาลูกค้าด้วยเบอร์โทรศัพท์ หรือ LINE User ID (หากไม่พบสามารถสร้างใหม่ได้)
export async function searchCustomerAction(query) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };

  const q = String(query || '').trim();
  if (!q) return { status: 'error', message: 'กรุณากรอกเบอร์โทรศัพท์หรือ LINE User ID' };

  // ค้นหาด้วย phone หรือ line_user_id
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*, branches(name)')
    .or(`phone.eq.${q},line_user_id.eq.${q}`)
    .limit(1);

  if (error) return { status: 'error', message: error.message };
  
  if (customers && customers.length > 0) {
    return { status: 'ok', customer: customers[0] };
  }

  return { status: 'not_found', query: q };
}

// 2. ลงทะเบียนลูกค้าใหม่
export async function registerCustomerAction({ phone, line_user_id, name }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  revalidatePath('/loyalty');
  return { status: 'ok', customer, message: 'ลงทะเบียนลูกค้าสำเร็จ' };
}

// 3. แจกแต้มสะสม (พร้อม Anti-Fraud Engine)
export async function issuePointsAction({ customer_id, points, receipt_number, branch_id }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };

  const pts = Number(points);
  if (!pts || pts <= 0) return { status: 'error', message: 'จำนวนแต้มต้องมากกว่า 0' };

  // ── Anti-Fraud Rules ──
  // Rule 1: ห้ามแจกเกิน 100 แต้มในบิลเดียว
  if (pts > 100) {
    // บันทึก Audit Log พฤติกรรมสุ่มเสี่ยง
    await supabase.from('loyalty_audit_logs').insert({
      action_type: 'FRAUD_ALERT_HIGH_POINTS',
      performed_by_staff_id: user.id,
      customer_id,
      branch_id: branch_id || null,
      details: { attempted_points: pts, receipt_number, reason: 'แจกแต้มเกิน 100 แต้มในบิลเดียว' },
    });
    return { status: 'error', message: 'ปฏิเสธคำขอ: ไม่สามารถแจกแต้มเกิน 100 แต้มต่อครั้งได้ (บันทึกแจ้งเตือนสุ่มเสี่ยงแล้ว)' };
  }

  // Rule 2: Rate Limit — ตรวจสอบว่าพนักงานคนนี้แจกแต้มให้ลูกค้ารายเดิมเกิน 5 ครั้งใน 10 นาทีหรือไม่
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('point_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('staff_id', user.id)
    .eq('customer_id', customer_id)
    .gte('created_at', tenMinsAgo);

  if (count && count >= 5) {
    await supabase.from('loyalty_audit_logs').insert({
      action_type: 'FRAUD_ALERT_RATE_LIMIT',
      performed_by_staff_id: user.id,
      customer_id,
      branch_id: branch_id || null,
      details: { recent_tx_count: count, attempted_points: pts, reason: 'แจกแต้มให้ลูกค้ารายเดิมเกิน 5 ครั้งใน 10 นาที' },
    });
    return { status: 'error', message: 'ปฏิเสธคำขอ: สุ่มเสี่ยงการแจกแต้มถี่ผิดปกติ (เกิน 5 ครั้งใน 10 นาที)' };
  }

  // ดึงสาขาตั้งต้นของพนักงานถ้าไม่ได้ส่งมา
  let targetBranch = branch_id;
  if (!targetBranch) {
    const { data: staffProfile } = await supabase
      .from('staff_profiles')
      .select('branch_id')
      .eq('user_id', user.id)
      .maybeSingle();
    targetBranch = staffProfile?.branch_id || null;
  }

  // บันทึกคำขอแจกแต้ม
  const { data: tx, error } = await supabase
    .from('point_transactions')
    .insert({
      customer_id,
      staff_id: user.id,
      branch_id: targetBranch,
      points: pts,
      transaction_type: 'earn',
      receipt_number: receipt_number ? String(receipt_number).trim() : null,
    })
    .select()
    .single();

  if (error) return { status: 'error', message: error.message };

  // บันทึก Audit Normal Log
  await supabase.from('loyalty_audit_logs').insert({
    action_type: 'ISSUE_POINTS',
    performed_by_staff_id: user.id,
    customer_id,
    branch_id: targetBranch,
    details: { points: pts, receipt_number, tx_id: tx.id },
  });

  revalidatePath('/loyalty');
  revalidatePath('/loyalty/analytics');
  return { status: 'ok', message: `สะสมแต้มสำเร็จ +${pts} แต้ม` };
}

// 4. แลกของรางวัล (หักแต้ม)
export async function redeemRewardAction({ customer_id, reward_id, reward_name, points_used, branch_id }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };

  const pts = Number(points_used);
  if (!pts || pts <= 0) return { status: 'error', message: 'จำนวนแต้มต้องมากกว่า 0' };

  // เช็คแต้มคงเหลือของลูกค้าฝั่งเซิร์ฟเวอร์
  const { data: customer } = await supabase
    .from('customers')
    .select('points_balance, name')
    .eq('id', customer_id)
    .single();

  if (!customer || (customer.points_balance || 0) < pts) {
    return { status: 'error', message: `แต้มสะสมไม่เพียงพอ (แต้มที่มี: ${customer?.points_balance || 0} แต้ม)` };
  }

  // ดึงสาขาตั้งต้นของพนักงานถ้าไม่ได้ส่งมา
  let targetBranch = branch_id;
  if (!targetBranch) {
    const { data: staffProfile } = await supabase
      .from('staff_profiles')
      .select('branch_id')
      .eq('user_id', user.id)
      .maybeSingle();
    targetBranch = staffProfile?.branch_id || null;
  }

  // 1. บันทึก transaction หักแต้ม (ค่าลบ)
  const { error: txErr } = await supabase
    .from('point_transactions')
    .insert({
      customer_id,
      staff_id: user.id,
      branch_id: targetBranch,
      points: -pts,
      transaction_type: 'redeem',
      note: `แลกรางวัล: ${reward_name}`,
    });

  if (txErr) return { status: 'error', message: txErr.message };

  // 2. บันทึกประวัติการแลก
  await supabase
    .from('redemption_history')
    .insert({
      customer_id,
      reward_id,
      reward_name,
      points_used: pts,
      branch_id: targetBranch,
      staff_id: user.id,
    });

  // 3. บันทึก Audit Log
  await supabase.from('loyalty_audit_logs').insert({
    action_type: 'REDEEM_REWARD',
    performed_by_staff_id: user.id,
    customer_id,
    branch_id: targetBranch,
    details: { reward_id, reward_name, points_used: pts },
  });

  revalidatePath('/loyalty');
  revalidatePath('/loyalty/analytics');
  return { status: 'ok', message: `แลกของรางวัล "${reward_name}" สำเร็จ (-${pts} แต้ม)` };
}

// 5. ดึงข้อมูลสถิติมุมมองสาขา พนักงาน และ CDP/RFM
export async function getLoyaltyAnalyticsAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' };

  const [
    { data: txs },
    { data: customers },
    { data: branches },
    { data: auditLogs },
  ] = await Promise.all([
    supabase.from('point_transactions').select('*, branches(name), profiles(full_name, nickname)'),
    supabase.from('customers').select('*'),
    supabase.from('branches').select('*'),
    supabase.from('loyalty_audit_logs').select('*, profiles(full_name, nickname)').order('created_at', { ascending: false }).limit(20),
  ]);

  return {
    status: 'ok',
    data: {
      transactions: txs || [],
      customers: customers || [],
      branches: branches || [],
      auditLogs: auditLogs || [],
    },
  };
}
