// OPEX หมวด "ค่าใช้จ่ายดำเนินการ" — item_key ต้องตรงกับ dashboard เดิม
// (ค่าแรงพนักงาน + ภาษีและอื่นๆ = สไลซ์ถัดไป มี WHT/VAT/พนักงานหลายคน)
export const OPEX_OPERATING = {
  category: 'ค่าใช้จ่ายดำเนินการ',
  items: [
    { key: 'rent', label: 'ค่าเช่าร้าน' },
    { key: 'water', label: 'ค่าน้ำ' },
    { key: 'electric', label: 'ค่าไฟ' },
    { key: 'trash', label: 'ค่าทิ้งขยะ' },
    { key: 'internet', label: 'ค่าอินเทอร์เน็ต' },
    { key: 'account', label: 'ค่าทำบัญชี' },
    { key: 'repair', label: 'ค่าซ่อมบำรุงเครื่องชงกาแฟ' },
  ],
};

// '2026-07' (input type=month) -> '07/2026' (month_label ใน DB)
export function monthInputToLabel(m) {
  const [y, mo] = String(m).split('-');
  return `${mo}/${y}`;
}

// เดือนปัจจุบันตามเวลาไทย ในรูปแบบ input type=month ('YYYY-MM')
export function currentMonthInput() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 7);
}
