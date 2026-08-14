import { headers } from 'next/headers';

/** สรุปเครื่องจาก User-Agent ตามแนวทาง audit (device / OS / browser) */
export function summarizeDevice(ua) {
  const s = String(ua || '');
  if (!s) return 'ไม่ทราบเครื่อง';
  const form = /iPad|Tablet/i.test(s)
    ? 'แท็บเล็ต'
    : /Mobile|Android|iPhone/i.test(s)
      ? 'มือถือ'
      : 'คอมพิวเตอร์';
  const os = /Windows NT/i.test(s)
    ? 'Windows'
    : /Android/i.test(s)
      ? 'Android'
      : /iPhone|iPad|iOS/i.test(s)
        ? 'iOS'
        : /Mac OS X|Macintosh/i.test(s)
          ? 'macOS'
          : /Linux/i.test(s)
            ? 'Linux'
            : 'OS อื่น';
  const browser = /Edg\//i.test(s)
    ? 'Edge'
    : /OPR\/|Opera/i.test(s)
      ? 'Opera'
      : /Chrome\//i.test(s)
        ? 'Chrome'
        : /Firefox\//i.test(s)
          ? 'Firefox'
          : /Safari/i.test(s)
            ? 'Safari'
            : 'เบราว์เซอร์อื่น';
  return `${form} · ${os} · ${browser}`;
}

function firstIp(raw) {
  return String(raw || '')
    .split(',')
    .map((x) => x.trim())
    .find((x) => x && x !== 'unknown') || '';
}

/** อ่าน IP / UA / ประเทศจาก header ที่ nginx + Cloudflare ส่งมา (Server Action / Route Handler) */
export async function getRequestMeta(pathHint) {
  const h = await headers();
  const ip = firstIp(
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')
  );
  const userAgent = h.get('user-agent') || '';
  const country = (h.get('cf-ipcountry') || '').toUpperCase();
  const path = pathHint || h.get('x-invoke-path') || '';
  return {
    ip,
    userAgent,
    device: summarizeDevice(userAgent),
    country: country && country !== 'XX' ? country : '',
    path,
  };
}
