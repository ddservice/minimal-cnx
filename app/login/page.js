'use client';

import { useActionState } from 'react';
import { login } from './actions';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, { error: '' });

  return (
    <div className="center">
      <form className="login-card" action={formAction}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div className="brand-icon"><i className="ti ti-coffee" /></div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700 }}>Minimal Maerim</h1>
            <p className="muted" style={{ fontSize: 12, marginTop: 1 }}>เข้าสู่ระบบเพื่อจัดการร้าน</p>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 12 }}>
          <label>ชื่อผู้ใช้</label>
          <input className="input" name="username" placeholder="username" autoComplete="username" autoFocus />
        </div>
        <div className="field">
          <label>รหัสผ่าน</label>
          <input className="input" name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
        </div>

        <div style={{ color: 'var(--danger)', fontSize: 13, minHeight: 18, marginTop: 10 }}>{state?.error}</div>

        <button className="btn btn-coffee btn-full" type="submit" disabled={pending} style={{ marginTop: 6 }}>
          <i className="ti ti-login-2" /> {pending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
}
