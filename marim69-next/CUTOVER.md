# แผน Cutover — ชี้โดเมนหลักมาที่แอป Next.js (zero-downtime)

เป้าหมาย: ให้ `minimalcnx.ddserviceth.com` (โดเมนที่พนักงานใช้จริง) เสิร์ฟแอป
Next.js แทนไฟล์ HTML เดิม โดย **ไม่มีช่วง down** และ **rollback ได้ใน 5 วินาที**

## ก่อน cutover — ทดสอบ parity ให้ผ่านทั้งหมด (บน staging)

ทำบน `minimal.ddserviceth.com` เทียบกับ dashboard เดิม เดือนเดียวกัน:

- [ ] บันทึกยอดขาย 2–3 วัน → ตัวเลข net (หัก GP) ตรงกับเดิม
- [ ] บันทึกรายจ่าย mat/bak/misc + VAT → total ตรง
- [ ] บันทึก OPEX ครบ 3 หมวด (ค่าดำเนินการ/ค่าแรง/ภาษี)
- [ ] หน้า **สรุปรายเดือน** — รายรับ/รายจ่าย/กำไร ตรงกับ overview เดิม
- [ ] **⬇ Excel** เปิดได้ ตัวเลขตรง
- [ ] แก้ไข/ลบ รายจ่าย และลบยอดขาย ทำงานถูก (ตามสิทธิ์)
- [ ] ล็อกอินด้วย user จริงทุก role (admin/manager/staff) เห็นเมนูถูกต้อง

## ขั้นตอน cutover

**1. สำรอง config เดิม (ไว้ rollback)**
```bash
sudo cp /etc/nginx/sites-available/minimalcnx.conf ~/minimalcnx.conf.bak
```

**2. แก้ `minimalcnx.conf`** — เก็บบรรทัด SSL/certbot (managed by Certbot) ไว้ทั้งหมด
เปลี่ยนเฉพาะเนื้อใน server block ที่ listen 443: ลบ `root` / `index` /
`location ~* \.(sql|...)` / `location /` เดิม แล้วใส่แทนด้วย:
```nginx
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
```

**3. ทดสอบ + reload (graceful — ไม่ตัดการเชื่อมต่อที่ค้างอยู่)**
```bash
sudo nginx -t && sudo systemctl reload nginx
curl -s -o /dev/null -w "%{http_code}\n" https://minimalcnx.ddserviceth.com/login   # 200
```

**4. Rollback (ถ้ามีปัญหา — กลับไป HTML เดิมทันที)**
```bash
sudo cp ~/minimalcnx.conf.bak /etc/nginx/sites-available/minimalcnx.conf
sudo nginx -t && sudo systemctl reload nginx
```

## หลัง cutover

- ไฟล์ HTML เดิมยังอยู่ครบใน `/var/www/minimalcnx` (ไม่ได้ลบ) — เก็บไว้เป็น fallback
- `minimal.ddserviceth.com` (staging) จะยังชี้ container เดียวกัน — จะเก็บไว้เป็น
  staging ต่อ หรือปิดก็ได้
- อัปเดตเวอร์ชันใหม่: `cd ~/apps/marim69-next && git pull && cd marim69-next && bash deploy.sh`

## หมายเหตุความปลอดภัย

- VPS ใช้ **read-only deploy key** (ไม่ใช่ PAT) สำหรับ `git pull` แล้ว
- container ผูก `127.0.0.1:3001` (ไม่ออกเน็ตตรง), nginx + Cloudflare อยู่หน้า
- ความปลอดภัยจริงยังอยู่ที่ **Supabase RLS + SECURITY DEFINER RPC** เหมือนเดิม
