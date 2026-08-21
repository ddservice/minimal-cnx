import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { isLoyaltyOnlyRole, isLoyaltyStaffPath } from '../perms';

const ROLE_COOKIE = 'mm69_role';

function httpsRedirect(request, pathname) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const host = request.headers.get('host') || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  if (!isLocal) url.protocol = 'https:';
  return NextResponse.redirect(url);
}

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
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (err) {
    console.error('Middleware auth check error:', err);
  }

  const pathname = request.nextUrl.pathname;

  // ยังไม่ล็อกอิน + ไม่ได้อยู่หน้า login/auth → เด้งไป /login
  if (
    !user &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/auth')
  ) {
    return httpsRedirect(request, '/login');
  }

  // loyalty_staff เข้าได้แค่ /loyalty* (อ่าน role จาก cookie ที่ตั้งตอน login — ไม่ยิง DB เพิ่ม)
  const roleCookie = request.cookies.get(ROLE_COOKIE)?.value;
  if (
    user &&
    isLoyaltyOnlyRole(roleCookie) &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/auth') &&
    !isLoyaltyStaffPath(pathname)
  ) {
    return httpsRedirect(request, '/loyalty');
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
