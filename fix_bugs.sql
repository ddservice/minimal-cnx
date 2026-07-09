-- ================================================================
-- FIX BUGS: July 2026
-- รัน SQL นี้ใน Supabase SQL Editor ทั้งหมดพร้อมกัน
-- ================================================================

-- ── Fix 1: Delete policy — อนุญาต manager/co-admin/admin ลบ expenses ได้ ──
-- (เดิมเป็น admin only → non-admin แก้ไขรายจ่ายไม่ได้)
drop policy if exists "expenses: delete admin only" on public.expenses;
drop policy if exists "expenses: delete manager+" on public.expenses;
create policy "expenses: delete manager+"
  on public.expenses for delete
  using (public.fn_my_role() in ('admin', 'co-admin', 'manager'));

-- ── Fix 2a: upsert_opex_item — เพิ่ม month_label ในการ insert ──
-- (เดิมไม่ set month_label → get_monthly_summary หาไม่เจอ OPEX)
create or replace function public.upsert_opex_item(p_data jsonb)
returns public.expenses language plpgsql security definer as $$
declare
  _result public.expenses;
  _date   date;
begin
  _date := (date_trunc('month', to_date(p_data->>'month_label','MM/YYYY'))
            + interval '1 month - 1 day')::date;

  insert into public.expenses (
    date, category, subcategory, item_name, item_key,
    unit_price, quantity, total_amount, payment_method,
    month_label, recorded_by
  ) values (
    _date,
    coalesce(p_data->>'category', 'ค่าใช้จ่ายดำเนินการ'),
    p_data->>'subcategory',
    p_data->>'item_name',
    p_data->>'item_key',
    (p_data->>'unit_price')::numeric,
    coalesce((p_data->>'quantity')::numeric, 1),
    (p_data->>'total_amount')::numeric,
    coalesce(p_data->>'payment_method', 'อัตโนมัติ'),
    p_data->>'month_label',
    auth.uid()
  )
  on conflict on constraint uidx_expenses_opex_item do update set
    item_name      = excluded.item_name,
    total_amount   = excluded.total_amount,
    payment_method = excluded.payment_method,
    month_label    = excluded.month_label,
    recorded_by    = auth.uid(),
    created_at     = now()
  returning * into _result;
  return _result;
end; $$;

-- ── Fix 2b: get_monthly_summary — ดึง regular expenses ด้วย date range ──
-- (เดิม query ด้วย month_label อย่างเดียว → regular expenses มี month_label='' ไม่ถูกดึง)
create or replace function public.get_monthly_summary(p_month_label text)
returns jsonb language plpgsql security definer stable as $$
declare
  _sales        jsonb;
  _expenses     jsonb;
  _month_start  date;
  _month_end    date;
begin
  _month_start := date_trunc('month', to_date(p_month_label, 'MM/YYYY'))::date;
  _month_end   := (_month_start + interval '1 month - 1 day')::date;

  select jsonb_agg(row_to_json(s)) into _sales
  from public.sales_daily s
  where s.date >= _month_start and s.date <= _month_end;

  select jsonb_agg(row_to_json(e)) into _expenses
  from public.expenses e
  where (
    -- Regular expenses (mat/bak/misc): filter by date in month
    (e.item_key IS NULL
      AND e.date >= _month_start
      AND e.date <= _month_end)
    OR
    -- OPEX items: filter by month_label
    (e.item_key IS NOT NULL
      AND e.month_label = p_month_label)
  );

  return jsonb_build_object(
    'month',    p_month_label,
    'sales',    coalesce(_sales, '[]'),
    'expenses', coalesce(_expenses, '[]')
  );
end; $$;

-- ── Fix 3: แก้ OPEX เก่าที่ไม่มี month_label ──
-- อัปเดต OPEX rows เก่าที่ item_key IS NOT NULL แต่ month_label ว่าง
-- ให้ compute month_label จาก date
UPDATE public.expenses
SET month_label = to_char(date, 'MM/YYYY')
WHERE item_key IS NOT NULL
  AND (month_label IS NULL OR month_label = '');

