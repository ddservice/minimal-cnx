'use client';

import { useState } from 'react';
import ExpenseForm from './expense-form';
import ExpenseList from './expense-list';

// ควบคุมหมวดหมู่ฝั่ง client → สลับหมวดได้ทันที (ไม่ต้องโหลด server ใหม่)
export default function ExpensesClient({ date, initialCategory, allExisting, catalog }) {
  const [category, setCategory] = useState(initialCategory);

  const catForCat = catalog.filter((c) => c.category === category);

  return (
    <>
      {/* key={category} → เปลี่ยนหมวดแล้วฟอร์มรีเซ็ตใหม่ (ไม่ค้างชื่อรายการเดิม) */}
      <ExpenseForm key={category} date={date} category={category} onCategory={setCategory} catalog={catForCat} />
      {/* แสดงทุกหมวดของวันนั้น ไม่กรองตามแท็บที่เลือกอยู่ — กันพนักงานเข้าใจผิดว่า "ไม่มีรายการ" ทั้งที่บันทึกไว้ในอีกหมวด */}
      <ExpenseList rows={allExisting} date={date} />
    </>
  );
}
