import { redirect } from 'next/navigation';
import { requireSession } from '../lib/session';
import { homePathForRole } from '../lib/perms';

export default async function Home() {
  const { role } = await requireSession();
  redirect(homePathForRole(role));
}
