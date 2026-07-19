// ฟอร์แมตเงินแบบไทย ใช้ร่วมทั้งแอป
export const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
