// เขียนลง business_config พร้อมตรวจจับ RLS บล็อกแบบเงียบ
//
// Postgres RLS บน UPDATE ใช้ USING clause กำหนด "แถวที่มองเห็น" — ถ้า role
// ไม่ผ่านเงื่อนไข แถวนั้นจะถูกมองว่า "ไม่มีอยู่" สำหรับ UPDATE โดยไม่ error
// (ต่างจาก INSERT ที่ WITH CHECK ไม่ผ่านจะ throw error ชัดเจน) แปลว่าถ้า key
// นั้นเคยมีแถวอยู่แล้ว (กรณี upsert ครั้งที่ 2 เป็นต้นไป) และ RLS บล็อก
// จะได้ error:null + data ว่างเปล่า — ดูเหมือน "กดปุ่มแล้วไม่มีอะไรเกิดขึ้น"
// ฟังก์ชันนี้เช็ค data ว่างแล้วแปลงเป็น error message ที่เห็นได้ชัดแทน
export async function upsertBusinessConfig(supabase, key, value) {
  const { data, error } = await supabase
    .from('business_config')
    .upsert({ key, value })
    .select('key');
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: 'บันทึกไม่สำเร็จ — คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้' };
  return { ok: true };
}
