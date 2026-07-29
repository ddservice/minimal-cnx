# คู่มือ Deploy ขึ้น VPS

มี 2 ทางเลือก — เลือกทางใดทางหนึ่ง

> **ก่อนเริ่ม:** สร้างไฟล์ env บนเซิร์ฟเวอร์ (อย่า commit ค่าจริง)
> ```
> NEXT_PUBLIC_SUPABASE_URL=https://fkhfrylvronkmktlmmia.supabase.co
> NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_SoNHJNrw4yfgZI_RYHHTjg_WgQ0lan-
> ```

---

## ทางเลือก A: Docker (แนะนำ — ง่ายและ reproducible)

```bash
# บน VPS
git clone <repo> && cd marim69-next

docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://fkhfrylvronkmktlmmia.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_SoNHJNrw4yfgZI_RYHHTjg_WgQ0lan-" \
  -t marim69-next .

docker run -d --name marim69 --restart unless-stopped -p 3000:3000 marim69-next
```

## ทางเลือก B: Node + pm2 (ไม่ใช้ Docker)

```bash
# ติดตั้ง Node 22 + pm2 (ครั้งเดียว)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs && sudo npm i -g pm2

# deploy
sudo mkdir -p /var/www/marim69-next && cd /var/www/marim69-next
git clone <repo> .          # หรือ rsync โค้ดขึ้นมา
npm ci
# สร้าง .env.local ตามด้านบน
npm run build
pm2 start ecosystem.config.js && pm2 save && pm2 startup
```

---

## Reverse proxy + HTTPS (ทั้งสองทางเลือก)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx-marim69.conf /etc/nginx/sites-available/marim69
# แก้ server_name ในไฟล์เป็นโดเมนจริง
sudo ln -s /etc/nginx/sites-available/marim69 /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com      # ออกใบรับรอง SSL อัตโนมัติ
```

## อัปเดตเวอร์ชันใหม่

- **Docker:** `git pull && docker build ... -t marim69-next . && docker rm -f marim69 && docker run ...`
- **pm2:** `git pull && npm ci && npm run build && pm2 reload marim69-next`

## Checklist ความปลอดภัย

- [ ] ไฟล์ env มีแค่ `NEXT_PUBLIC_*` (publishable key) — **ไม่มี** service_role key
- [ ] firewall เปิดเฉพาะ 80/443 (และ 22) — ปิด 3000 จากภายนอก
- [ ] ออก HTTPS ด้วย certbot แล้ว
- [ ] RLS policies + `SECURITY DEFINER` ใน Supabase ยังเปิดใช้งาน (ด่านความปลอดภัยจริง)
