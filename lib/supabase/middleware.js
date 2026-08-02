import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Refresh session ทุก request และกันหน้าที่ต้องล็อกอิน
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ห้ามใส่โค้ดคั่นระหว่าง createServerClient กับ getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ยังไม่ล็อกอิน + ไม่ได้อยู่หน้า login/auth → เด้งไป /login
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // บังคับ https เสมอหากไม่ใช่ localhost/127.0.0.1 ป้องกัน Cloudflare HTTP redirect loop
    const host = request.headers.get('host') || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    if (!isLocal) {
      url.protocol = 'https:';
    }
    return NextResponse.redirect(url);
  }

  // หากมี location header เป็น http ในสภาพแวดล้อมจริง ปรับเป็น https
  if (supabaseResponse.headers.has('location')) {
    const loc = supabaseResponse.headers.get('location') || '';
    if (loc.startsWith('http://') && !loc.includes('localhost') && !loc.includes('127.0.0.1')) {
      supabaseResponse.headers.set('location', loc.replace('http://', 'https://'));
    }
  }

  return supabaseResponse;
}
