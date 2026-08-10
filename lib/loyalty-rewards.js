// Catalog รางวัลสะสมแต้ม — source of truth ฝั่ง server
// Client แสดงจากที่นี่; redeemRewardAction บังคับ points จากรายการนี้เท่านั้น

export const LOYALTY_REWARDS = [
  { id: 'free_coffee', name: 'กาแฟฟรี 1 แก้ว (เมนูร้อน/เย็น)', points: 10, icon: 'ti-coffee' },
  { id: 'free_pastry', name: 'ขนมหน้าร้านฟรี 1 ชิ้น', points: 15, icon: 'ti-cookie' },
  { id: 'discount_50', name: 'ส่วนลด 50 บาท', points: 20, icon: 'ti-ticket' },
];

export function getReward(rewardId) {
  return LOYALTY_REWARDS.find((r) => r.id === rewardId) || null;
}

/** ยอดซื้อ (บาท) → แต้มแนะนำ (ทุก 50 บาท = 1 แต้ม) — เป็น suggestion เท่านั้น */
export function suggestPointsFromSpend(amountBaht) {
  const n = Number(amountBaht) || 0;
  return Math.max(0, Math.floor(n / 50));
}
