'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { OPEX_OPERATING, OPEX_STAFF, OPEX_TAX, DEFAULT_EMPLOYEES } from '../../lib/opex';
import { computePayslip } from '../../lib/payslip';
import { saveOpexAction, saveEmpDetails } from './actions';

const EMP_DETAIL_FIELDS = ['fullname', 'lastname', 'title', 'id_card', 'bank_name', 'account_no', 'account_holder'];

const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const sumObj = (o) => Object.values(o).reduce((a, v) => a + (Number(v) || 0), 0);

const COMM_RATES = [['0', 'ไม่มี'], ['0.01', '1%'], ['0.015', '1.5%'], ['0.02', '2%'], ['0.025', '2.5%'], ['0.03', '3%']];
const payslip = computePayslip;

// พิมพ์หนังสือรับรองเงินเดือน (เปิดหน้าต่างพิมพ์)
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
<title>หนังสือรับรองเงินเดือน ${esc(e.label)} ${mm || ''}/${yy || ''}</title>
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
    <div class="meta"><b>หนังสือรับรองเงินเดือน</b>งวด ${esc(mm || '--')}/${esc(yy || '----')}<br>วันที่ ${esc(today)}</div>
  </div>
  <div class="title">หนังสือรับรองเงินเดือน</div>
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
  if (!w) { alert('เบราว์เซอร์บล็อกป๊อปอัป — โปรดอนุญาตป๊อปอัปเพื่อพิมพ์หนังสือรับรองเงินเดือน'); return; }
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

