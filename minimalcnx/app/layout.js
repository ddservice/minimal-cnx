import { Prompt } from 'next/font/google';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';
import './globals.css';

// Prompt รองรับทั้งไทย+อังกฤษในฟอนต์เดียว — โหลดผ่าน next/font (self-host อัตโนมัติ ไม่ยิง
// request ไป Google Fonts ตอน runtime, ไม่มี layout shift) แล้วส่งเป็น CSS variable ให้ globals.css ใช้
const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-prompt',
});

export const metadata = {
  title: 'Minimal Maerim',
  description: 'ระบบจัดการร้าน',
};

// สำคัญ: การกำหนด viewport export เองจะ "แทนที่" ค่าเริ่มต้นของ Next.js ทั้งหมด
// (ไม่ merge) — ถ้าลืมใส่ width/initialScale, iOS Safari จะถือว่าไม่มี viewport
// meta tag ที่ถูกต้อง แล้วย่อทั้งหน้าให้เหมือนเดสก์ท็อป (~980px) แทนที่จะเป็นมือถือจริง
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3d2b1f',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={prompt.variable}>
      <body>{children}</body>
    </html>
  );
}
