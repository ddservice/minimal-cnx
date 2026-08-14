import { createClient } from './supabase/server';
import { canAccess, denyMessage } from './perms';

export async function loadAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, supabase, user: null, profile: null, role: null, perms: {}, isAdmin: false };

  const [{ data: profile }, { data: permCfg }] = await Promise.all([
    supabase.from('profiles').select('role, full_name, username, nickname, is_active').eq('id', user.id).maybeSingle(),
    supabase.from('business_config').select('value').eq('key', 'role_perms').maybeSingle(),
  ]);

  const role = profile?.role || 'manager';
  const perms = permCfg?.value || {};
  return {
    ok: true,
    supabase,
    user,
    profile,
    role,
    perms,
    isAdmin: role === 'admin',
  };
}

/** กัน Server Action ตามระดับสิทธิ์ของหน้า — defense-in-depth (RLS ยังเป็นด่านจริง) */
export async function requireCap(href, action) {
  const a = await loadAccess();
  if (!a.user) return { ...a, allowed: false, message: 'กรุณาเข้าสู่ระบบ' };
  if (a.profile && a.profile.is_active === false) {
    return { ...a, allowed: false, message: 'บัญชีถูกปิดใช้งาน' };
  }
  if (!canAccess(a.role, href, action, a.perms)) {
    return { ...a, allowed: false, message: denyMessage(action) };
  }
  return { ...a, allowed: true };
}
