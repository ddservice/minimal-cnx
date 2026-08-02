// หัวข้อหน้า: ไอคอน + ชื่อ + ช่อง action ด้านขวา (เช่น ตัวเลือกเดือน/ปุ่ม export)
export default function PageHeader({ icon, title, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 22, color: 'var(--latte)' }} />
      <h1 style={{ fontSize: 20, margin: 0, flex: '1 1 auto' }}>{title}</h1>
      {children}
    </div>
  );
}
