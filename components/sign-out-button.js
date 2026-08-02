'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button className="link-btn" onClick={signOut} title="ออกจากระบบ">
      <i className="ti ti-logout" /> <span>ออกจากระบบ</span>
    </button>
  );
}
