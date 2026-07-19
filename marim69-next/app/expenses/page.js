import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';
import { EXPENSE_CATEGORY_VALUES } from '../../lib/expense-categories';
import ExpenseForm from './expense-form';
import ExpenseList from './expense-list';

function todayISO() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export default async function ExpensesPage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

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
    <div className="wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>บันทึกรายจ่าย</h1>
        <Link className="link-btn" href="/dashboard">← กลับ Dashboard</Link>
      </div>

      <ExpenseForm date={date} category={category} />
      <ExpenseList rows={existing || []} date={date} />
    </div>
  );
}
