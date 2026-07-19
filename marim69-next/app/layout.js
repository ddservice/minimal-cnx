import './globals.css';

export const metadata = {
  title: 'Minimal Maerim',
  description: 'ระบบจัดการร้าน',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
