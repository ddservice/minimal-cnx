import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import PageHeader from '../../components/page-header';
import {
  OPEX_OPERATING,
  OPEX_STAFF,
  OPEX_TAX,
  OPEX_ALL_CATEGORIES,
  monthInputToLabel,
  currentMonthInput,
} from '../../lib/opex';
import OpexForm from './opex-form';

export default async function OpexPage({ searchParams }) {
  const { supabase, role, name, isAdmin } = await requireSession();

  const sp = await searchParams;
  const monthInput = /^\d{4}-\d{2}$/.test(sp?.month || '') ? sp.month : currentMonthInput();
  const monthLabel = monthInputToLabel(monthInput);

  const { data: rows } = await supabase
    .from('expenses')
    .select('item_key, item_name, total_amount, category')
    .in('category', OPEX_ALL_CATEGORIES)
    .eq('month_label', monthLabel)
    .not('item_key', 'is', null);

  const operating = {};
  const staff = {};
  const tax = {};
  const employees = [];
  const OP_KEYS = new Set(OPEX_OPERATING.items.map((i) => i.key));
  const STAFF_KEYS = new Set(OPEX_STAFF.fixed.map((i) => i.key));
  const TAX_KEYS = new Set(OPEX_TAX.items.map((i) => i.key));

  (rows || []).forEach((r) => {
    const k = r.item_key;
    if (OP_KEYS.has(k)) operating[k] = r.total_amount;
    else if (STAFF_KEYS.has(k)) staff[k] = r.total_amount;
    else if (TAX_KEYS.has(k)) tax[k] = r.total_amount;
    else if (k.startsWith(OPEX_STAFF.empPrefix)) {
      const idx = parseInt(k.slice(OPEX_STAFF.empPrefix.length), 10);
      if (Number.isFinite(idx)) employees[idx - 1] = { label: r.item_name || '', amount: r.total_amount };
    }
  });

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin}>
      <PageHeader icon="ti-building-store" title="ค่าดำเนินการ (รายเดือน)" />
      <OpexForm
        monthInput={monthInput}
        monthLabel={monthLabel}
        existing={{ operating, staff, tax, employees: employees.filter(Boolean) }}
      />
    </AppShell>
  );
}
