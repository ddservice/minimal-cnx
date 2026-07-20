'use client';

import { useRouter } from 'next/navigation';

export default function RangePicker({ from, to }) {
  const router = useRouter();
  const go = (f, t) => router.push(`/analytics?from=${f}&to=${t}`);
  const style = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 13 };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input type="month" value={from} max={to} onChange={(e) => go(e.target.value, to)} style={style} />
      <span className="muted" style={{ fontSize: 13 }}>ถึง</span>
      <input type="month" value={to} min={from} onChange={(e) => go(from, e.target.value)} style={style} />
    </div>
  );
}
