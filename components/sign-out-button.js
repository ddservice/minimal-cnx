'use client';
import Icon from './icon';

import { useTransition } from 'react';
import { signOutAction } from '../app/login/actions';

export default function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="link-btn"
      type="button"
      disabled={pending}
      title="ออกจากระบบ"
      onClick={() => startTransition(() => signOutAction())}
    >
      <Icon name="ti-logout" /> <span>{pending ? 'กำลังออก...' : 'ออกจากระบบ'}</span>
    </button>
  );
}
