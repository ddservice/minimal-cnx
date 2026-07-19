// หมวดรายจ่ายทั่วไป (mat/bak/misc) — ต้องตรงกับค่าที่ dashboard เดิมใช้
export const EXPENSE_CATEGORIES = [
  { value: 'ต้นทุนวัตถุดิบ', label: 'ต้นทุนวัตถุดิบ' },
  { value: 'ต้นทุนขนมหน้าร้าน', label: 'ต้นทุนขนม' },
  { value: 'รายจ่ายจิปาถะ', label: 'รายจ่ายทั่วไป' },
];

export const EXPENSE_CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value);

export const PAYMENT_METHODS = ['บัญชี หจก.', 'บัญชีส่วนตัว', 'เงินสด'];
