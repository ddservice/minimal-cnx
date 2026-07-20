'use client';

// ช่องวันที่/เดือนที่หน้าตาคุมได้ 100% (ไม่มีเส้น/ขอบ native ของ iOS โผล่มาให้เห็น) แต่ยังใช้
// native <input type="date"|"month"> จริงซ้อนอยู่ข้างใต้แบบโปร่งใส (opacity:0, เต็มพื้นที่) เพื่อให้
// แตะแล้วเปิด picker ของระบบตามปกติ — ส่วนที่มองเห็นเป็นแค่ <span> แสดงผลที่จัดสไตล์เองล้วนๆ
export default function DateField({ value, onChange, type = 'date', min, max, disabled, placeholder = 'เลือก' }) {
  const display = formatValue(value, type);
  return (
    <div className={`date-field${disabled ? ' disabled' : ''}`}>
      <span className="date-field-display">
        <i className="ti ti-calendar-event" />
        {display || <span className="muted">{placeholder}</span>}
      </span>
      <input
        className="date-field-input"
        type={type}
        value={value || ''}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
    </div>
  );
}

function formatValue(value, type) {
  if (!value) return '';
  if (type === 'month') {
    const [y, m] = value.split('-').map(Number);
    if (!y || !m) return '';
    return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
