'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveBizInfo } from './actions';

export default function SettingsForm({ biz }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState(null);
  const [f, setF] = useState({
    name: biz.name || '',
    phone: biz.phone || '',
    tax_id: biz.tax_id || '',
    address: biz.address || '',
    logo_url: biz.logo_url || '',
    free_cup_cost: biz.free_cup_cost ?? '55',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);
    const res = await saveBizInfo(f);
    setMsg({ text: res.message, type: res.status === 'ok' ? 'ok' : 'err' });
    if (res.status === 'ok') startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className="card">
      <div className="card-head"><i className="ti ti-building" /><h2>ข้อมูลบริษัท / ร้านค้า</h2></div>
      <div className="card-body">
        <p className="muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 14 }}>
          ใช้ในหัวเอกสารสลิปเงินเดือนและรายงาน
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="field"><label>ชื่อบริษัท / ร้านค้า</label><input className="input" value={f.name} onChange={set('name')} placeholder="เช่น ห้างหุ้นส่วนจำกัด มินิมอลคอฟฟี่" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div className="field"><label>เบอร์โทรศัพท์</label><input className="input" value={f.phone} onChange={set('phone')} placeholder="0xx-xxx-xxxx" /></div>
            <div className="field"><label>เลขผู้เสียภาษี (13 หลัก)</label><input className="input" value={f.tax_id} onChange={set('tax_id')} maxLength={13} placeholder="0000000000000" /></div>
          </div>
          <div className="field"><label>ที่อยู่</label><input className="input" value={f.address} onChange={set('address')} placeholder="ที่อยู่เต็ม" /></div>
          <div className="field"><label>URL โลโก้ (ลิงก์รูปภาพ)</label><input className="input" value={f.logo_url} onChange={set('logo_url')} placeholder="https://..." /></div>
          <div className="field"><label>ต้นทุนแก้วฟรี/แก้ว (บาท) — ค่าตั้งต้นหน้ายอดขาย</label><input className="input" type="number" min="0" step="any" value={f.free_cup_cost} onChange={set('free_cup_cost')} placeholder="55" /></div>
        </div>

        <button className="btn btn-coffee" type="submit" disabled={isPending} style={{ marginTop: 16 }}>
          <i className="ti ti-device-floppy" /> {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        {msg && (
          <div style={{ marginTop: 12, fontSize: 14, color: msg.type === 'ok' ? 'var(--success)' : 'var(--danger)' }}>{msg.text}</div>
        )}
      </div>
    </form>
  );
}
