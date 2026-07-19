import './globals.css';

export const metadata = {
  title: 'Minimal Maerim',
  description: 'ระบบจัดการร้าน',
};

export const viewport = {
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
