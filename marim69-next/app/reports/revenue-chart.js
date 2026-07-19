import { fmtMoney } from '../../lib/format';

// กราฟแท่งยอดขายสุทธิรายวัน — single series (magnitude/time) → สีเดียว, ไม่มี legend
// อ่านข้อมูลอย่างเดียว (จาก sales rows) ไม่แก้ DB
export default function RevenueChart({ sales }) {
  const days = (sales || [])
    .map((s) => ({ date: String(s.date), v: Number(s.net_revenue || 0) }))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!days.length) return null;

  const W = 720;
  const H = 220;
  const padL = 10;
  const padR = 10;
  const padT = 18;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const baseY = padT + plotH;

  const maxV = Math.max(...days.map((d) => d.v), 1);
  const n = days.length;
  const slot = plotW / n;
  const barW = Math.max(2, Math.min(40, slot - 2)); // gap 2px ระหว่างแท่ง
  const rx = Math.min(3, barW / 2);
  const labelEvery = n <= 16 ? 1 : Math.ceil(n / 16);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 2, padding: 16, background: 'var(--surface)', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>ยอดขายสุทธิรายวัน</h2>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>สูงสุด {fmtMoney(maxV)} ฿</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="กราฟยอดขายสุทธิรายวัน" style={{ display: 'block', minWidth: 320 }}>
          {/* baseline (แกนจาง) */}
          <line x1={padL} y1={baseY} x2={W - padR} y2={baseY} stroke="var(--border)" strokeWidth="1" />

          {days.map((d, i) => {
            const h = maxV > 0 ? (d.v / maxV) * plotH : 0;
            const x = padL + i * slot + (slot - barW) / 2;
            const y = baseY - h;
            const day = Number(d.date.slice(8, 10));
            return (
              <g key={d.date}>
                <rect x={x} y={y} width={barW} height={h} rx={rx} fill="var(--coffee)">
                  <title>{`${d.date} — ${fmtMoney(d.v)} ฿`}</title>
                </rect>
                {i % labelEvery === 0 && (
                  <text x={x + barW / 2} y={baseY + 15} textAnchor="middle" fontSize="10" fill="var(--muted)">
                    {day}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>วันที่ในเดือน · เลื่อนชี้ที่แท่งเพื่อดูยอด</div>
    </div>
  );
}
