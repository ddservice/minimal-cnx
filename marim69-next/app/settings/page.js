import { requireSession } from '../../lib/session';
import AppShell from '../../components/app-shell';
import PageHeader from '../../components/page-header';
import SettingsForm from './settings-form';
import ImportForm from './import-form';

export default async function SettingsPage() {
  const { supabase, role, name, isAdmin } = await requireSession();

  const { data: cfg } = await supabase
    .from('business_config')
    .select('value')
    .eq('key', 'biz_info')
    .maybeSingle();

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin}>
      <PageHeader icon="ti-settings" title="ตั้งค่า" />
      <SettingsForm biz={cfg?.value || {}} />
      {isAdmin && <ImportForm />}
    </AppShell>
  );
}
