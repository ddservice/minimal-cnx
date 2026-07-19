import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';
import SalesForm from './sales-form';

// วันที่วันนี้ตามเวลาไทย (UTC+7)
function todayISO() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export default async function SalesPage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const date =
    sp?.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO();

  // ถ้าวันนั้นเคยบันทึกแล้ว → โหลดมาแก้ไข (RLS: authenticated อ่านได้)
  const { data: existing } = await supabase
    .from('sales_daily')
    .select('*')
    .eq('date', date)
    .maybeSingle();

  return (
    <div className="wrap">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>บันทึกยอดขายรายวัน</h1>
        <Link className="link-btn" href="/dashboard">
          ← กลับ Dashboard
        </Link>
      </div>

      <SalesForm date={date} existing={existing || null} />
    </div>
  );
}
