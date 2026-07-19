// คำนวณสลิปเงินเดือน (ตรงกับ dashboard เดิม calEmpTotal) — ใช้ร่วมทั้ง client และ server
// เพื่อให้ตัวเลขที่บันทึกลงประวัติตรงกับที่คำนวณจริงเสมอ (ไม่เชื่อ client ล้วนๆ)
export function computePayslip(e, income) {
  const salary = Number(e.salary) || 0;
  const position = Number(e.position) || 0;
  const diligence = Number(e.diligence) || 0;
  const commAmt = Math.round((Number(income) || 0) * (Number(e.commRate) || 0));
  const ssoBase = Math.min(salary, 15000); // ฐานประกันสังคมสูงสุด 15,000
  const ssoEmp = Math.round(ssoBase * 0.05);
  const ssoCo = Math.round(ssoBase * 0.05);
  const gross = salary + position + commAmt + diligence;
  const commTax = Math.round(commAmt * 0.03);
  const netTransfer = salary - ssoEmp + position + diligence + (commAmt - commTax);
  const companyCost = gross + ssoCo; // ค่าใช้จ่ายบริษัท = gross + ประกันสังคมบริษัท
  return { commAmt, ssoEmp, ssoCo, gross, commTax, netTransfer, companyCost };
}
