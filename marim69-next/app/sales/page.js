import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import PageHeader from '../../components/page-header';
import SalesForm from './sales-form';

function todayISO() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export default async function SalesPage({ searchParams }) {
  const { supabase, role, name, isAdmin, allowed } = await requireSession();

  const sp = await searchParams;
  const date = sp?.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO();

  const [{ data: existing }, { data: bizCfg }] = await Promise.all([
    supabase.from('sales_daily').select('*').eq('date', date).maybeSingle(),
    supabase.from('business_config').select('value').eq('key', 'biz_info').maybeSingle(),
  ]);
  const defaultCoffeePrice = Number(bizCfg?.value?.free_cup_cost) || 55;

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-cash" title="บันทึกยอดขายรายวัน" />
      <SalesForm date={date} existing={existing || null} defaultCoffeePrice={defaultCoffeePrice} />
    </AppShell>
  );
}
