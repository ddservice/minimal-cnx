// pm2 config — สำหรับ deploy บน VPS แบบไม่ใช้ Docker
// ใช้: pm2 start ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: 'marim69-next',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/marim69-next',
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // ค่า NEXT_PUBLIC_* จริงอยู่ใน .env.local หรือ .env.production
      },
    },
  ],
};
