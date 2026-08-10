// แคตตาล็อกรางวัล — fallback ถ้ายังไม่รัน sql/add_loyalty_rewards.sql
// Source of truth หลัง migrate = ตาราง loyalty_rewards (แก้ได้ที่ /admin/loyalty)

export const FALLBACK_LOYALTY_REWARDS = [
  { id: 'free_coffee', name: 'กาแฟฟรี 1 แก้ว (เมนูร้อน/เย็น)', points: 10, icon: 'ti-coffee' },
  { id: 'free_pastry', name: 'ขนมหน้าร้านฟรี 1 ชิ้น', points: 15, icon: 'ti-cookie' },
  { id: 'discount_50', name: 'ส่วนลด 50 บาท', points: 20, icon: 'ti-ticket' },
];

/** @deprecated ใช้ loadActiveRewards() / props จากหน้าแทน — คงไว้ให้ import เก่าไม่พัง */
export const LOYALTY_REWARDS = FALLBACK_LOYALTY_REWARDS;

export function mapRewardRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    points: Number(row.points) || 0,
    icon: row.icon || 'ti-gift',
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order) || 0,
  };
}

/** โหลดรางวัลที่เปิดใช้ — fallback เป็น seed ในโค้ดถ้าตารางยังไม่มี */
export async function loadActiveRewards(supabase) {
  const { data, error } = await supabase
    .from('loyalty_rewards')
    .select('id, name, points, icon, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order')
    .order('id');

  if (error || !data) {
    return FALLBACK_LOYALTY_REWARDS.map((r) => ({ ...r, is_active: true, sort_order: 0 }));
  }
  return data.map(mapRewardRow);
}

export async function getRewardFromDb(supabase, rewardId) {
  const id = String(rewardId || '').trim();
  if (!id) return null;

  const { data, error } = await supabase
    .from('loyalty_rewards')
    .select('id, name, points, icon, is_active')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (!error && data) return mapRewardRow(data);

  // fallback seed (ยังไม่รัน migration)
  const fb = FALLBACK_LOYALTY_REWARDS.find((r) => r.id === id);
  return fb ? { ...fb, is_active: true } : null;
}

/** @deprecated ใช้ getRewardFromDb */
export function getReward(rewardId) {
  return FALLBACK_LOYALTY_REWARDS.find((r) => r.id === rewardId) || null;
}

/** ยอดซื้อ (บาท) → แต้มแนะนำ (ทุก 50 บาท = 1 แต้ม) — เป็น suggestion เท่านั้น */
export function suggestPointsFromSpend(amountBaht) {
  const n = Number(amountBaht) || 0;
  return Math.max(0, Math.floor(n / 50));
}

/** ไอคอนที่เลือกได้ในฟอร์ม admin */
export const REWARD_ICON_OPTIONS = [
  'ti-gift',
  'ti-coffee',
  'ti-cookie',
  'ti-ticket',
  'ti-trophy',
  'ti-cup',
  'ti-bolt',
];
