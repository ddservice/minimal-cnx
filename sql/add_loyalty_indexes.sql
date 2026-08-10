-- ================================================================
-- add_loyalty_indexes.sql — ดัชนีเร่งประวัติ/CDP ของระบบสะสมแต้ม
-- Idempotent — รันซ้ำได้
-- ================================================================

create index if not exists idx_point_tx_created_at
  on public.point_transactions (created_at desc);

create index if not exists idx_point_tx_customer_created
  on public.point_transactions (customer_id, created_at desc);

create index if not exists idx_point_tx_staff_customer_created
  on public.point_transactions (staff_id, customer_id, created_at desc);

create index if not exists idx_point_tx_branch_created
  on public.point_transactions (branch_id, created_at desc);

create index if not exists idx_point_tx_type_created
  on public.point_transactions (transaction_type, created_at desc);

create index if not exists idx_customers_phone
  on public.customers (phone);

create index if not exists idx_customers_rfm
  on public.customers (rfm_segment);

create index if not exists idx_loyalty_audit_created
  on public.loyalty_audit_logs (created_at desc);
