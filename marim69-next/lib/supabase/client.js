import { createBrowserClient } from '@supabase/ssr';

// Supabase client สำหรับ Client Component (รันในเบราว์เซอร์)
// ใช้ publishable/anon key เท่านั้น — RLS เป็นตัวกันความปลอดภัยจริง
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
