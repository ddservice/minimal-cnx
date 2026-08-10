-- ================================================================
-- add_customer_privacy_consent.sql
-- บันทึกความยินยอม PDPA ตอนสมัครสมาชิกสะสมแต้ม
-- Idempotent
-- ================================================================

alter table public.customers
  add column if not exists privacy_consent_at timestamptz;

alter table public.customers
  add column if not exists privacy_consent_version text;

comment on column public.customers.privacy_consent_at is
  'เวลาที่ลูกค้า (ผ่านพนักงาน) ยินยอมให้เก็บเบอร์เพื่อสะสมแต้ม';
comment on column public.customers.privacy_consent_version is
  'เวอร์ชันข้อความยินยอม เช่น 2026-08-10';
