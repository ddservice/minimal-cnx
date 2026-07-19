import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';
import SignOutButton from './signout-button';

// Server Component — รันฝั่งเซิร์ฟเวอร์ ดึงข้อมูลก่อนส่ง HTML ไปให้ผู้ใช้
export default async function DashboardPage() {
  const supabase = await createClient();

  // getUser() ตรวจ session กับเซิร์ฟเวอร์ Supabase จริง (เชื่อถือได้)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // ดึง profile — RLS policy บน public.profiles เป็นตัวกำหนดว่าเห็นแถวไหนได้
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, nickname, role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role || 'manager';
  const isAdmin = role === 'admin';

  // ตัวอย่างดึงข้อมูลสรุป — RLS กรองให้อัตโนมัติตามสิทธิ์ผู้ใช้
  const { data: summary } = await supabase.rpc('get_monthly_summary', {
    p_month_label: monthLabel(),
  });

  const salesCount = summary?.sales?.length ?? 0;
  const expenseCount = summary?.expenses?.length ?? 0;

  return (
    <div className="wrap">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          {/* ค่าทุกตัวใน {} ถูก escape อัตโนมัติ — ไม่มี XSS แบบ innerHTML */}
          <h1 style={{ margin: 0, fontSize: 22 }}>
            สวัสดี {profile?.full_name || profile?.username || 'ผู้ใช้'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13 }}>
            สิทธิ์: <span className="chip">{role}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isAdmin && (
            <Link className="link-btn" href="/admin">
              จัดการผู้ใช้
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>

      <div
        style={{
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14,
        }}
      >
        <Stat label={`ยอดขายเดือนนี้ (${monthLabel()})`} value={salesCount} unit="รายการ" />
        <Stat label="รายจ่ายเดือนนี้" value={expenseCount} unit="รายการ" />
      </div>

      {isAdmin && (
        <section
          style={{
            marginTop: 28,
            padding: 18,
            border: '1px solid var(--border)',
            borderRadius: 14,
            background: 'var(--surface)',
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 16 }}>เมนูผู้ดูแลระบบ</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>
            ส่วนนี้แสดงเฉพาะ admin — แต่จำไว้ว่าการซ่อน UI ไม่ใช่ความปลอดภัย
            ฟังก์ชันจริง (admin_create_user ฯลฯ) ต้องเช็ค role ซ้ำในฝั่ง Postgres
            ด้วย SECURITY DEFINER เสมอ
          </p>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div
      style={{
        padding: 16,
        border: '1px solid var(--border)',
        borderRadius: 14,
        background: 'var(--surface)',
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
        {value}{' '}
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

function monthLabel() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
