'use client';

import { useState, useTransition } from 'react';
import { searchCustomerAction, registerCustomerAction, issuePointsAction, redeemRewardAction } from './actions';
import { sanitizeNumberString, digitsOnly } from '../../lib/format';

const REWARDS = [
  { id: 'free_coffee', name: 'กาแฟฟรี 1 แก้ว (เมนูร้อน/เย็น)', points: 10, icon: 'ti-coffee' },
  { id: 'free_pastry', name: 'ขนมหน้าร้านฟรี 1 ชิ้น', points: 15, icon: 'ti-cookie' },
  { id: 'discount_50', name: 'ส่วนลด 50 บาท', points: 20, icon: 'ti-ticket' },
];

const RFM_COLOR = {
  Champions: '#16a34a',
  Loyal: '#2563eb',
  Potential: '#d97706',
  'At-Risk': '#dc2626',
  Lost: '#6b7280',
  New: '#8b5cf6',
};

export default function LoyaltyClient({ branches = [] }) {
  const [query, setQuery] = useState('');
  const [customer, setCustomer] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // สเตตัสการลงทะเบียนใหม่
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');

  // สเตตัสการออกแต้ม
  const [spendAmount, setSpendAmount] = useState('');
  const [pointsInput, setPointsInput] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || '');

  const [msg, setMsg] = useState(null);
  const [isPending, startTransition] = useTransition();

  // ค้นหาลูกค้า
  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setMsg(null);
    setNotFound(false);

    startTransition(async () => {
      const res = await searchCustomerAction(query);
      if (res.status === 'ok') {
        setCustomer(res.customer);
      } else if (res.status === 'not_found') {
        setCustomer(null);
        setNotFound(true);
        setNewPhone(digitsOnly(query));
      } else {
        setMsg({ text: res.message, type: 'err' });
      }
    });
  }

  // ลงทะเบียนลูกค้าใหม่
  async function handleRegister(e) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await registerCustomerAction({ phone: newPhone, name: newName });
      if (res.status === 'ok') {
        setCustomer(res.customer);
        setNotFound(false);
        setQuery(res.customer.phone);
        setMsg({ text: res.message, type: 'ok' });
      } else {
        setMsg({ text: res.message, type: 'err' });
      }
    });
  }

  // คำนวณแต้มอัตโนมัติจากยอดซื้อ (ทุก 50 บาท = 1 แต้ม)
  function handleSpendChange(val) {
    const s = sanitizeNumberString(val);
    setSpendAmount(s);
    const num = Number(s) || 0;
    const calcPts = Math.floor(num / 50);
    setPointsInput(calcPts > 0 ? String(calcPts) : '');
  }

  // แจกแต้ม
  async function handleIssuePoints(e) {
    e.preventDefault();
    if (!customer) return;
    setMsg(null);

    const pts = Number(pointsInput);
    if (!pts || pts <= 0) {
      setMsg({ text: 'กรุณาระบุจำนวนแต้มที่ต้องการสะสม', type: 'err' });
      return;
    }

    startTransition(async () => {
      const res = await issuePointsAction({
        customer_id: customer.id,
        points: pts,
        receipt_number: receiptNo,
        branch_id: selectedBranch,
      });

      if (res.status === 'ok') {
        setMsg({ text: res.message, type: 'ok' });
        // อัปเดตแต้มหน้าจอ
        setCustomer((prev) => (prev ? { ...prev, points_balance: (prev.points_balance || 0) + pts } : null));
        setSpendAmount('');
        setPointsInput('');
        setReceiptNo('');
      } else {
        setMsg({ text: res.message, type: 'err' });
      }
    });
  }

  // แลกของรางวัล
  async function handleRedeem(reward) {
    if (!customer) return;
    if ((customer.points_balance || 0) < reward.points) {
      setMsg({ text: `แต้มไม่เพียงพอ ต้องการ ${reward.points} แต้ม`, type: 'err' });
      return;
    }
    if (!confirm(`ยืนยันการแลก "${reward.name}" ใช้ ${reward.points} แต้ม สำหรับลูกค้า ${customer.name}?`)) return;

    setMsg(null);
    startTransition(async () => {
      const res = await redeemRewardAction({
        customer_id: customer.id,
        reward_id: reward.id,
        reward_name: reward.name,
        points_used: reward.points,
        branch_id: selectedBranch,
      });

      if (res.status === 'ok') {
        setMsg({ text: res.message, type: 'ok' });
        setCustomer((prev) => (prev ? { ...prev, points_balance: Math.max(0, (prev.points_balance || 0) - reward.points) } : null));
      } else {
        setMsg({ text: res.message, type: 'err' });
      }
    });
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* ส่วนที่ 1: ค้นหาลูกค้า */}
      <div className="card">
        <div className="card-head">
          <i className="ti ti-search" /> <h2>ค้นหาลูกค้าสะสมแต้ม</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <input
                type="text"
                className="input"
                placeholder="พิมพ์เบอร์โทรศัพท์ หรือ LINE User ID..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              <i className="ti ti-search" /> {isPending ? 'กำลังค้นหา...' : 'ค้นหา'}
            </button>
          </form>

          {/* แจ้งเตือนข้อความ */}
          {msg && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: 600,
                background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2',
                color: msg.type === 'ok' ? '#16a34a' : '#dc2626',
                border: `1px solid ${msg.type === 'ok' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              <i className={`ti ${msg.type === 'ok' ? 'ti-circle-check' : 'ti-alert-circle'}`} /> {msg.text}
            </div>
          )}
        </div>
      </div>

      {/* กรณีไม่พบลำดับลูกค้า -> ฟอร์มสมัครสมาชิกใหม่ */}
      {notFound && (
        <div className="card" style={{ borderColor: 'var(--color-primary)' }}>
          <div className="card-head">
            <i className="ti ti-user-plus" /> <h2>ไม่พบข้อมูล — ลงทะเบียนสมาชิกใหม่</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleRegister} style={{ display: 'grid', gap: 12, maxWidth: 400 }}>
              <div>
                <label style={lbl}>เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  className="input"
                  value={newPhone}
                  onChange={(e) => setNewPhone(digitsOnly(e.target.value))}
                  placeholder="08X-XXX-XXXX"
                  required
                />
              </div>
              <div>
                <label style={lbl}>ชื่อลูกค้า (หรือชื่อเล่น)</label>
                <input
                  type="text"
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น คุณสมชาย"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                <i className="ti ti-check" /> สมัครสมาชิกและเริ่มสะสมแต้ม
              </button>
            </form>
          </div>
        </div>
      )}

      {/* กรณีพบล็อกเกอร์ลูกค้า -> ข้อมูลลูกค้า + ฟอร์มแจกแต้ม/แลกของรางวัล */}
      {customer && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* ข้อมูลลูกค้า & แต้มสะสม */}
          <div className="card">
            <div className="card-head">
              <i className="ti ti-id-badge" /> <h2>ข้อมูลสมาชิก</h2>
              <span
                style={{
                  marginLeft: 'auto',
                  padding: '2px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  background: RFM_COLOR[customer.rfm_segment] || '#6b7280',
                }}
              >
                {customer.rfm_segment || 'New'}
              </span>
            </div>
            <div className="card-body">
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{customer.name}</div>
              <div className="muted" style={{ fontSize: 13 }}><i className="ti ti-phone" /> {customer.phone}</div>
              {customer.line_user_id && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>LINE: {customer.line_user_id}</div>}

              <div
                style={{
                  margin: '16px 0',
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-2)',
                  textAlign: 'center',
                }}
              >
                <div className="muted" style={{ fontSize: 12 }}>แต้มสะสมคงเหลือ</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-primary)', margin: '4px 0' }}>
                  {customer.points_balance || 0} <span style={{ fontSize: 16, fontWeight: 600 }}>แต้ม</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  เข้ามาใช้บริการแล้ว {customer.visit_count || 0} ครั้ง
                </div>
              </div>

              {/* เลือกสาขาการทำรายการ */}
              {branches.length > 0 && (
                <div>
                  <label style={lbl}>สาขาทำรายการ</label>
                  <select
                    className="input"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ฟอร์มสะสมแต้ม (Earn Points) */}
          <div className="card">
            <div className="card-head">
              <i className="ti ti-plus" /> <h2>สะสมแต้ม (Earn Points)</h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleIssuePoints} style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={lbl}>ยอดซื้อสินค้า (บาท)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="เช่น 150"
                    value={spendAmount}
                    onChange={(e) => handleSpendChange(e.target.value)}
                  />
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>คำนวณอัตโนมัติ: ทุก 50 บาท = 1 แต้ม</div>
                </div>

                <div>
                  <label style={lbl}>จำนวนแต้มที่ได้รับ *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="ระบุจำนวนแต้ม..."
                    value={pointsInput}
                    onChange={(e) => setPointsInput(sanitizeNumberString(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label style={lbl}>เลขที่ใบเสร็จ (ถ้ามี)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="เช่น REC-20260802-001"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={isPending || !pointsInput}>
                  <i className="ti ti-gift" /> {isPending ? 'กำลังบันทึก...' : `บันทึกสะสม +${pointsInput || 0} แต้ม`}
                </button>
              </form>
            </div>
          </div>

          {/* การแลกของรางวัล (Redeem Rewards) */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-head">
              <i className="ti ti-trophy" /> <h2>แลกของรางวัล (Redeem Rewards)</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {REWARDS.map((rw) => {
                  const canRedeem = (customer.points_balance || 0) >= rw.points;
                  return (
                    <div
                      key={rw.id}
                      style={{
                        padding: 14,
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        background: canRedeem ? 'var(--color-surface)' : 'var(--color-surface-2)',
                        opacity: canRedeem ? 1 : 0.6,
                        display: 'flex',
                        flexDirection: 'column',
                        justify: 'space-between',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-md)',
                            background: canRedeem ? 'var(--color-primary)' : 'var(--color-muted)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                          }}
                        >
                          <i className={`ti ${rw.icon}`} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{rw.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>
                            {rw.points} แต้ม
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`btn ${canRedeem ? 'btn-primary' : ''}`}
                        onClick={() => handleRedeem(rw)}
                        disabled={!canRedeem || isPending}
                        style={{ width: '100%', fontSize: 12, padding: '6px 12px' }}
                      >
                        {canRedeem ? 'กดแลกรางวัล' : `แต้มไม่พอ (ขาด ${rw.points - (customer.points_balance || 0)} แต้ม)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 };
