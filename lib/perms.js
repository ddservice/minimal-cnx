// แท็บเมนู + สิทธิ์การมองเห็นตามตำแหน่ง (visibility เท่านั้น — ด่านจริงคือ RLS)
export const NAV_TABS = [
  { href: '/dashboard', label: 'ภาพรวม', icon: 'ti-layout-dashboard' },
  { href: '/sales', label: 'ยอดขาย', icon: 'ti-cash' },
  { href: '/expenses', label: 'รายจ่าย', icon: 'ti-receipt' },
  { href: '/opex', label: 'ค่าดำเนินการ', icon: 'ti-building-store' },
  { href: '/reports', label: 'สรุป', icon: 'ti-chart-bar' },
  { href: '/analytics', label: 'วิเคราะห์', icon: 'ti-chart-line' },
  { href: '/settings', label: 'ตั้งค่า', icon: 'ti-settings' },
];

// ตำแหน่งที่ปรับสิทธิ์ได้ (admin เห็นทุกอย่างเสมอ)
export const MANAGED_ROLES = [
  { value: 'co-admin', label: 'Co-Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
];

// perms = { role: { '/href': true|false } } — ค่าเริ่มต้น (ไม่มี config) = เห็นทุกแท็บ
export function allowedHrefs(role, perms) {
  if (role === 'admin') return NAV_TABS.map((t) => t.href);
  const rp = perms?.[role];
  if (!rp) return NAV_TABS.map((t) => t.href);
  return NAV_TABS.filter((t) => rp[t.href] !== false).map((t) => t.href);
}
