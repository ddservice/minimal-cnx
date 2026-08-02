import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Supabase client สำหรับ Server Component / Server Action / Route Handler
// อ่าน session จาก cookie ฝั่งเซิร์ฟเวอร์ — โค้ดนี้ไม่ถูกส่งไป browser
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ถูกเรียกจาก Server Component — set cookie ไม่ได้ ไม่เป็นไร
            // middleware จะ refresh session ให้แทน
          }
        },
      },
    }
  );
}