export default function OpexForm({ monthInput, monthLabel, existing, income = 0, bizInfo = {}, isAdmin = false, opexDefaults = {}, empPayHistory = {}, empDetails = {}, canEditEmpDetails = false }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState(null);

  // ค่าตั้งต้นจริง = ที่ admin ตั้งไว้ (settings) ทับค่าคงที่ในโค้ด ถ้ามี
  const defFor = (it) => (opexDefaults[it.key] != null ? opexDefaults[it.key] : it.def);

  const initFixed = (items, saved, useDefault) => {
    const o = {};
    items.forEach((it) => {
      const d = defFor(it);
      o[it.key] = saved[it.key] != null ? String(saved[it.key]) : (useDefault && d != null ? String(d) : '');
    });
    return o;
  };

  const [operating, setOperating] = useState(() => initFixed(OPEX_OPERATING.items, existing.operating, false));
  const [staff, setStaff] = useState(() => initFixed(OPEX_STAFF.fixed, existing.staff, true)); // เติมค่าตั้งต้น (36000/0 หรือค่าที่ admin ตั้ง)
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
      const key = `${OPEX_STAFF.empPrefix}${i + 1}`;
      const dbDetail = empDetails[key] || {}; // จาก database — ค่าหลัก ใช้ร่วมทุกเครื่อง
      const detail = {};
      EMP_DETAIL_FIELDS.forEach((f) => {
        // DB มาก่อนเสมอ; localStorage เป็นแค่ fallback ช่วงเปลี่ยนผ่าน (เผื่อมีของเก่าค้างอยู่ในเครื่องนี้)
        detail[f] = dbDetail[f] ?? slip[f] ?? '';
      });
      return {
        // เติมเงินเดือน/ตำแหน่งตั้งต้นจากข้อมูลเดิม (localStorage ทับได้ — ไม่ใช่ข้อมูลอ่อนไหว)
        salary: slip.salary ?? def.salary ?? '',
        position: slip.position ?? def.position ?? '',
        commRate: slip.commRate ?? '0',
        diligence: slip.diligence ?? '',
        // รายละเอียดสำหรับหนังสือรับรองเงินเดือน — เก็บที่ฐานข้อมูลเป็นหลัก (business_config.emp_details)
        ...detail,
        showSlip: false,
        showHistory: false,
        detailSaved: false,
        label: e.label || dbDetail.label || slip.label || def.label || `พนักงานคนที่ ${i + 1}`,
        amount: e.amount, // ยอดที่บันทึกจริง (จาก DB) — คงไว้ ไม่ทับด้วย slip อัตโนมัติ
      };
    });
  });
  const [detailMsg, setDetailMsg] = useState(null);

  // จำค่าเงินเดือน/ตำแหน่ง/คอมฯ ไว้ในเครื่อง (ไม่ใช่ข้อมูลอ่อนไหว, ไม่ต้องรอกดบันทึก)
  // ข้อมูลส่วนตัว/ธนาคาร ไม่เก็บที่นี่แล้ว — ต้องกด "บันทึกข้อมูลพนักงาน" เพื่อเก็บลง DB โดยเฉพาะ
  useEffect(() => {
    const slim = employees.map((e) => ({ label: e.label, salary: e.salary, position: e.position, commRate: e.commRate, diligence: e.diligence }));
    try { localStorage.setItem('mm69_emp_slip', JSON.stringify(slim)); } catch {}
  }, [employees]);

  // บันทึกข้อมูลส่วนตัว/ธนาคารของพนักงานทุกคนลง DB (ส่งทั้งชุดเพื่อไม่ทับข้อมูลคนอื่น)
  async function onSaveEmpDetails() {
    setDetailMsg(null);
    const payload = {};
    employees.forEach((e, i) => {
      const key = `${OPEX_STAFF.empPrefix}${i + 1}`;
      const d = { label: e.label };
      EMP_DETAIL_FIELDS.forEach((f) => { d[f] = e[f] || ''; });
      payload[key] = d;
    });
    const res = await saveEmpDetails(payload);
    setDetailMsg({ text: res.message, type: res.status === 'ok' ? 'ok' : 'err' });
    if (res.status === 'ok') startTransition(() => router.refresh());
  }

  const empTotal = employees.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const grand = sumObj(operating) + sumObj(staff) + sumObj(tax) + empTotal;

  // ── ยอดนำส่งหน่วยงาน (สำหรับสำนักงานบัญชี) ──
  const empPs = employees.map((e) => payslip(e, income));
  const remitSSO = empPs.reduce((a, p) => a + p.ssoEmp + p.ssoCo, 0);      // สปส. (พนักงาน+บริษัท)
  const rentWht = Math.round((Number(operating.rent) || 0) * 0.05);         // ค่าเช่า 5%
  const staffSubWht = Math.round((Number(staff.staff_sub) || 0) * 0.03);    // พนักงานแทน 3%
  const commWht = empPs.reduce((a, p) => a + p.commTax, 0);                 // คอมมิชชั่น 3%
  const remitWHT = rentWht + staffSubWht + commWht;                        // ภ.ง.ด. รวม
  const vatAmt = Number(tax.vat) || 0;                                     // ภ.พ.30

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
                <Row label={it.label} value={operating[it.key]} onChange={onChange} placeholder={defFor(it)} />
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
          return <Row key={it.key} label={it.label} value={operating[it.key]} onChange={onChange} placeholder={defFor(it)} />;
        })}
      </Section>

      {/* หมวด 2: ค่าแรงพนักงาน */}
      <Section title="ค่าแรงพนักงาน" total={sumObj(staff) + empTotal}>
        {OPEX_STAFF.fixed.map((it) => {
          const onCh = (v) => setStaff({ ...staff, [it.key]: v });
          if (it.key === 'staff_sub') {
            const sv = Number(staff.staff_sub) || 0;
            const w = Math.round(sv * 0.03);
            return (
              <div key={it.key}>
                <Row label={it.label} value={staff[it.key]} onChange={onCh} />
                {sv > 0 && (
                  <div style={whtBox}>
                    <div style={{ ...whtRow, background: '#f0fdf4' }}><span><i className="ti ti-wallet" /> จ่ายพนักงานแทน (97%)</span><strong style={{ color: '#16a34a' }}>{fmt(sv - w)} ฿</strong></div>
                    <div style={{ ...whtRow, background: '#fff7ed' }}><span><i className="ti ti-receipt-tax" /> หัก ณ ที่จ่าย 3% (นำส่งสรรพากร)</span><strong style={{ color: '#ea580c' }}>{fmt(w)} ฿</strong></div>
                  </div>
                )}
              </div>
            );
          }
          return <Row key={it.key} label={it.label} value={staff[it.key]} onChange={onCh} />;
        })}
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
                    <i className="ti ti-calculator" /> คำนวณเงินเดือน
                  </button>
                  <button type="button" onClick={() => setEmp(i, 'showHistory', !e.showHistory)} style={btnSlip}>
                    <i className="ti ti-history" /> ประวัติ{empPayHistory[`emp${i + 1}`]?.length ? ` (${empPayHistory[`emp${i + 1}`].length})` : ''}
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

                    {/* รายละเอียดพนักงานสำหรับหนังสือรับรองเงินเดือน — เก็บลงฐานข้อมูลกลาง (ใช้ได้ทุกเครื่อง) */}
                    <div style={detailWrap}>
                      <div style={detailHead}><i className="ti ti-id-badge-2" /> ข้อมูลส่วนตัว</div>
                      <div style={detailGrid}>
                        <SlipField text disabled={!canEditEmpDetails} label="ชื่อ" value={e.fullname} onChange={(v) => setEmp(i, 'fullname', v)} />
                        <SlipField text disabled={!canEditEmpDetails} label="นามสกุล" value={e.lastname} onChange={(v) => setEmp(i, 'lastname', v)} />
                        <SlipField text disabled={!canEditEmpDetails} label="ตำแหน่ง" value={e.title} onChange={(v) => setEmp(i, 'title', v)} />
                        <SlipField text disabled={!canEditEmpDetails} label="เลขบัตรประชาชน" value={e.id_card} onChange={(v) => setEmp(i, 'id_card', v)} />
                      </div>

                      <div style={{ ...detailHead, marginTop: 12 }}><i className="ti ti-building-bank" /> บัญชีธนาคาร (สำหรับโอนเงินเดือน)</div>
                      <div style={detailGrid}>
                        <SlipField text disabled={!canEditEmpDetails} label="ธนาคาร" value={e.bank_name} onChange={(v) => setEmp(i, 'bank_name', v)} />
                        <SlipField text disabled={!canEditEmpDetails} label="เลขที่บัญชี" value={e.account_no} onChange={(v) => setEmp(i, 'account_no', v)} />
                        <SlipField text disabled={!canEditEmpDetails} label="ชื่อบัญชี (ถ้าต่างจากชื่อ-สกุล)" value={e.account_holder} onChange={(v) => setEmp(i, 'account_holder', v)} />
                      </div>

                      {canEditEmpDetails ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                          <button type="button" onClick={onSaveEmpDetails} style={btnSaveDetail}>
                            <i className="ti ti-device-floppy" /> บันทึกข้อมูลพนักงาน
                          </button>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            <i className="ti ti-cloud-check" /> เก็บลงระบบกลาง ใช้ร่วมกันได้ทุกเครื่อง
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
                          <i className="ti ti-lock" /> เฉพาะ Admin หรือ Co-Admin แก้ไขข้อมูลพนักงานได้
                        </div>
                      )}
                      {detailMsg && (
                        <div style={{ fontSize: 12, marginTop: 6, color: detailMsg.type === 'ok' ? 'var(--success)' : 'var(--danger)' }}>{detailMsg.text}</div>
                      )}
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
                        <i className="ti ti-printer" /> พิมพ์หนังสือรับรองเงินเดือน
                      </button>
                    </div>
                    {income <= 0 && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>* คอมมิชชั่นคำนวณจากยอดขายเดือนนี้ (ยังไม่มีข้อมูลขาย)</div>}
                  </div>
                )}

                {e.showHistory && (
                  <PayHistory
                    hist={empPayHistory[`emp${i + 1}`] || []}
                    employee={e}
                    bizInfo={bizInfo}
                    isAdmin={isAdmin}
                    onMsg={setMsg}
                  />
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

      {/* สรุปยอดนำส่งหน่วยงาน (สำหรับสำนักงานบัญชี) */}
      {(remitSSO > 0 || remitWHT > 0 || vatAmt > 0) && (
        <div style={{ ...card, borderColor: 'var(--taupe)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <i className="ti ti-file-invoice" style={{ color: 'var(--taupe-dark)' }} />
            <h2 style={{ margin: 0, fontSize: 15 }}>สรุปยอดนำส่งหน่วยงาน (สำหรับสำนักงานบัญชี)</h2>
          </div>
          <div style={slipCalc}>
            <SlipRow label="ประกันสังคม (สปส.1-10) — พนักงาน + บริษัท" value={fmt(remitSSO)} strong />
            <SlipRow label={`ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.) รวม`} value={fmt(remitWHT)} strong />
            <SlipRow label="• ค่าเช่า 5%" value={fmt(rentWht)} color="var(--muted)" />
            <SlipRow label="• พนักงานแทน 3%" value={fmt(staffSubWht)} color="var(--muted)" />
            <SlipRow label="• คอมมิชชั่น 3%" value={fmt(commWht)} color="var(--muted)" />
            <SlipRow label="ภาษีมูลค่าเพิ่ม (ภ.พ.30)" value={fmt(vatAmt)} strong />
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
            * นำส่งประกันสังคมภายในวันที่ 15 · ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.) ภายในวันที่ 7 ของเดือนถัดไป
          </p>
        </div>
      )}

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

function SlipField({ label, value, onChange, text, disabled }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input
        type={text ? 'text' : 'number'}
        {...(text ? {} : { min: '0', step: 'any' })}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={text ? '' : '0'}
        disabled={disabled}
        style={disabled ? { ...inp, background: 'var(--beige)', color: 'var(--muted)', cursor: 'not-allowed' } : inp}
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

// ประวัติการจ่ายเงินพนักงาน — บันทึกอัตโนมัติทุกครั้งที่กดบันทึกค่าดำเนินการ (upsert ตามเดือน)
function PayHistory({ hist, employee, bizInfo, isAdmin, onMsg }) {
  if (!hist.length) {
    return (
      <div style={{ ...slipBox, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
        ยังไม่มีประวัติการจ่ายเงิน — บันทึกค่าดำเนินการอย่างน้อย 1 เดือนก่อน
      </div>
    );
  }
  const totalNet = hist.reduce((s, r) => s + (r.netTransfer || 0), 0);
  const totalCost = hist.reduce((s, r) => s + (r.companyCost || 0), 0);
  const avgNet = totalNet / hist.length;

  function onReprint(r) {
    if (monthsAgo(r.month) > 6 && !isAdmin) {
      onMsg({ text: 'พิมพ์หนังสือรับรองย้อนหลังเกิน 6 เดือน ต้องเป็น admin เท่านั้น', type: 'err' });
      return;
    }
    // ใช้รายละเอียดตัวบุคคลปัจจุบัน (ชื่อ/ธนาคาร) + ตัวเลขเงินเดือน/สรุปจากประวัติเดือนนั้น
    printSlip(
      { ...employee, label: r.label, salary: r.salary, position: r.position, diligence: r.diligence },
      r,
      r.month,
      bizInfo
    );
  }

  return (
    <div style={slipBox}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 10, fontSize: 12 }}>
        <div><div className="muted" style={{ color: 'var(--muted)' }}>จำนวนเดือน</div><strong>{hist.length} เดือน</strong></div>
        <div><div className="muted" style={{ color: 'var(--muted)' }}>รวมโอนพนักงาน</div><strong>{fmt(totalNet)} ฿</strong></div>
        <div><div className="muted" style={{ color: 'var(--muted)' }}>เฉลี่ย/เดือน</div><strong>{fmt(avgNet)} ฿</strong></div>
        <div><div className="muted" style={{ color: 'var(--muted)' }}>รวมต้นทุนบริษัท</div><strong>{fmt(totalCost)} ฿</strong></div>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {hist.map((r) => (
          <div key={r.month} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 6, fontSize: 12 }}>
            <strong style={{ minWidth: 60 }}>{r.month}</strong>
            <span style={{ color: 'var(--muted)' }}>โอน {fmt(r.netTransfer)} ฿ · ต้นทุน {fmt(r.companyCost)} ฿</span>
            <button type="button" onClick={() => onReprint(r)} style={{ ...btnMini, marginLeft: 'auto' }}>
              <i className="ti ti-printer" /> พิมพ์ซ้ำ
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const card = { border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, background: 'var(--surface)', marginBottom: 12 };
const lbl = { display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 };
const inp = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 14 };
const btnRemove = { border: 0, background: '#fff0f0', color: 'var(--danger)', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: 12, cursor: 'pointer' };
const btnAdd = { border: '1px dashed var(--border)', background: 'var(--surface)', color: 'var(--coffee)', borderRadius: 'var(--radius-md)', padding: '8px', width: '100%', fontSize: 13, cursor: 'pointer', fontWeight: 600 };
const btnSave = { border: 0, borderRadius: 'var(--radius-md)', padding: '12px 22px', fontSize: 15, fontWeight: 700, background: 'var(--coffee)', color: '#fff', cursor: 'pointer' };
const whtBox = { border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', margin: '-2px 0 12px', fontSize: 12 };
const whtRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 11px', fontWeight: 600 };
const hintBox = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', background: 'var(--beige)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 11px', margin: '-2px 0 12px', fontSize: 12, color: 'var(--muted)' };
const btnMini = { border: '1px solid var(--taupe)', background: 'var(--surface)', color: 'var(--taupe-dark)', borderRadius: 'var(--radius-md)', padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 };
const btnSlip = { border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--taupe-dark)', borderRadius: 'var(--radius-md)', padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 };
const slipBox = { border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--beige)', padding: 12, marginTop: 8 };
const slipCalc = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 13 };
const detailWrap = { border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface)', padding: 12, marginBottom: 10 };
const detailHead = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--taupe-dark)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 };
const detailGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 };
const btnSaveDetail = { border: 0, background: 'var(--coffee)', color: '#fff', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 };
