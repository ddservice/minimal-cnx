import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import PageHeader from '../../components/page-header';
import { EXPENSE_CATEGORY_VALUES } from '../../lib/expense-categories';
import ExpenseForm from './expense-form';
import ExpenseList from './expense-list';

function todayISO() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export default async function ExpensesPage({ searchParams }) {
  const { supabase, role, name, isAdmin } = await requireSession();

  const sp = await searchParams;
  const date = sp?.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO();
  const category = EXPENSE_CATEGORY_VALUES.includes(sp?.category)
    ? sp.category
    : EXPENSE_CATEGORY_VALUES[0];

  const { data: existing } = await supabase
    .from('expenses')
    .select('id, item_name, subcategory, unit, unit_price, quantity, total_amount, payment_method')
    .eq('date', date)
    .eq('category', category)
    .order('logged_at', { ascending: true });

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin}>
      <PageHeader icon="ti-receipt" title="บันทึกรายจ่าย" />
      <ExpenseForm date={date} category={category} />
      <ExpenseList rows={existing || []} date={date} />
    </AppShell>
  );
}
