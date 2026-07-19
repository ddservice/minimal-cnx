import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import PageHeader from '../../components/page-header';
import { EXPENSE_CATEGORY_VALUES } from '../../lib/expense-categories';
import ExpensesClient from './expenses-client';

function todayISO() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export default async function ExpensesPage({ searchParams }) {
  const { supabase, role, name, isAdmin, allowed } = await requireSession();

  const sp = await searchParams;
  const date = sp?.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO();
  const initialCategory = EXPENSE_CATEGORY_VALUES.includes(sp?.category)
    ? sp.category
    : EXPENSE_CATEGORY_VALUES[0];

  // รายการที่บันทึกแล้วของวันนี้ (ทุกหมวด) — กรองตามหมวดฝั่ง client
  const { data: existing } = await supabase
    .from('expenses')
    .select('id, category, item_name, subcategory, unit, unit_price, quantity, total_amount, payment_method')
    .eq('date', date)
    .order('logged_at', { ascending: true });

  // catalog: รายการล่าสุดต่อ (หมวด+ชื่อ) พร้อมหน่วย/ราคา — จำหน่วยของสินค้าเดิม
  const { data: recent } = await supabase
    .from('expenses')
    .select('category, item_name, subcategory, unit, unit_price, date, logged_at')
    .order('logged_at', { ascending: false })
    .limit(800);
  const histMap = {};
  (recent || []).forEach((r) => {
    const nm = (r.item_name || '').trim();
    if (!nm || r.unit_price == null) return;
    const k = `${r.category}|${nm}`;
    histMap[k] = histMap[k] || [];
    if (histMap[k].length < 8) histMap[k].push({ price: Number(r.unit_price), date: r.date || '' });
  });
  const seen = {};
  const catalog = [];
  (recent || []).forEach((r) => {
    const nm = (r.item_name || '').trim();
    if (!nm) return;
    const k = `${r.category}|${nm}`;
    if (seen[k]) return;
    seen[k] = 1;
    catalog.push({
      category: r.category,
      name: nm,
      supplier: r.subcategory || '',
      unit: r.unit || '',
      unit_price: r.unit_price != null ? Number(r.unit_price) : null,
      history: histMap[k] || [],
    });
  });

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-receipt" title="บันทึกรายจ่าย" />
      <ExpensesClient date={date} initialCategory={initialCategory} allExisting={existing || []} catalog={catalog} />
    </AppShell>
  );
}
