import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';
import { OPEX_OPERATING, monthInputToLabel, currentMonthInput } from '../../lib/opex';
import OpexForm from './opex-form';

export default async function OpexPage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const monthInput = /^\d{4}-\d{2}$/.test(sp?.month || '') ? sp.month : currentMonthInput();
  const monthLabel = monthInputToLabel(monthInput);

  // ค่าที่บันทึกไว้แล้วของเดือนนี้ (item_key -> total_amount)
  const { data: rows } = await supabase
    .from('expenses')
    .select('item_key, total_amount')
    .eq('category', OPEX_OPERATING.category)
    .eq('month_label', monthLabel)
    .not('item_key', 'is', null);

  const existing = {};
  (rows || []).forEach((r) => {
    if (r.item_key) existing[r.item_key] = r.total_amount;
  });

  return (
    <div className="wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>ค่าใช้จ่ายดำเนินการ (รายเดือน)</h1>
        <Link className="link-btn" href="/dashboard">← กลับ Dashboard</Link>
      </div>

      <OpexForm monthInput={monthInput} monthLabel={monthLabel} existing={existing} />
    </div>
  );
}
