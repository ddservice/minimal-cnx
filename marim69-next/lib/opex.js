// OPEX 3 หมวด — item_key/category ต้องตรงกับ dashboard เดิม
// (WHT หัก ณ ที่จ่าย, VAT auto จากยอดขาย, สลิป/คอมมิชชั่น = ตัวช่วย เลื่อนไว้ทีหลัง)

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

export const OPEX_STAFF = {
  category: 'ค่าแรงพนักงาน',
  // รายการคงที่
  fixed: [
    { key: 'salary_dir', label: 'เงินเดือนกรรมการ' },
    { key: 'staff_sub', label: 'พนักงานแทน' },
  ],
  // พนักงานเป็นแถวแบบ dynamic → key = emp1, emp2, ...
  empPrefix: 'emp',
};

export const OPEX_TAX = {
  category: 'ภาษีและอื่นๆ',
  items: [{ key: 'vat', label: 'ภาษีมูลค่าเพิ่ม (VAT 7%)' }],
};

// รวม category ทั้งหมดที่ถือเป็น OPEX (ใช้ตอน query/summary)
export const OPEX_ALL_CATEGORIES = [
  OPEX_OPERATING.category,
  OPEX_STAFF.category,
  OPEX_TAX.category,
];

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
