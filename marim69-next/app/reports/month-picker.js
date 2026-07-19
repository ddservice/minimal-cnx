'use client';

import { useRouter } from 'next/navigation';

export default function MonthPicker({ value }) {
  const router = useRouter();
  return (
    <input
      type="month"
      value={value}
      onChange={(e) => {
        if (/^\d{4}-\d{2}$/.test(e.target.value)) router.push(`/reports?month=${e.target.value}`);
      }}
      style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 2, fontSize: 14 }}
    />
  );
}
