'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  upsertBranchAction,
  toggleBranchAction,
  upsertStaffProfileAction,
  deleteStaffProfileAction,
} from './actions';
function cleanStaffCode(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

export default function LoyaltyAdmin({ branches = [], staffProfiles = [], users = [] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState(null);

  const [branchForm, setBranchForm] = useState({ code: '', name: '', location: '' });
  const [staffForm, setStaffForm] = useState({
    user_id: '',
    branch_id: branches[0]?.id || '',
    staff_code: '',
    role: 'staff',
  });

  function flash(res) {
    setMsg({ text: res.message, type: res.status === 'ok' ? 'ok' : 'err' });
    if (res.status === 'ok') startTransition(() => router.refresh());
  }

  async function onCreateBranch(e) {
    e.preventDefault();
    const res = await upsertBranchAction(branchForm);
    flash(res);
    if (res.status === 'ok') setBranchForm({ code: '', name: '', location: '' });
  }

  async function onCreateStaff(e) {
    e.preventDefault();
    const res = await upsertStaffProfileAction(staffForm);
    flash(res);
    if (res.status === 'ok') {
      setStaffForm((f) => ({ ...f, user_id: '', staff_code: '', role: 'staff' }));
    }
  }

  const userLabel = (u) => {
    const nick = u.nickname ? ` (${u.nickname})` : '';
    return `${u.full_name || u.username}${nick} — ${u.role}`;
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {msg && (
        <div style={{ color: msg.type === 'ok' ? '#1e7e34' : '#c0392b', fontSize: 14 }}>
          {msg.text}
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <i className="ti ti-building-store" /> <h2>สาขา</h2>
        </div>
        <div className="card-body" style={{ display: 'grid', gap: 16 }}>
          <form onSubmit={onCreateBranch} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span className="muted" style={{ fontSize: 12 }}>รหัสสาขา</span>
              <input
                value={branchForm.code}
                onChange={(e) => setBranchForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="MAIN"
                required
              />
            </label>
            <label style={{ display: 'grid', gap: 4, gridColumn: 'span 2' }}>
              <span className="muted" style={{ fontSize: 12 }}>ชื่อสาขา</span>
              <input
                value={branchForm.name}
                onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="สาขาแม่ริม"
                required
              />
            </label>
            <label style={{ display: 'grid', gap: 4, gridColumn: 'span 2' }}>
              <span className="muted" style={{ fontSize: 12 }}>ที่ตั้ง</span>
              <input
                value={branchForm.location}
                onChange={(e) => setBranchForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="อ.แม่ริม จ.เชียงใหม่"
              />
            </label>
            <button className="btn btn-coffee" type="submit" disabled={isPending}>
              <i className="ti ti-plus" /> เพิ่มสาขา
            </button>
          </form>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>ชื่อ</th>
                  <th>ที่ตั้ง</th>
                  <th>สถานะ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 && (
                  <tr><td colSpan={5} className="muted">ยังไม่มีสาขา</td></tr>
                )}
                {branches.map((b) => (
                  <tr key={b.id}>
                    <td><code>{b.code}</code></td>
                    <td>{b.name}</td>
                    <td className="muted">{b.location || '—'}</td>
                    <td>{b.is_active ? 'เปิด' : 'ปิด'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: '4px 10px' }}
                        disabled={isPending}
                        onClick={async () => flash(await toggleBranchAction({ id: b.id, is_active: !b.is_active }))}
                      >
                        {b.is_active ? 'ปิด' : 'เปิด'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <i className="ti ti-user-check" /> <h2>ผูกพนักงาน ↔ สาขา</h2>
        </div>
        <div className="card-body" style={{ display: 'grid', gap: 16 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            พนักงานที่ถูกผูกจะได้สาขาตั้งต้นตอนแจก/แลกแต้มอัตโนมัติ (ยังเลือกสาขาอื่นในหน้าสะสมแต้มได้)
          </p>

          <form onSubmit={onCreateStaff} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 4, gridColumn: 'span 2' }}>
              <span className="muted" style={{ fontSize: 12 }}>ผู้ใช้</span>
              <select
                value={staffForm.user_id}
                onChange={(e) => setStaffForm((f) => ({ ...f, user_id: e.target.value }))}
                required
              >
                <option value="">— เลือกผู้ใช้ —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{userLabel(u)}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span className="muted" style={{ fontSize: 12 }}>สาขา</span>
              <select
                value={staffForm.branch_id}
                onChange={(e) => setStaffForm((f) => ({ ...f, branch_id: e.target.value }))}
                required
              >
                <option value="">— เลือกสาขา —</option>
                {branches.filter((b) => b.is_active).map((b) => (
                  <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span className="muted" style={{ fontSize: 12 }}>รหัสพนักงาน</span>
              <input
                value={staffForm.staff_code}
                onChange={(e) => setStaffForm((f) => ({ ...f, staff_code: cleanStaffCode(e.target.value) }))}
                placeholder="EMP01"
                required
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span className="muted" style={{ fontSize: 12 }}>บทบาทที่สาขา</span>
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="staff">staff</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <button className="btn btn-coffee" type="submit" disabled={isPending || !branches.length}>
              <i className="ti ti-link" /> ผูกพนักงาน
            </button>
          </form>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>ผู้ใช้</th>
                  <th>สาขา</th>
                  <th>บทบาท</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {staffProfiles.length === 0 && (
                  <tr><td colSpan={5} className="muted">ยังไม่มีพนักงานที่ผูกสาขา</td></tr>
                )}
                {staffProfiles.map((sp) => (
                  <tr key={sp.id}>
                    <td><code>{sp.staff_code}</code></td>
                    <td>{sp.profiles?.full_name || sp.profiles?.username || sp.user_id}</td>
                    <td>{sp.branches?.name || '—'}</td>
                    <td className="muted">{sp.role}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: '4px 10px' }}
                        disabled={isPending}
                        onClick={async () => {
                          if (!confirm(`ลบการผูก "${sp.staff_code}" ?`)) return;
                          flash(await deleteStaffProfileAction({ id: sp.id }));
                        }}
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
