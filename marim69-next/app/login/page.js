'use client';

import { useActionState } from 'react';
import { login } from './actions';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, { error: '' });

  return (
    <div className="center">
      <form className="card" action={formAction}>
        <h1 style={{ margin: '0 0 4px', fontSize: 20 }}>Minimal Maerim</h1>
        <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 13 }}>
          เข้าสู่ระบบ
        </p>

        <input
          className="field"
          name="username"
          placeholder="ชื่อผู้ใช้"
          autoComplete="username"
          autoFocus
        />
        <input
          className="field"
          name="password"
          type="password"
          placeholder="รหัสผ่าน"
          autoComplete="current-password"
        />

        {/* {state.error} ถูก escape อัตโนมัติโดย React — ปลอดภัยจาก XSS by default */}
        <div className="err">{state?.error}</div>

        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
}
