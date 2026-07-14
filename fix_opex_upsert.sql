-- ================================================================
-- fix_opex_upsert.sql — แก้บันทึก OPEX (ค่าดำเนินการ) ไม่เข้าฐานข้อมูล
--
-- สาเหตุ: uidx_expenses_opex_item ถูกสร้างเป็น "partial unique index"
-- (where item_key is not null) แต่ upsert_opex_item ใช้
-- ON CONFLICT ON CONSTRAINT ซึ่งรับเฉพาะชื่อ constraint ไม่รับชื่อ index
-- → RPC error 42704 ทุกครั้ง = บันทึกหน้า "ค่าดำเนินการ" ล้มเหลวเงียบๆ
-- ตั้งแต่ย้ายมา Supabase (ก.ค. 2026)
--
-- วิธีแก้: เปลี่ยนเป็น ON CONFLICT แบบระบุคอลัมน์ + เงื่อนไข partial
-- ให้ตรงกับ index เดิม
--
-- รันทั้งไฟล์ใน Supabase → SQL Editor → Run
-- ================================================================

-- เผื่อ index ยังไม่ถูกสร้าง (ไม่มีผลถ้ามีอยู่แล้ว)
create unique index if not exists uidx_expenses_opex_item
  on public.expenses (month_label, item_key)
  where item_key is not null;

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
  -- ระบุคอลัมน์ + เงื่อนไขให้ตรง partial unique index (ห้ามใช้ ON CONSTRAINT กับ index)
  on conflict (month_label, item_key) where item_key is not null do update set
    item_name      = excluded.item_name,
    total_amount   = excluded.total_amount,
    payment_method = excluded.payment_method,
    month_label    = excluded.month_label,
    recorded_by    = auth.uid(),
    created_at     = now()
  returning * into _result;
  return _result;
end; $$;

-- ทดสอบว่า upsert ทำงานจริง (insert แล้ว update ตัวเอง — ไม่ทิ้งข้อมูลทดสอบ)
DO $$
DECLARE r public.expenses;
BEGIN
  r := public.upsert_opex_item('{"month_label":"01/2000","category":"ค่าใช้จ่ายดำเนินการ","item_name":"__ทดสอบ__","item_key":"__test__","total_amount":1}'::jsonb);
  r := public.upsert_opex_item('{"month_label":"01/2000","category":"ค่าใช้จ่ายดำเนินการ","item_name":"__ทดสอบ__","item_key":"__test__","total_amount":2}'::jsonb);
  DELETE FROM public.expenses WHERE item_key = '__test__';
  RAISE NOTICE 'upsert_opex_item ทำงานปกติแล้ว ✓';
END $$;

SELECT 'fix_opex_upsert applied ✓' AS result;
