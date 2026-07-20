'use client';

import { useRouter } from 'next/navigation';
import DateField from '../../components/date-field';

export default function RangePicker({ from, to }) {
  const router = useRouter();
  const go = (f, t) => router.push(`/analytics?from=${f}&to=${t}`);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 150 }}><DateField type="month" value={from} max={to} onChange={(v) => go(v, to)} /></div>
      <span className="muted" style={{ fontSize: 13 }}>ถึง</span>
      <div style={{ minWidth: 150 }}><DateField type="month" value={to} min={from} onChange={(v) => go(from, v)} /></div>
    </div>
  );
}
