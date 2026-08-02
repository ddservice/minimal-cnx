import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // สร้าง output แบบ standalone → Docker image เล็ก, รันด้วย `node server.js`
  output: 'standalone',
  // ปักหมุด root ที่โฟลเดอร์นี้ ไม่ให้ trace ขึ้นไปข้างบน (standalone จะได้ไม่ซ้อน path)
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
