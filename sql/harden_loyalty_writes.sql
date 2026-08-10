-- ================================================================
-- harden_loyalty_writes.sql
-- ปิดช่องโหว่: authenticated แทรก point_transactions ตรงๆ ได้
-- (ข้าม Server Action anti-fraud / void gate)
--
-- หลังรันไฟล์นี้:
--  - earn/redeem ต้อง staff_id = auth.uid() + มี staff_profiles
--  - earn ต้องมีใบเสร็จ และ points 1..100
--  - adjust (void) ทำได้แค่ผ่าน RPC loyalty_void_transaction (manager+)
-- Idempotent — รันซ้ำได้
-- ================================================================

-- ── 1) จำกัด INSERT บน point_transactions ──
drop policy if exists "point_transactions: insert authenticated" on public.point_transactions;
drop policy if exists "point_transactions: insert own earn/redeem" on public.point_transactions;

create policy "point_transactions: insert own earn/redeem" on public.point_transactions
  for insert with check (
    auth.uid() is not null
    and staff_id = auth.uid()
    and transaction_type in ('earn', 'redeem')
    and exists (
      select 1 from public.staff_profiles sp
      where sp.user_id = auth.uid()
        and (
          sp.branch_id = branch_id
          or public.fn_my_role() in ('admin', 'co-admin', 'manager')
        )
    )
    and (
      transaction_type <> 'earn'
      or (
        receipt_number is not null
        and length(trim(receipt_number)) > 0
        and points > 0
        and points <= 100
      )
    )
    and (
      transaction_type <> 'redeem'
      or points < 0
    )
  );

-- ── 2) จำกัด redemption_history ──
drop policy if exists "redemption_history: insert authenticated" on public.redemption_history;
drop policy if exists "redemption_history: insert own" on public.redemption_history;

create policy "redemption_history: insert own" on public.redemption_history
  for insert with check (
    auth.uid() is not null
    and staff_id = auth.uid()
    and exists (
      select 1 from public.staff_profiles sp where sp.user_id = auth.uid()
    )
  );

-- ── 3) จำกัด audit insert (ห้ามแอบอ้างเป็นคนอื่น) ──
drop policy if exists "loyalty_audit_logs: insert authenticated" on public.loyalty_audit_logs;
drop policy if exists "loyalty_audit_logs: insert self" on public.loyalty_audit_logs;

create policy "loyalty_audit_logs: insert self" on public.loyalty_audit_logs
  for insert with check (
    auth.uid() is not null
    and performed_by_staff_id = auth.uid()
  );

-- ── 4) RPC ยกเลิกธุรกรรม (SECURITY DEFINER) ──
create or replace function public.loyalty_void_transaction(p_tx_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _role text;
  _uid uuid := auth.uid();
  _orig public.point_transactions%rowtype;
  _void_id uuid;
  _why text := trim(coalesce(p_reason, ''));
begin
  if _uid is null then
    return jsonb_build_object('status', 'error', 'message', 'กรุณาเข้าสู่ระบบ');
  end if;

  _role := public.fn_my_role();
  if _role is distinct from 'admin'
     and _role is distinct from 'co-admin'
     and _role is distinct from 'manager' then
    return jsonb_build_object('status', 'error', 'message', 'เฉพาะ Manager / Co-Admin / Admin เท่านั้นที่ยกเลิกได้');
  end if;

  if length(_why) < 3 then
    return jsonb_build_object('status', 'error', 'message', 'กรุณาระบุเหตุผลการยกเลิก (อย่างน้อย 3 ตัวอักษร)');
  end if;

  select * into _orig from public.point_transactions where id = p_tx_id;
  if not found then
    return jsonb_build_object('status', 'error', 'message', 'ไม่พบธุรกรรม');
  end if;

  if _orig.transaction_type = 'adjust' and coalesce(_orig.note, '') like 'VOID:%' then
    return jsonb_build_object('status', 'error', 'message', 'รายการนี้เป็นรายการยกเลิกอยู่แล้ว');
  end if;

  if exists (
    select 1 from public.point_transactions
    where transaction_type = 'adjust'
      and note like ('VOID:' || _orig.id::text || '%')
  ) then
    return jsonb_build_object('status', 'error', 'message', 'ธุรกรรมนี้ถูกยกเลิกไปแล้ว');
  end if;

  insert into public.point_transactions (
    customer_id, staff_id, branch_id, points, transaction_type, receipt_number, note
  ) values (
    _orig.customer_id,
    _uid,
    _orig.branch_id,
    -_orig.points,
    'adjust',
    _orig.receipt_number,
    'VOID:' || _orig.id::text || ' | ' || _why
  )
  returning id into _void_id;

  insert into public.loyalty_audit_logs (
    action_type, performed_by_staff_id, customer_id, branch_id, details
  ) values (
    'VOID_TRANSACTION',
    _uid,
    _orig.customer_id,
    _orig.branch_id,
    jsonb_build_object(
      'original_tx_id', _orig.id,
      'void_tx_id', _void_id,
      'original_points', _orig.points,
      'reverse_points', -_orig.points,
      'reason', _why
    )
  );

  return jsonb_build_object(
    'status', 'ok',
    'message', 'ยกเลิกธุรกรรมสำเร็จ (สร้างรายการย้อนกลับแล้ว)',
    'void_tx_id', _void_id
  );
end;
$$;

revoke all on function public.loyalty_void_transaction(uuid, text) from public;
grant execute on function public.loyalty_void_transaction(uuid, text) to authenticated;
