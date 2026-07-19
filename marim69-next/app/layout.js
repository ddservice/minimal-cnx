import './globals.css';

export const metadata = {
  title: 'Minimal Maerim 69',
  description: 'ระบบจัดการร้าน — Next.js + Supabase',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
