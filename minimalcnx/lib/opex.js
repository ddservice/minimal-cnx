// OPEX 3 หมวด — item_key/category ต้องตรงกับ dashboard เดิม
// (WHT หัก ณ ที่จ่าย, VAT auto จากยอดขาย, สลิป/คอมมิชชั่น = ตัวช่วย เลื่อนไว้ทีหลัง)

export const OPEX_OPERATING = {
  category: 'ค่าใช้จ่ายดำเนินการ',
  // def = ค่าตั้งต้น (แสดงเป็น placeholder เหมือน dashboard เดิม)
  items: [
    { key: 'rent', label: 'ค่าเช่าร้าน', def: 5000 },
    { key: 'water', label: 'ค่าน้ำ' },
    { key: 'electric', label: 'ค่าไฟ' },
    { key: 'trash', label: 'ค่าทิ้งขยะ', def: 200 },
    { key: 'internet', label: 'ค่าอินเทอร์เน็ต', def: 319.93 },
    { key: 'account', label: 'ค่าทำบัญชี', def: 2000 },
    { key: 'repair', label: 'ค่าซ่อมบำรุงเครื่องชงกาแฟ' },
  ],
};

export const OPEX_STAFF = {
  category: 'ค่าแรงพนักงาน',
  // รายการคงที่ (def = ค่าตั้งต้นที่เติมให้เลย เหมือนเดิม)
  fixed: [
    { key: 'salary_dir', label: 'เงินเดือนกรรมการ', def: 36000 },
    { key: 'staff_sub', label: 'พนักงานแทน', def: 0 },
  ],
  // พนักงานเป็นแถวแบบ dynamic → key = emp1, emp2, ...
  empPrefix: 'emp',
};

// พนักงานตั้งต้น (ยกมาจาก EMP_CONFIG_DEFAULT เดิม)
export const DEFAULT_EMPLOYEES = [
  { label: 'พนักงานคนที่ 1', salary: '13000', position: '1500' },
  { label: 'พนักงานคนที่ 2', salary: '12000', position: '0' },
];

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

/**
 * คำนวณยอดรวมค่าดำเนินการ (OPEX) สำหรับเดือน
 * - หากรายการใดมีการบันทึกไว้ใน DB แล้ว จะใช้ยอดที่บันทึกจริง
 * - หากรายการใดยังไม่ได้บันทึกสำหรับเดือนนี้ จะนำค่าตั้งต้น (Fixed Defaults) มาคำนวณให้อัตโนมัติทันที
 *   (เงินเดือนกรรมการ 36,000, ค่าเช่าร้าน 5,000, ค่าทำบัญชี 2,000, ค่าอินเทอร์เน็ต 319.93, ค่าขยะ 200, พนักงานตั้งต้น)
 */
export function computeEffectiveOpex(expenses, opexDefaults = {}) {
  const savedMap = {};
  (expenses || []).forEach((e) => {
    if (e.item_key && OPEX_ALL_CATEGORIES.includes(e.category)) {
      savedMap[e.item_key] = Number(e.total_amount || 0);
    }
  });

  const defVal = (key, fallback) => {
    if (opexDefaults && opexDefaults[key] !== undefined && opexDefaults[key] !== '' && opexDefaults[key] !== null) {
      const n = Number(opexDefaults[key]);
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  };

  const defaults = {
    rent: defVal('rent', 5000),
    trash: defVal('trash', 200),
    internet: defVal('internet', 319.93),
    account: defVal('account', 2000),
    salary_dir: defVal('salary_dir', 36000),
    emp1: 13000 + 1500 + 725, // พนักงาน 1 ตั้งต้น (เงินเดือน+ตำแหน่ง+ประกันสังคม)
    emp2: 12000 + 0 + 600,    // พนักงาน 2 ตั้งต้น
  };

  let total = 0;
  for (const [key, defaultAmt] of Object.entries(defaults)) {
    if (savedMap[key] !== undefined) {
      total += savedMap[key];
    } else {
      total += defaultAmt;
    }
  }

  const standardKeys = new Set(Object.keys(defaults));
  for (const [key, amt] of Object.entries(savedMap)) {
    if (!standardKeys.has(key)) {
      total += amt;
    }
  }

  return total;
}
