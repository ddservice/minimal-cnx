import { fmtMoney } from '../../../lib/format';

const ACTION_LABEL = { INSERT: 'เพิ่ม', UPDATE: 'แก้ไข', DELETE: 'ลบ' };
const ACTION_COLOR = { INSERT: 'var(--success)', UPDATE: 'var(--taupe-dark)', DELETE: 'var(--danger)' };
const TABLE_LABEL = { sales_daily: 'ยอดขาย', expenses: 'รายจ่าย', business_config: 'ตั้งค่าระบบ' };
const HIDE_FIELDS = new Set(['id', 'created_at', 'updated_at', 'key']); // key ของ business_config โชว์ใน summary แล้ว

// ค่าตัวเลข (มักลงท้ายด้วย _amount/_cost/_revenue/total) แสดงแบบมีจุลภาค, object (เช่น business_config.value
// ที่เป็น jsonb) แสดงเป็น JSON ดิบ, อย่างอื่นแสดงดิบ
function fmtVal(field, v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'number' && /amount|cost|revenue|total|price/i.test(field)) return fmtMoney(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function diffRows(oldData, newData) {
  const keys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
  const out = [];
  keys.forEach((k) => {
    if (HIDE_FIELDS.has(k)) return;
    const ov = oldData ? oldData[k] : undefined;
    const nv = newData ? newData[k] : undefined;
    if (JSON.stringify(ov) !== JSON.stringify(nv)) out.push({ field: k, old: ov, new: nv });
  });
  return out;
}

export default function AuditRow({ row, performer }) {
  const label = ACTION_LABEL[row.action] || row.action;
  const color = ACTION_COLOR[row.action] || 'var(--muted)';
  const when = new Date(row.performed_at).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const who = performer?.full_name || performer?.username || 'ไม่ทราบผู้ใช้';
  const configKey = row.table_name === 'business_config' ? (row.new_data?.key || row.old_data?.key) : null;

  const changes =
    row.action === 'UPDATE'
      ? diffRows(row.old_data, row.new_data)
      : row.action === 'INSERT'
        ? diffRows(null, row.new_data)
        : diffRows(row.old_data, null);

  return (
    <details style={rowBox}>
      <summary style={summaryStyle}>
        <span style={{ ...badge, background: color }}>{label}</span>
        <span style={{ fontWeight: 600 }}>
          {TABLE_LABEL[row.table_name] || row.table_name}
          {configKey ? ` — ${configKey}` : ''}
        </span>
        <span className="muted" style={{ fontSize: 12 }}>{when}</span>
        <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>โดย {who}</span>
      </summary>
      <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        {changes.length === 0 ? (
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>ไม่มีการเปลี่ยนแปลงค่า</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                <th style={th}>ฟิลด์</th>
                <th style={th}>ค่าเดิม</th>
                <th style={th}>ค่าใหม่</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c) => (
                <tr key={c.field} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ ...td, fontWeight: 600 }}>{c.field}</td>
                  <td style={{ ...td, color: row.action !== 'INSERT' ? 'var(--danger)' : 'var(--muted)' }}>
                    {row.action === 'INSERT' ? '—' : fmtVal(c.field, c.old)}
                  </td>
                  <td style={{ ...td, color: row.action !== 'DELETE' ? 'var(--success)' : 'var(--muted)' }}>
                    {row.action === 'DELETE' ? '—' : fmtVal(c.field, c.new)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}

const rowBox = { border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', background: 'var(--surface)' };
const summaryStyle = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', cursor: 'pointer', listStyle: 'none' };
const badge = { color: '#fff', padding: '3px 11px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 700 };
const th = { padding: '5px 8px', fontWeight: 600 };
const td = { padding: '5px 8px', fontVariantNumeric: 'tabular-nums' };
