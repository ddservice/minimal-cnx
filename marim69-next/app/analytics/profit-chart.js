import { fmtMoney } from '../../lib/format';

// กราฟกำไร/ขาดทุนรายเดือน — แท่งบวกขึ้น (เขียว) / ลบลง (แดง) จากเส้นศูนย์กลาง
export default function ProfitChart({ data }) {
  const rows = (data || []).filter((d) => d.hasData);
  if (!rows.length) return null;

  const W = 720, H = 240, padL = 10, padR = 10, padT = 16, padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const half = plotH / 2;
  const zeroY = padT + half;
  const maxAbs = Math.max(...rows.map((d) => Math.abs(d.profit)), 1);
  const n = rows.length;
  const slot = plotW / n;
  const barW = Math.max(3, Math.min(44, slot - 6));
  const rx = Math.min(3, barW / 2);

  return (
    <div className="card">
      <div className="card-head"><i className="ti ti-chart-line" /><h2>แนวโน้มกำไร/ขาดทุนรายเดือน</h2></div>
      <div className="card-body" style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="กราฟกำไรขาดทุนรายเดือน" style={{ display: 'block', minWidth: 360 }}>
          <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="var(--border)" strokeWidth="1" />
          {rows.map((d, i) => {
            const h = (Math.abs(d.profit) / maxAbs) * (half - 4);
            const x = padL + i * slot + (slot - barW) / 2;
            const y = d.profit >= 0 ? zeroY - h : zeroY;
            const color = d.profit >= 0 ? 'var(--success)' : 'var(--danger)';
            const mm = d.label.slice(0, 2);
            return (
              <g key={d.label}>
                <rect x={x} y={y} width={barW} height={Math.max(h, 0.5)} rx={rx} fill={color}>
                  <title>{`${d.label} — ${d.profit >= 0 ? 'กำไร' : 'ขาดทุน'} ${fmtMoney(d.profit)} ฿`}</title>
                </rect>
                <text x={x + barW / 2} y={H - 12} textAnchor="middle" fontSize="10" fill="var(--muted)">{mm}</text>
              </g>
            );
          })}
        </svg>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>เดือน (MM) · เลื่อนชี้ที่แท่งเพื่อดูยอด</div>
      </div>
    </div>
  );
}
