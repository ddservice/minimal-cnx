# Minimal Maerim 69 — Next.js + Supabase (โครงตั้งต้น)

โครงเริ่มต้นที่ปลอดภัยกว่าเดิม แทนไฟล์ HTML เดียว โดยยังใช้ **Supabase project เดิม** ได้ทันที

## ทำไมโครงนี้ปลอดภัยกว่า

- **Auth ฝั่งเซิร์ฟเวอร์** — login เป็น Server Action (`app/login/actions.js`) รหัสผ่านไม่ผ่าน logic ฝั่ง client ที่แก้ได้
- **XSS by default** — React escape ค่าใน `{...}` ให้อัตโนมัติ บั๊กแบบ `innerHTML` เกิดยากมาก
- **middleware กันหน้า** — ยังไม่ล็อกอินถูกเด้งไป `/login` ทุก request (`middleware.js`)
- **RLS คือด่านจริง** — โค้ดฝั่ง client ซ่อนไม่ได้ (framework ไหนก็ซ่อนไม่ได้) แต่ Postgres RLS + `SECURITY DEFINER` เป็นตัวกันจริง ยกมาจากระบบเดิมได้เลย
- **แยก key** — `NEXT_PUBLIC_*` เท่านั้นที่ไป browser; `service_role` key อยู่ฝั่งเซิร์ฟเวอร์

## วิธีรัน

```bash
cd marim69-next
npm install
cp .env.local.example .env.local   # แล้วตรวจค่าใน .env.local
npm run dev                        # เปิด http://localhost:3000
```

> ต้องมี user ใน Supabase อยู่แล้ว (เช่น admin) จึงจะล็อกอินได้ — ใช้ SQL functions เดิม (`admin_user_functions.sql`) สร้าง user ได้

## โครงไฟล์

```
marim69-next/
├─ middleware.js              # refresh session + กันหน้า
├─ lib/supabase/
│  ├─ client.js              # Supabase client ฝั่ง browser
│  ├─ server.js              # Supabase client ฝั่ง server
│  └─ middleware.js          # updateSession helper
└─ app/
   ├─ layout.js
   ├─ page.js                # redirect ไป /dashboard
   ├─ login/
   │  ├─ page.js             # ฟอร์ม login (client)
   │  └─ actions.js          # login server action
   └─ dashboard/
      ├─ page.js             # หน้า dashboard (server, ป้องกันแล้ว)
      └─ signout-button.js
```

## ขั้นต่อไป (แนะนำ)

1. ย้ายหน้าจัดการผู้ใช้ (admin) มาเป็น component + เรียก RPC เดิมผ่าน `supabase.rpc(...)`
2. ทำ logic admin ที่ sensitive เป็น Server Action หรือ Supabase Edge Function
3. เก็บ RLS policy + `SECURITY DEFINER` เดิมไว้เป็นด่านสุดท้ายเสมอ
4. deploy บน Vercel หรือ Netlify (รองรับ Next.js ทั้งคู่)
