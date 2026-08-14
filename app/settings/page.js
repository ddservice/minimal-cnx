import { requirePage } from '../../lib/session';
import AppShell from '../../components/app-shell';
import PageHeader from '../../components/page-header';
import SettingsForm from './settings-form';
import ImportForm from './import-form';
import DataTools from './data-tools';
import RolePerms from './role-perms';
import OpexDefaults from './opex-defaults';

export default async function SettingsPage() {
  const { supabase, role, name, isAdmin, allowed, caps } = await requirePage('/settings');

  const { data: cfgs } = await supabase
    .from('business_config')
    .select('key, value')
    .in('key', ['biz_info', 'role_perms', 'opex_defaults']);
  const biz = cfgs?.find((c) => c.key === 'biz_info')?.value || {};
  const perms = cfgs?.find((c) => c.key === 'role_perms')?.value || {};
  const opexDef = cfgs?.find((c) => c.key === 'opex_defaults')?.value || {};

  return (
    <AppShell role={role} name={name} isAdmin={isAdmin} allowed={allowed}>
      <PageHeader icon="ti-settings" title="ตั้งค่า" />
      <SettingsForm biz={biz} canEdit={!!caps['/settings']?.edit} />
      {isAdmin && <OpexDefaults defaults={opexDef} />}
      {isAdmin && <RolePerms perms={perms} />}
      {isAdmin && <ImportForm />}
      {isAdmin && <DataTools />}
    </AppShell>
  );
}
