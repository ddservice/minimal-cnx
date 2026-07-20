'use client';

import { useRouter } from 'next/navigation';
import DateField from '../../components/date-field';

export default function MonthPicker({ value }) {
  const router = useRouter();
  return (
    <div style={{ minWidth: 160 }}>
      <DateField
        type="month"
        value={value}
        onChange={(v) => {
          if (/^\d{4}-\d{2}$/.test(v)) router.push(`/reports?month=${v}`);
        }}
      />
    </div>
  );
}
