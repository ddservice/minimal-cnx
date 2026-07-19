'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { OPEX_OPERATING, OPEX_STAFF, OPEX_TAX, DEFAULT_EMPLOYEES } from '../../lib/opex';
import { saveOpexAction } from './actions';

const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const sumObj = (o) => Object.values(o).reduce((a, v) => a + (Number(v) || 0), 0);

const COMM_RATES = [['0', 'ไม่มี'], ['0.01', '1%'], ['0.015', '1.5%'], ['0.02', '2%'], ['0.025', '2.5%'], ['0.03', '3%']];

// คำนวณสลิปเงินเดือน (ตรงกับ dashboard เดิม)
function payslip(e, income) {
  const salary = Number(e.salary) || 0;
  const position = Number(e.position) || 0;
  const diligence = Number(e.diligence) || 0;
  const commAmt = Math.round(income * (Number(e.commRate) || 0));
  const ssoBase = Math.min(salary, 15000); // ฐานประกันสังคมสูงสุด 15,000
  const ssoEmp = Math.round(ssoBase * 0.05);
  const ssoCo = Math.round(ssoBase * 0.05);
  const gross = salary + position + commAmt + diligence;
  const commTax = Math.round(commAmt * 0.03);
  const netTransfer = salary - ssoEmp + position + diligence + (commAmt - commTax);
  const companyCost = gross + ssoCo; // ค่าใช้จ่ายบริษัท = gross + ประกันสังคมบริษัท
  return { commAmt, ssoEmp, ssoCo, gross, commTax, netTransfer, companyCost };
}

