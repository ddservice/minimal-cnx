-- ================================================================
-- fix_loyalty_staff_profiles_rls.sql
-- Idempotent fix for a gap in add_loyalty_system.sql:
-- staff_profiles had RLS enabled but no policies, so every read
-- returned zero rows (silent) and staff→branch lookup never worked.
-- Safe to re-run. Skip if you haven't run add_loyalty_system.sql yet
-- (that file now includes these policies).
-- ================================================================

alter table public.staff_profiles enable row level security;

drop policy if exists "staff_profiles: read authenticated" on public.staff_profiles;
create policy "staff_profiles: read authenticated" on public.staff_profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "staff_profiles: admin write" on public.staff_profiles;
create policy "staff_profiles: admin write" on public.staff_profiles
  for all using (public.fn_my_role() in ('admin', 'co-admin'));
