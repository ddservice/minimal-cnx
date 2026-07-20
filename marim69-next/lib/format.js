// ฟอร์แมตเงินแบบไทย ใช้ร่วมทั้งแอป
export const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });

// ตัด leading zero อัตโนมัติระหว่างพิมพ์ ("0123" -> "123") แต่คงค่า "0" เดี่ยวๆ และ "0.5" ไว้ตามปกติ
// (ไม่งั้นพิมพ์เลขทศนิยมไม่ได้) และตัดอักษร/สัญลักษณ์ที่ไม่ใช่ตัวเลข — กัน e/+/- ที่ input type=number
// ของเบราว์เซอร์ยอมให้พิมพ์ได้ (เช่น "1e5" จะกลายเป็นเลขมหาศาลโดยไม่ตั้งใจ) และเหลือจุดทศนิยมได้แค่จุดเดียว
export function sanitizeNumberString(raw) {
  let s = String(raw ?? '').replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  return s.replace(/^0+(?=\d)/, '');
}

// กันตัวเลขในช่องที่ควรเป็นชื่อคน (ชื่อ/นามสกุล/ชื่อบัญชี) — ไม่ใช้กับเลขบัตร ปชช./เลขบัญชีที่เป็นตัวเลขจริง
export function stripDigits(raw) {
  return String(raw ?? '').replace(/[0-9]/g, '');
}

// ตัดอักษรออกจากช่องที่ต้องเป็นตัวเลขล้วนแต่ "ห้ามตัด leading zero" (เลขบัตร ปชช./เลขบัญชี — เลข 0 ข้างหน้า
// มีความหมาย ไม่ใช่ตัวเลขจำนวนเงินที่ตัดทิ้งได้)
export function digitsOnly(raw) {
  return String(raw ?? '').replace(/\D/g, '');
}
