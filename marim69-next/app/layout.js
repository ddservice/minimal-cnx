import './globals.css';

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
    <html lang="th">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.0.0/dist/tabler-icons.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