// พิมพ์ใบรับรอง/สลิปเงินเดือน (เปิดหน้าต่างพิมพ์)
function printSlip(e, ps, monthLabel, bizInfo) {
  const biz = bizInfo || {};
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const [mm, yy] = String(monthLabel || '').split('/');
  const salary = Number(e.salary) || 0, position = Number(e.position) || 0, diligence = Number(e.diligence) || 0;
  const fullName = [e.fullname, e.lastname].filter(Boolean).join(' ') || e.label;
  const hasBank = e.bank_name || e.account_no;
  const row = (label, val, cls = '') => `<tr class="${cls}"><td>${label}</td><td class="num">${val}</td></tr>`;
  const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">
<title>สลิปเงินเดือน ${esc(e.label)} ${mm || ''}/${yy || ''}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Sarabun','Segoe UI',sans-serif;font-size:13.5px;color:#1a1a1a;padding:32px 40px;max-width:680px;margin:0 auto;line-height:1.5}
  .head{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #1a1a1a;margin-bottom:16px}
  .bname{font-size:17px;font-weight:700}
  .bsub{font-size:11px;color:#666;margin-top:2px}
  .meta{text-align:right;font-size:11px;color:#444}
  .meta b{display:block;font-size:12px;color:#1a1a1a}
  .title{background:#1a1a1a;color:#fff;text-align:center;padding:8px;font-size:15px;font-weight:700;letter-spacing:1px;margin-bottom:16px}
  .emp{display:flex;justify-content:space-between;font-size:13px;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;margin-bottom:14px}
  td{padding:7px 12px;border:1px solid #d8cdbd}
  th{background:#f5f1e8;padding:8px 12px;border:1px solid #c8b89a;text-align:left;font-size:12px;font-weight:700}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .sub td{background:#faf7f0;font-weight:700;border-top:2px solid #c8b89a}
  .ded td{color:#b00000}
  .net td{background:#1a1a1a;color:#fff;font-weight:700;font-size:14px}
  .sign{display:flex;justify-content:space-between;margin-top:44px;font-size:12px;color:#444}
  .sign div{text-align:center;width:45%}
  .sign .line{border-top:1px solid #999;margin-bottom:5px;padding-top:34px}
  @media print{body{padding:0}}
</style></head><body>
  <div class="head">
    <div><div class="bname">${esc(biz.name || 'Minimal Maerim')}</div><div class="bsub">${esc(biz.tax_id ? 'เลขผู้เสียภาษี ' + biz.tax_id : '')}${biz.address ? '<br>' + esc(biz.address) : ''}</div></div>
    <div class="meta"><b>สลิปเงินเดือน</b>งวด ${esc(mm || '--')}/${esc(yy || '----')}<br>วันที่ ${esc(today)}</div>
  </div>
  <div class="title">หนังสือรับรอง / สลิปเงินเดือน</div>
  <table>
    <tr><th colspan="2">ข้อมูลพนักงาน</th></tr>
    <tr><td>ชื่อ-นามสกุล</td><td>${esc(fullName)}</td></tr>
    ${e.title ? `<tr><td>ตำแหน่ง</td><td>${esc(e.title)}</td></tr>` : ''}
    ${e.id_card ? `<tr><td>เลขบัตรประชาชน</td><td>${esc(e.id_card)}</td></tr>` : ''}
    <tr><td>งวดเดือน</td><td>${esc(mm || '--')}/${esc(yy || '----')}</td></tr>
  </table>
  <table>
    <tr><th>รายรับ</th><th class="num">บาท</th></tr>
    ${row('เงินเดือน', f(salary))}
    ${row('ค่าประจำตำแหน่ง', f(position))}
    ${row('Commission', f(ps.commAmt))}
    ${row('เบี้ยขยัน', f(diligence))}
    ${row('รวมรายรับ (Gross)', f(ps.gross), 'sub')}
  </table>
  <table>
    <tr><th>รายการหัก</th><th class="num">บาท</th></tr>
    ${row('ประกันสังคม (พนักงาน 5%)', '− ' + f(ps.ssoEmp), 'ded')}
    ${row('หัก ณ ที่จ่าย Commission 3%', '− ' + f(ps.commTax), 'ded')}
    ${row('โอนสุทธิให้พนักงาน', f(ps.netTransfer), 'net')}
  </table>
  <table>
    <tr><th>ส่วนของบริษัท</th><th class="num">บาท</th></tr>
    ${row('ประกันสังคม (บริษัทสมทบ 5%)', f(ps.ssoCo))}
    ${row('รวมค่าใช้จ่ายบริษัท', f(ps.companyCost), 'sub')}
  </table>
  ${hasBank ? `<table>
    <tr><th colspan="2">ข้อมูลการโอนเงิน</th></tr>
    <tr><td>ธนาคาร</td><td>${esc(e.bank_name || '—')}</td></tr>
    <tr><td>เลขที่บัญชี</td><td>${esc(e.account_no || '—')}</td></tr>
    <tr><td>ชื่อบัญชี</td><td>${esc(e.account_holder || fullName)}</td></tr>
  </table>` : ''}
  <div class="sign"><div><div class="line"></div>ผู้จ่ายเงิน</div><div><div class="line"></div>ผู้รับเงิน</div></div>
</body></html>`;
  const w = window.open('', '_blank', 'width=760,height=920');
  if (!w) { alert('เบราว์เซอร์บล็อกป๊อปอัป — โปรดอนุญาตป๊อปอัปเพื่อพิมพ์สลิป'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

// จำนวนเดือนที่ผ่านมาจากเดือนที่เลือก (สำหรับ gate ย้อนหลัง)
function monthsAgo(monthLabel) {
  const [mm, yy] = String(monthLabel || '').split('/').map(Number);
  if (!mm || !yy) return 0;
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return (now.getFullYear() - yy) * 12 + (now.getMonth() + 1 - mm);
}

export default function OpexForm({ monthInput, monthLabel, existing, income = 0, bizInfo = {}, isAdmin = false }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState(null);

  const initFixed = (items, saved, useDefault) => {
    const o = {};
    items.forEach((it) => {
      o[it.key] = saved[it.key] != null ? String(saved[it.key]) : (useDefault && it.def != null ? String(it.def) : '');
    });
    return o;
  };

  const [operating, setOperating] = useState(() => initFixed(OPEX_OPERATING.items, existing.operating, false));
  const [staff, setStaff] = useState(() => initFixed(OPEX_STAFF.fixed, existing.staff, true)); // เติมค่าตั้งต้น (36000/0)
  const [tax, setTax] = useState(() => {
    const t = initFixed(OPEX_TAX.items, existing.tax, false);
    // เติม VAT อัตโนมัติจากยอดขาย ถ้ายังไม่มีค่าที่บันทึกไว้ (เหมือน dashboard เดิม)
    if ((t.vat === '' || t.vat == null) && income > 0) t.vat = String(Math.round(income * 0.07));
    return t;
  });
  const [employees, setEmployees] = useState(() => {
    let slips = [];
    if (typeof window !== 'undefined') {
      try { slips = JSON.parse(localStorage.getItem('mm69_emp_slip') || '[]'); } catch {}
    }
    const base = existing.employees?.length
      ? existing.employees.map((e) => ({ label: e.label || '', amount: e.amount != null ? String(e.amount) : '' }))
      : DEFAULT_EMPLOYEES.map((e) => ({ label: e.label, amount: '' }));
    return base.map((e, i) => {
      const def = DEFAULT_EMPLOYEES[i] || {};
      const slip = slips[i] || {};
      return {
        // เติมเงินเดือน/ตำแหน่งตั้งต้นจากข้อมูลเดิม (localStorage ทับได้)
        salary: slip.salary ?? def.salary ?? '',
        position: slip.position ?? def.position ?? '',
        commRate: slip.commRate ?? '0',
        diligence: slip.diligence ?? '',
        // รายละเอียดสำหรับสลิป (จำใน localStorage)
        fullname: slip.fullname ?? '',
        lastname: slip.lastname ?? '',
        title: slip.title ?? '',
        id_card: slip.id_card ?? '',
        bank_name: slip.bank_name ?? '',
        account_no: slip.account_no ?? '',
        account_holder: slip.account_holder ?? '',
        showSlip: false,
        label: e.label || slip.label || def.label || `พนักงานคนที่ ${i + 1}`,
        amount: e.amount, // ยอดที่บันทึกจริง (จาก DB) — คงไว้ ไม่ทับด้วย slip อัตโนมัติ
      };
    });
  });

  // จำค่าสลิป (เงินเดือน/ตำแหน่ง/คอมฯ) ในเครื่อง — ไม่แตะ DB
  useEffect(() => {
    const slim = employees.map((e) => ({
      label: e.label, salary: e.salary, position: e.position, commRate: e.commRate, diligence: e.diligence,
      fullname: e.fullname, lastname: e.lastname, title: e.title, id_card: e.id_card,
      bank_name: e.bank_name, account_no: e.account_no, account_holder: e.account_holder,
    }));
    try { localStorage.setItem('mm69_emp_slip', JSON.stringify(slim)); } catch {}
  }, [employees]);

  const empTotal = employees.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const grand = sumObj(operating) + sumObj(staff) + sumObj(tax) + empTotal;

  function onMonthChange(e) {
    if (/^\d{4}-\d{2}$/.test(e.target.value)) router.push(`/opex?month=${e.target.value}`);
  }

  const setEmp = (i, k, v) => setEmployees(employees.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)));
  const addEmp = () => setEmployees([...employees, { label: `พนักงานคนที่ ${employees.length + 1}`, amount: '' }]);
  const removeEmp = (i) => setEmployees(employees.length > 1 ? employees.filter((_, idx) => idx !== i) : employees);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);
    const res = await saveOpexAction({ month_label: monthLabel, operating, staff, tax, employees });
    setMsg({ text: res.message, type: res.status === 'ok' ? 'ok' : 'err' });
    if (res.status === 'ok') startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={card}>
        <label style={lbl}>เดือน</label>
        <input type="month" value={monthInput} onChange={onMonthChange} style={{ ...inp, maxWidth: 200 }} />
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>({monthLabel})</span>
      </div>

      {/* หมวด 1: ค่าใช้จ่ายดำเนินการ */}
      <Section title="ค่าใช้จ่ายดำเนินการ" total={sumObj(operating)}>
        {OPEX_OPERATING.items.map((it) => {
          const onChange = (v) => setOperating({ ...operating, [it.key]: v });
          if (it.key === 'rent') {
            const rv = Number(operating.rent) || 0;
            return (
              <div key={it.key}>
                <Row label={it.label} value={operating[it.key]} onChange={onChange} placeholder={it.def} />
                {rv > 0 && (
                  <div style={whtBox}>
                    <div style={{ ...whtRow, background: '#f0fdf4' }}>
                      <span><i className="ti ti-wallet" /> จ่ายเจ้าของ (95%)</span>
                      <strong style={{ color: '#16a34a' }}>{fmt(Math.round(rv * 0.95))} ฿</strong>
                    </div>
                    <div style={{ ...whtRow, background: '#fff7ed' }}>
                      <span><i className="ti ti-receipt-tax" /> หัก ณ ที่จ่าย 5% (นำส่งสรรพากร)</span>
                      <strong style={{ color: '#ea580c' }}>{fmt(Math.round(rv * 0.05))} ฿</strong>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          return <Row key={it.key} label={it.label} value={operating[it.key]} onChange={onChange} placeholder={it.def} />;
        })}
      </Section>

      {/* หมวด 2: ค่าแรงพนักงาน */}
      <Section title="ค่าแรงพนักงาน" total={sumObj(staff) + empTotal}>
        {OPEX_STAFF.fixed.map((it) => (
          <Row key={it.key} label={it.label} value={staff[it.key]} onChange={(v) => setStaff({ ...staff, [it.key]: v })} />
        ))}
        <div style={{ borderTop: '1px dashed var(--border)', margin: '8px 0', paddingTop: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>พนักงาน</div>
          {employees.map((e, i) => {
            const ps = payslip(e, income);
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input value={e.label} onChange={(ev) => setEmp(i, 'label', ev.target.value)} placeholder="ชื่อ/ตำแหน่ง" style={{ ...inp, flex: '1 1 140px' }} />
                  <input type="number" min="0" step="any" value={e.amount} onChange={(ev) => setEmp(i, 'amount', ev.target.value)} placeholder="0" style={{ ...inp, flex: '0 1 120px' }} />
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>฿</span>
                  <button type="button" onClick={() => setEmp(i, 'showSlip', !e.showSlip)} style={btnSlip}>
                    <i className="ti ti-calculator" /> สลิป
                  </button>
                  {employees.length > 1 && (
                    <button type="button" onClick={() => removeEmp(i)} style={btnRemove}>ลบ</button>
                  )}
                </div>

                {e.showSlip && (
                  <div style={slipBox}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 10 }}>
                      <SlipField label="เงินเดือน" value={e.salary} onChange={(v) => setEmp(i, 'salary', v)} />
                      <SlipField label="ค่าประจำตำแหน่ง" value={e.position} onChange={(v) => setEmp(i, 'position', v)} />
                      <div>
                        <label style={lbl}>Commission (% ยอดขาย)</label>
                        <select value={e.commRate} onChange={(ev) => setEmp(i, 'commRate', ev.target.value)} style={inp}>
                          {COMM_RATES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <SlipField label="เบี้ยขยัน" value={e.diligence} onChange={(v) => setEmp(i, 'diligence', v)} />
                    </div>

                    {/* รายละเอียดพนักงานสำหรับสลิป/หนังสือรับรอง */}
                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 10, marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>รายละเอียดสำหรับหนังสือรับรองเงินเดือน</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                        <SlipField text label="ชื่อ" value={e.fullname} onChange={(v) => setEmp(i, 'fullname', v)} />
                        <SlipField text label="นามสกุล" value={e.lastname} onChange={(v) => setEmp(i, 'lastname', v)} />
                        <SlipField text label="ตำแหน่ง" value={e.title} onChange={(v) => setEmp(i, 'title', v)} />
                        <SlipField text label="เลขบัตรประชาชน" value={e.id_card} onChange={(v) => setEmp(i, 'id_card', v)} />
                        <SlipField text label="ธนาคาร" value={e.bank_name} onChange={(v) => setEmp(i, 'bank_name', v)} />
                        <SlipField text label="เลขที่บัญชี" value={e.account_no} onChange={(v) => setEmp(i, 'account_no', v)} />
                        <SlipField text label="ชื่อบัญชี (ถ้าต่างจากชื่อ)" value={e.account_holder} onChange={(v) => setEmp(i, 'account_holder', v)} />
                      </div>
                    </div>

                    <div style={slipCalc}>
                      <SlipRow label={`รวม Gross (คอมฯ ${fmt(ps.commAmt)})`} value={fmt(ps.gross)} />
                      <SlipRow label="หัก ประกันสังคม (พนักงาน 5%)" value={`− ${fmt(ps.ssoEmp)}`} color="#c00000" />
                      <SlipRow label="หัก Commission tax 3%" value={`− ${fmt(ps.commTax)}`} color="#c00000" />
                      <SlipRow label="💸 โอนให้พนักงาน" value={fmt(ps.netTransfer)} strong />
                      <SlipRow label="+ ประกันสังคม (บริษัท 5%)" value={`+ ${fmt(ps.ssoCo)}`} color="var(--muted)" />
                      <SlipRow label="รวมค่าใช้จ่ายบริษัท" value={fmt(ps.companyCost)} strong />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <button type="button" onClick={() => setEmp(i, 'amount', String(ps.companyCost))} style={btnMini}>
                        ใช้ยอดนี้ ({fmt(ps.companyCost)} ฿)
                      </button>
                      <button type="button" onClick={() => {
                        if (monthsAgo(monthLabel) > 6 && !isAdmin) {
                          setMsg({ text: 'พิมพ์หนังสือรับรองย้อนหลังเกิน 6 เดือน ต้องเป็น admin เท่านั้น', type: 'err' });
                          return;
                        }
                        printSlip(e, ps, monthLabel, bizInfo);
                      }} style={btnSlip}>
                        <i className="ti ti-printer" /> พิมพ์สลิป
                      </button>
                    </div>
                    {income <= 0 && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>* คอมมิชชั่นคำนวณจากยอดขายเดือนนี้ (ยังไม่มีข้อมูลขาย)</div>}
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" onClick={addEmp} style={btnAdd}>+ เพิ่มพนักงาน</button>
        </div>
      </Section>

      {/* หมวด 3: ภาษีและอื่นๆ */}
      <Section title="ภาษีและอื่นๆ" total={sumObj(tax)}>
        {OPEX_TAX.items.map((it) => (
          <div key={it.key}>
            <Row label={it.label} value={tax[it.key]} onChange={(v) => setTax({ ...tax, [it.key]: v })} />
            {it.key === 'vat' && income > 0 && (
              <div style={hintBox}>
                <span>VAT จากยอดขาย ({fmt(income)} × 7%) = <strong>{fmt(Math.round(income * 0.07))} ฿</strong></span>
                <button type="button" style={btnMini} onClick={() => setTax({ ...tax, vat: String(Math.round(income * 0.07)) })}>
                  ใช้ค่านี้
                </button>
              </div>
            )}
          </div>
        ))}
      </Section>

      {/* รวม + บันทึก */}
      <div style={{ ...card, background: '#f5ede3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>ยอดรวม OPEX ทั้งหมด</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--coffee)' }}>{fmt(grand)} ฿</div>
        </div>
        <button type="submit" style={btnSave} disabled={isPending}>
          {isPending ? 'กำลังบันทึก...' : 'บันทึกค่าดำเนินการ'}
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
        เว้นว่าง = ไม่บันทึกช่องนั้น · บันทึกซ้ำเดือนเดิม = อัปเดตทับ
      </p>

      {msg && (
        <div style={{ marginTop: 8, color: msg.type === 'ok' ? '#1e7e34' : '#c0392b', fontSize: 14 }}>{msg.text}</div>
      )}
    </form>
  );
}

function Section({ title, total, children }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>{title}</h2>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>รวม <strong style={{ color: 'var(--coffee)' }}>{fmt(total)} ฿</strong></span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
      <label style={{ flex: '1 1 160px', fontSize: 14 }}>{label}</label>
      <input type="number" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder != null ? String(placeholder) : '0'} style={{ ...inp, flex: '0 1 160px' }} />
      <span style={{ fontSize: 13, color: 'var(--muted)', width: 12 }}>฿</span>
    </div>
  );
}

function SlipField({ label, value, onChange, text }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input
        type={text ? 'text' : 'number'}
        {...(text ? {} : { min: '0', step: 'any' })}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={text ? '' : '0'}
        style={inp}
      />
    </div>
  );
}

function SlipRow({ label, value, color, strong }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: strong ? '7px 0' : '2px 0', borderTop: strong ? '1px solid var(--border)' : 'none', fontWeight: strong ? 700 : 400 }}>
      <span style={{ color: color || (strong ? 'var(--coffee)' : 'var(--muted)') }}>{label}</span>
      <strong style={{ color: color || (strong ? 'var(--coffee)' : 'var(--text)'), fontWeight: strong ? 700 : 600 }}>{value} ฿</strong>
    </div>
  );
}

const card = { border: '1px solid var(--border)', borderRadius: 2, padding: 16, background: 'var(--surface)', marginBottom: 12 };
const lbl = { display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 };
const inp = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 2, fontSize: 14 };
const btnRemove = { border: 0, background: '#fff0f0', color: 'var(--danger)', borderRadius: 2, padding: '6px 12px', fontSize: 12, cursor: 'pointer' };
const btnAdd = { border: '1px dashed var(--border)', background: 'var(--surface)', color: 'var(--coffee)', borderRadius: 2, padding: '8px', width: '100%', fontSize: 13, cursor: 'pointer', fontWeight: 600 };
const btnSave = { border: 0, borderRadius: 2, padding: '12px 22px', fontSize: 15, fontWeight: 700, background: 'var(--coffee)', color: '#fff', cursor: 'pointer' };
const whtBox = { border: '1px solid var(--border)', borderRadius: 2, overflow: 'hidden', margin: '-2px 0 12px', fontSize: 12 };
const whtRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 11px', fontWeight: 600 };
const hintBox = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', background: 'var(--beige)', border: '1px solid var(--border)', borderRadius: 2, padding: '8px 11px', margin: '-2px 0 12px', fontSize: 12, color: 'var(--muted)' };
const btnMini = { border: '1px solid var(--taupe)', background: 'var(--surface)', color: 'var(--taupe-dark)', borderRadius: 2, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 };
const btnSlip = { border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--taupe-dark)', borderRadius: 2, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 };
const slipBox = { border: '1px solid var(--border)', borderRadius: 2, background: 'var(--beige)', padding: 12, marginTop: 8 };
const slipCalc = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, padding: '10px 12px', fontSize: 13 };
