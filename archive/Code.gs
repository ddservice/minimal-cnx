// ═══════════════════════════════════════════════════════════════
//  Minimal Maerim 69 — Google Apps Script Backend
//  Sheet structure: 1 sheet per month per type
//  ชื่อ Sheet: "ยอดขาย 06/2026", "ต้นทุนวัตถุดิบ 06/2026", "ค่าดำเนินการ 06/2026"
//  วิธีใช้: Extensions → Apps Script → วาง code → Save → Deploy
//  จากนั้นรัน setupSheets() 1 ครั้ง เพื่อสร้าง Sheet ราคา
// ═══════════════════════════════════════════════════════════════

// ── Spreadsheet ID (แก้ไขถ้าย้าย Sheet) ─────────────────────
const SPREADSHEET_ID = '1BaUPfSKfB_YcjXtpPoh9YwJR5H2kC_fHsN9i2jzhCVo';
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet()
      || SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ── ชื่อ Base (prefix ของแต่ละประเภท) ───────────────────────
const BASE = {
  SALES:   'ยอดขาย',
  EXPENSE: 'ต้นทุนวัตถุดิบ',
  OPEX:    'ค่าดำเนินการ',
  PRICE:   'ราคา',
  USERS:   'Users',          // สำหรับ login
};

// ── Headers ──────────────────────────────────────────────────
const HEADERS = {
  SALES: [
    'วันที่','ยอดขาย(แก้วรวม)','K-Shop(฿)','เงินสด(฿)',
    'Shopee(ก่อนGP)','Shopee(หลังGP)',
    'Grab(ก่อนGP)','Grab(หลังGP)',
    'Lineman(ก่อนGP)','Lineman(หลังGP)',
    'กาแฟ(แก้ว)','ขนม(ชิ้น)','รายได้ขนม(฿)',
    'แก้วฟรี','ต้นทุน/แก้วฟรี(฿)',
    'รายรับสุทธิ(฿)','บันทึกเมื่อ',
  ],
  EXPENSE: [
    'วันที่','หมวดหมู่','ซัพพลายเออร์','รายการ',
    'ราคา/หน่วย(฿)','จำนวน','รวม(฿)','ชำระด้วย','บันทึกเมื่อ',
  ],
  OPEX: [
    'เดือน','หมวดหมู่','รายการ','Key',
    'ยอด(฿)','วิธีชำระ','บันทึกเมื่อ',
  ],
  PRICE: ['ประเภท','รายการ','ราคา(฿)'],
  USERS: ['username','password_hash','role','token','token_expiry','display_name','full_name','nickname'],
};

// ── Utility: ชื่อ Sheet รายเดือน ─────────────────────────────
// dateStr = "dd/mm/yyyy"  →  "ยอดขาย 06/2026"
function sheetNameFor(base, dateOrMonth) {
  // ถ้ายาว = dd/mm/yyyy → เอาแค่ mm/yyyy
  const parts = String(dateOrMonth).split('/');
  const month = parts.length === 3 ? parts[1] + '/' + parts[2] : dateOrMonth;
  return base + ' ' + month;
}

// "dd/mm/yyyy" → "mm/yyyy"
function toMonth(dateStr) {
  const p = String(dateStr).split('/');
  return p.length === 3 ? p[1] + '/' + p[2] : dateStr;
}

// ── Utility: หา / สร้าง Sheet ────────────────────────────────
function getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

function getOrCreateSheet(name, headers) {
  const ss = getSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length)
      .setBackground('#3d2b1f').setFontColor('#ffffff')
      .setFontWeight('bold').setFontSize(11);
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, headers.length);
  }
  return sh;
}

// ════════════════════════════════════════════════════════════════
//  Auth helpers
// ════════════════════════════════════════════════════════════════

function hashPw_(pw) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, pw, Utilities.Charset.UTF_8
  );
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function todayBKK_() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy');
}

// คืน sheet Users (สร้างถ้าไม่มี)
function getUsersSheet_() {
  return getOrCreateSheet(BASE.USERS, HEADERS.USERS);
}

// หาแถว user ตาม username → คืน { row, idx } หรือ null
function findUser_(username) {
  const sh = getUsersSheet_();
  if (sh.getLastRow() < 2) return null;
  const data = sh.getRange(2, 1, sh.getLastRow()-1, HEADERS.USERS.length).getValues();
  const idx  = data.findIndex(r => String(r[0]) === String(username));
  if (idx === -1) return null;
  return { row: data[idx], sheetRow: idx + 2 };
}

// Login: รับ {username, password} → คืน token + role
function loginUser(d) {
  const u = findUser_(d.username);
  if (!u) return json({ status:'error', message:'ไม่พบผู้ใช้' });

  const hash = hashPw_(String(d.password));
  if (hash !== String(u.row[1]))
    return json({ status:'error', message:'รหัสผ่านไม่ถูกต้อง' });

  // สร้าง token ใหม่ หมดอายุ 12 ชม.
  const token   = Utilities.getUuid();
  const expiry  = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const expStr  = Utilities.formatDate(expiry, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');

  const sh = getUsersSheet_();
  sh.getRange(u.sheetRow, 4, 1, 2).setValues([[token, expStr]]);

  return json({
    status: 'ok',
    token,
    role:         String(u.row[2]),
    display_name: String(u.row[5] || u.row[0]),
    full_name:    String(u.row[6] || ''),
    nickname:     String(u.row[7] || u.row[5] || u.row[0]),
  });
}

// Validate token → คืน { valid, role, display_name, full_name, nickname }
function validateToken_(token) {
  if (!token) return { valid: false };
  const sh = getUsersSheet_();
  if (sh.getLastRow() < 2) return { valid: false };
  const data = sh.getRange(2, 1, sh.getLastRow()-1, HEADERS.USERS.length).getValues();
  const row  = data.find(r => String(r[3]) === String(token));
  if (!row) return { valid: false };
  const expiry = new Date(String(row[4]));
  if (isNaN(expiry) || new Date() > expiry) return { valid: false, expired: true };
  return {
    valid:        true,
    role:         String(row[2]),
    display_name: String(row[5] || row[0]),
    full_name:    String(row[6] || ''),
    nickname:     String(row[7] || row[5] || row[0]),
  };
}

// Logout: ล้าง token
function logoutUser(d) {
  const u = findUser_(d.username);
  if (!u) return json({ status:'ok' });
  const sh = getUsersSheet_();
  sh.getRange(u.sheetRow, 4, 1, 2).setValues([['', '']]);
  return json({ status:'ok' });
}

// Change password
function changePassword(d) {
  const auth = validateToken_(d.token);
  if (!auth.valid) return json({ status:'error', message:'session หมดอายุ' });
  // admin เปลี่ยนได้ทุก user, manager เปลี่ยนได้แค่ตัวเอง
  if (auth.role !== 'admin' && d.target_user !== d.username_requester)
    return json({ status:'error', message:'ไม่มีสิทธิ์' });
  const u = findUser_(d.target_user);
  if (!u) return json({ status:'error', message:'ไม่พบผู้ใช้' });
  const sh = getUsersSheet_();
  sh.getRange(u.sheetRow, 2).setValue(hashPw_(String(d.new_password)));
  return json({ status:'ok' });
}

// ── ตั้งค่าครั้งแรก (รัน 1 ครั้ง) ──────────────────────────
function setupSheets() {
  const ss = getSpreadsheet();

  // สร้างเฉพาะ Sheet ราคา (Sheet รายเดือนสร้างอัตโนมัติเมื่อบันทึก)
  let priceSheet = ss.getSheetByName(BASE.PRICE);
  if (!priceSheet) {
    priceSheet = ss.insertSheet(BASE.PRICE);
    priceSheet.appendRow(HEADERS.PRICE);
    priceSheet.getRange(1, 1, 1, HEADERS.PRICE.length)
      .setBackground('#3d2b1f').setFontColor('#ffffff').setFontWeight('bold');
    priceSheet.setFrozenRows(1);
  }

  // ตัวอย่างราคา bakery
  if (priceSheet.getLastRow() <= 1) {
    [['Bakery_Shop','ครัวซองต์เนย',45],
     ['Bakery_Shop','มัฟฟินช็อกโกแลต',40],
     ['Bakery_Shop','คุกกี้เนยสด',35]]
    .forEach(r => priceSheet.appendRow(r));
  }

  console.log('setupSheets: done');
}

// รัน 1 ครั้งหลัง setupSheets เพื่อสร้าง admin/manager เริ่มต้น
function setupUsers() {
  const sh = getUsersSheet_();
  if (sh.getLastRow() > 1) {
    console.log('setupUsers: Users sheet มีข้อมูลแล้ว ไม่สร้างซ้ำ');
    return;
  }
  const defaults = [
    ['admin',   hashPw_('admin1234'),   'admin',   '', '', 'ผู้ดูแลระบบ'],
    ['manager', hashPw_('manager1234'), 'manager', '', '', 'ผู้จัดการร้าน'],
  ];
  defaults.forEach(r => sh.appendRow(r));
  console.log('setupUsers: สร้าง admin และ manager เรียบร้อย\nรหัส admin: admin1234\nรหัส manager: manager1234\n⚠️ กรุณาเปลี่ยนรหัสผ่านทันทีหลังเข้าใช้งานครั้งแรก');
}

// ════════════════════════════════════════════════════════════════
//  GET Handler
// ════════════════════════════════════════════════════════════════
function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  try {
    if (p.action === 'validate') {
      const auth = validateToken_(p.token);
      return json(auth);
    }
    // ตรวจ token สำหรับ action ที่ต้องการ auth
    if (p.action === 'getSale' || p.action === 'export' || p.action === 'get_config') {
      const auth = validateToken_(p.token);
      if (!auth.valid) return json({ error:'unauthorized' });
    }
    if (p.action === 'getSale')    return getSaleByDate(p.date);
    if (p.action === 'export')     return exportData(p);
    if (p.action === 'get_config') return getConfig_();
    return getPriceList();
  } catch(err) {
    return json({ error: err.message });
  }
}

function getPriceList() {
  const sh = getSheet(BASE.PRICE);
  let prices = [];
  if (sh && sh.getLastRow() > 1)
    prices = sh.getRange(2, 1, sh.getLastRow()-1, 3).getValues()
               .filter(r => r[0] && r[1]);
  return json({ prices });
}

// หา Sale ใน Sheet ของเดือนนั้น
function getSaleByDate(dateStr) {
  if (!dateStr) return json({ found: false });
  const shName = sheetNameFor(BASE.SALES, dateStr);
  const sh = getSheet(shName);
  if (!sh || sh.getLastRow() < 2) return json({ found: false });

  const rows = sh.getRange(2, 1, sh.getLastRow()-1, HEADERS.SALES.length).getValues()
    .map(r => r.map(v => v instanceof Date ? Utilities.formatDate(v,'Asia/Bangkok','dd/MM/yyyy') : v));
  const row  = rows.find(r => String(r[0]) === String(dateStr));
  if (!row) return json({ found: false });

  return json({
    found:true, date:row[0], sales:row[1],
    kshop:row[2],       cash:row[3],
    shopee_raw:row[4],  shopee_net:row[5],
    grab_raw:row[6],    grab_net:row[7],
    lineman_raw:row[8], lineman_net:row[9],
    coffee_cups:row[10],bakery_qty:row[11],
    bakery_income:row[12],
    coffee_qty:row[13], coffee_price:row[14],
    total_income:row[15],
  });
}

// ── Export: รายวัน / รายเดือน ─────────────────────────────────
function exportData(p) {
  const period = p.period || 'daily';
  const filter = p.date || p.month || '';
  return json({
    period, filter,
    sales:   exportFromMonthlySheets(BASE.SALES,   HEADERS.SALES,   period, filter),
    expense: exportFromMonthlySheets(BASE.EXPENSE, HEADERS.EXPENSE, period, filter),
    opex:    exportFromMonthlySheets(BASE.OPEX,    HEADERS.OPEX,    period, filter),
  });
}

function exportFromMonthlySheets(base, headers, period, filter) {
  const ss = getSpreadsheet();
  const allSheets = ss.getSheets();
  const results = [];

  // หา Sheet ที่ match กับเดือน
  const targetMonth = period === 'daily' ? toMonth(filter) : filter;
  allSheets.forEach(sh => {
    const name = sh.getName();
    if (!name.startsWith(base + ' ')) return;
    // "ยอดขาย 06/2026" → ตรวจ month part
    const monthPart = name.slice(base.length + 1);
    if (targetMonth && monthPart !== targetMonth) return;
    if (sh.getLastRow() < 2) return;

    const rows = sh.getRange(2, 1, sh.getLastRow()-1, headers.length).getValues()
                   .filter(r => {
                     if (!r[0]) return false;
                     if (period === 'daily') return String(r[0]) === filter;
                     return true; // monthly → เอาทุกแถวในชีทนั้น
                   });
    rows.forEach(r => {
      const obj = {};
      headers.forEach((h, i) => {
        const v = r[i];
        // Date object → "dd/MM/yyyy" string
        obj[h] = (v instanceof Date)
          ? Utilities.formatDate(v, 'Asia/Bangkok', 'dd/MM/yyyy')
          : v;
      });
      results.push(obj);
    });
  });
  return results;
}

// ════════════════════════════════════════════════════════════════
//  POST Handler
// ════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    switch(data.formType) {
      case 'login':           return loginUser(data);
      case 'logout':          return logoutUser(data);
      case 'change_password': return changePassword(data);
      default: break;
    }

    // ── ทุก action ด้านล่างต้องมี token ──
    const auth = validateToken_(data.token);
    if (!auth.valid) return json({ status:'error', message:'session หมดอายุ กรุณา login ใหม่', code:'unauthorized' });

    // manager ห้ามกรอกข้อมูลย้อนหลัง
    if (auth.role === 'manager') {
      const today = todayBKK_();
      const reqDate = String(data.date || '');
      if (reqDate && reqDate !== today)
        return json({ status:'error', message:'ไม่มีสิทธิ์กรอกข้อมูลย้อนหลัง', code:'forbidden' });
    }

    switch(data.formType) {
      case 'sales_form':        return saveSale(data);
      case 'update_sales_form': return updateSale(data);
      case 'expense_form':      return saveExpense(data);
      case 'delete_expense_date':
        if (auth.role === 'manager') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return deleteExpenseByDate(data);
      case 'edit_expense':
        if (auth.role === 'manager') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return editExpense(data);
      case 'opex_form':
        if (auth.role === 'manager') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return saveOpexItem(data);
      case 'import_sales':
        if (auth.role === 'manager') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return importSalesRows(data);
      case 'import_expense':
        if (auth.role === 'manager') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return importExpenseRows(data);
      case 'import_opex':
        if (auth.role === 'manager') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return importOpexRows(data);
      case 'delete_month':
        if (auth.role === 'manager') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return deleteMonthData(data);
      case 'deduplicate_month':
        if (auth.role === 'manager') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return deduplicateMonth_(data);
      case 'save_config': {
        // biz_info, emp_details_N, emp_history_N, emp_pay_history_N, form50 payee, opex defaults → ทุก role บันทึกได้
        // (config ไม่ใช่ข้อมูล sensitive ที่ต้องจำกัด admin อย่างเดียว)
        return saveConfig_(data);
      }
      // ── User Management (Admin only) ──────────────────────────
      case 'list_users':
        if (auth.role !== 'admin') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return listUsers_();
      case 'create_user':
        if (auth.role !== 'admin') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return createUser_(data);
      case 'update_user_role':
        if (auth.role !== 'admin') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return updateUserRole_(data);
      case 'reset_user_password':
        if (auth.role !== 'admin') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return resetUserPassword_(data);
      case 'update_user':
        if (auth.role !== 'admin') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return updateUser_(data);
      case 'delete_user':
        if (auth.role !== 'admin') return json({ status:'error', message:'ไม่มีสิทธิ์', code:'forbidden' });
        return deleteUser_(data, auth);
      default: return json({ status:'error', message:'Unknown formType: '+data.formType });
    }
  } catch(err) {
    return json({ status:'error', message:err.message });
  }
}

// ════════════════════════════════════════════════════════════════
//  User Management functions (Admin only)
// ════════════════════════════════════════════════════════════════

function listUsers_() {
  const sh = getUsersSheet_();
  if (sh.getLastRow() < 2) return json({ status:'ok', users:[] });
  const data = sh.getRange(2, 1, sh.getLastRow()-1, HEADERS.USERS.length).getValues();
  const users = data
    .filter(r => r[0] !== '')
    .map(r => ({
      username:     String(r[0]),
      role:         String(r[2]),
      display_name: String(r[5] || r[0]),
      full_name:    String(r[6] || ''),
      nickname:     String(r[7] || r[5] || r[0]),
      has_token:    r[3] !== '' && r[3] !== null,
    }));
  return json({ status:'ok', users });
}

function createUser_(d) {
  if (!d.username || !d.password || !d.role)
    return json({ status:'error', message:'กรุณากรอกข้อมูลให้ครบ' });
  if (!['admin','co-admin','manager'].includes(String(d.role)))
    return json({ status:'error', message:'สิทธิ์ไม่ถูกต้อง' });
  if (findUser_(d.username))
    return json({ status:'error', message:'ชื่อผู้ใช้ "' + d.username + '" มีอยู่แล้ว' });
  const sh = getUsersSheet_();
  sh.appendRow([
    String(d.username),
    hashPw_(String(d.password)),
    String(d.role),
    '', '', // token, expiry
    String(d.nickname || d.display_name || d.username), // display_name = nickname
    String(d.full_name || ''),
    String(d.nickname || d.display_name || d.username),
  ]);
  return json({ status:'ok' });
}

// อัปเดต full_name / nickname / role ของ user (admin only)
function updateUser_(d) {
  if (!d.username) return json({ status:'error', message:'ข้อมูลไม่ครบ' });
  const u = findUser_(d.username);
  if (!u) return json({ status:'error', message:'ไม่พบผู้ใช้' });
  const sh = getUsersSheet_();
  let roleChanged = false;
  if (typeof d.full_name === 'string')
    sh.getRange(u.sheetRow, 7).setValue(d.full_name);
  if (typeof d.nickname === 'string') {
    sh.getRange(u.sheetRow, 6).setValue(d.nickname); // display_name column
    sh.getRange(u.sheetRow, 8).setValue(d.nickname); // nickname column
  }
  if (typeof d.role === 'string' && ['admin','co-admin','manager'].includes(d.role)) {
    sh.getRange(u.sheetRow, 3).setValue(d.role);
    roleChanged = true;
  }
  // force re-login if role changed
  if (roleChanged) sh.getRange(u.sheetRow, 4, 1, 2).setValues([['', '']]);
  return json({ status:'ok', role_changed: roleChanged });
}

function updateUserRole_(d) {
  if (!d.username || !d.role)
    return json({ status:'error', message:'ข้อมูลไม่ครบ' });
  if (!['admin','co-admin','manager'].includes(String(d.role)))
    return json({ status:'error', message:'สิทธิ์ไม่ถูกต้อง' });
  const u = findUser_(d.username);
  if (!u) return json({ status:'error', message:'ไม่พบผู้ใช้' });
  const sh = getUsersSheet_();
  sh.getRange(u.sheetRow, 3).setValue(String(d.role));
  // force re-login
  sh.getRange(u.sheetRow, 4, 1, 2).setValues([['', '']]);
  return json({ status:'ok' });
}

function resetUserPassword_(d) {
  if (!d.username || !d.new_password)
    return json({ status:'error', message:'ข้อมูลไม่ครบ' });
  const u = findUser_(d.username);
  if (!u) return json({ status:'error', message:'ไม่พบผู้ใช้' });
  const sh = getUsersSheet_();
  sh.getRange(u.sheetRow, 2).setValue(hashPw_(String(d.new_password)));
  // force re-login
  sh.getRange(u.sheetRow, 4, 1, 2).setValues([['', '']]);
  return json({ status:'ok' });
}

function deleteUser_(d, auth) {
  if (!d.username) return json({ status:'error', message:'ระบุ username ที่ต้องการลบ' });
  // ห้ามลบตัวเอง (ตรวจจาก token ที่ผ่าน auth)
  const sh = getUsersSheet_();
  const data = sh.getRange(2, 1, sh.getLastRow()-1, HEADERS.USERS.length).getValues();
  const selfRow = data.find(r => String(r[3]) === String(d.token));
  if (selfRow && String(selfRow[0]) === String(d.username))
    return json({ status:'error', message:'ไม่สามารถลบบัญชีตัวเองได้' });
  const u = findUser_(d.username);
  if (!u) return json({ status:'error', message:'ไม่พบผู้ใช้' });
  sh.deleteRow(u.sheetRow);
  return json({ status:'ok' });
}

// ── Save / Update ─────────────────────────────────────────────

// saveSale: ถ้าวันที่นั้นมีอยู่แล้ว → update แทน append (upsert)
function saveSale(d) {
  const shName = sheetNameFor(BASE.SALES, d.date);
  const sh = getOrCreateSheet(shName, HEADERS.SALES);

  // ตรวจก่อน: ถ้า date ซ้ำ → เรียก updateSale แทน
  if (sh.getLastRow() > 1) {
    const col1 = sh.getRange(2, 1, sh.getLastRow()-1, 1).getValues();
    const idx  = col1.findIndex(r => String(r[0]) === String(d.date));
    if (idx !== -1) return updateSale(d);
  }

  const income = n(d.kshop)+n(d.cash)+n(d.shopee_net)+n(d.grab_net)+n(d.lineman_net);
  sh.appendRow([
    d.date, n(d.sales), n(d.kshop), n(d.cash),
    n(d.shopee_raw), n(d.shopee_net),
    n(d.grab_raw),   n(d.grab_net),
    n(d.lineman_raw),n(d.lineman_net),
    Math.max(0, n(d.sales)-n(d.bakery_qty)),
    n(d.bakery_qty), n(d.bakery_income),
    n(d.coffee_qty), n(d.coffee_price),
    income, ts(d.logged_by),
  ]);
  return json({ status:'ok' });
}

function updateSale(d) {
  const shName = sheetNameFor(BASE.SALES, d.date);
  const sh = getSheet(shName);
  if (!sh || sh.getLastRow() < 2)
    return json({ status:'error', message:'ไม่พบ Sheet '+shName });

  const col1 = sh.getRange(2, 1, sh.getLastRow()-1, 1).getValues();
  const idx  = col1.findIndex(r => String(r[0]) === String(d.date));
  if (idx === -1) return json({ status:'error', message:'ไม่พบวันที่ '+d.date });

  const income = n(d.kshop)+n(d.cash)+n(d.shopee_net)+n(d.grab_net)+n(d.lineman_net);
  sh.getRange(idx+2, 1, 1, HEADERS.SALES.length).setValues([[
    d.date, n(d.sales), n(d.kshop), n(d.cash),
    n(d.shopee_raw), n(d.shopee_net),
    n(d.grab_raw),   n(d.grab_net),
    n(d.lineman_raw),n(d.lineman_net),
    Math.max(0, n(d.sales)-n(d.bakery_qty)),
    n(d.bakery_qty), n(d.bakery_income),
    n(d.coffee_qty), n(d.coffee_price),
    income, ts(d.logged_by),
  ]]);
  return json({ status:'ok' });
}

// deleteExpenseByDate: ลบ rows ที่ตรงกับ date+category (สำหรับ overwrite)
function deleteExpenseByDate(d) {
  const date     = String(d.date     || '');
  const category = String(d.category || '');
  if (!date) return json({ status:'error', message:'กรุณาระบุวันที่' });
  const shName = sheetNameFor(BASE.EXPENSE, date);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(shName);
  if (!sh || sh.getLastRow() <= 1) return json({ status:'ok', deleted: 0 });
  const rows = sh.getRange(2, 1, sh.getLastRow()-1, 2).getValues(); // [วันที่, หมวดหมู่]
  let deleted = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][0]) === date && (!category || String(rows[i][1]) === category)) {
      sh.deleteRow(i + 2);
      deleted++;
    }
  }
  return json({ status:'ok', deleted });
}

// editExpense: ลบแถวเดิม (date+category) แล้ว insert ใหม่ใน call เดียว (atomic — ไม่มี data loss)
function editExpense(d) {
  const date     = String(d.date     || '');
  const category = String(d.category || '');
  const newRows  = Array.isArray(d.rows) ? d.rows : [];
  const loggedBy = String(d.logged_by || '');

  if (!date || !category || !newRows.length)
    return json({ status:'error', message:'ข้อมูลไม่ครบ (date/category/rows)' });

  const shName = sheetNameFor(BASE.EXPENSE, date);
  const sh = getOrCreateSheet(shName, HEADERS.EXPENSE);

  // ── 1. ลบแถวเดิม date+category (reverse เพื่อ index ไม่เลื่อน) ──
  let deleted = 0;
  if (sh.getLastRow() > 1) {
    const vals = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    for (let i = vals.length - 1; i >= 0; i--) {
      if (String(vals[i][0]) === date && String(vals[i][1]) === category) {
        sh.deleteRow(i + 2);
        deleted++;
      }
    }
  }

  // ── 2. Insert แถวใหม่ทั้งหมด ──
  const stamp = ts(loggedBy);
  newRows.forEach(r => {
    sh.appendRow([
      r.date, r.category, r.supplier, r.item_name,
      n(r.price_per_unit), n(r.qty), n(r.total_amount),
      r.pay_method || '', stamp,
    ]);
  });

  return json({ status:'ok', deleted, saved: newRows.length });
}

// saveExpense: ตรวจ duplicate ด้วย date + item_name (ไม่รวม total เพราะจำนวนต่างกันก็ถือว่าซ้ำ)
function saveExpense(d) {
  const shName = sheetNameFor(BASE.EXPENSE, d.date);
  const sh = getOrCreateSheet(shName, HEADERS.EXPENSE);

  if (sh.getLastRow() > 1) {
    const rows = sh.getRange(2, 1, sh.getLastRow()-1, 4).getValues(); // col A-D เท่าที่ต้องการ
    const key  = String(d.date)+'|'+String(d.item_name);
    const isDup = rows.some(r => String(r[0])+'|'+String(r[3]) === key);
    if (isDup) return json({ status:'duplicate', message:'ข้อมูลซ้ำ ข้ามการบันทึก' });
  }

  sh.appendRow([
    d.date, d.category, d.supplier, d.item_name,
    n(d.price_per_unit), n(d.qty), n(d.total_amount),
    d.pay_method||'', ts(d.logged_by),
  ]);
  return json({ status:'ok' });
}

// saveOpexItem: upsert ด้วย month + key
function saveOpexItem(d) {
  const shName = BASE.OPEX + ' ' + d.month;
  const sh = getOrCreateSheet(shName, HEADERS.OPEX);
  const newRow = [d.month, d.category, d.label, d.key, n(d.amount), d.method||'อัตโนมัติ', ts(d.logged_by)];

  if (sh.getLastRow() > 1) {
    const rows = sh.getRange(2, 1, sh.getLastRow()-1, 4).getValues();
    const idx  = rows.findIndex(r =>
      String(r[0]) === String(d.month) && String(r[3]) === String(d.key)
    );
    if (idx !== -1) {
      // อัพเดทแถวเดิม ไม่ append ใหม่
      sh.getRange(idx+2, 1, 1, HEADERS.OPEX.length).setValues([newRow]);
      return json({ status:'ok', updated:true });
    }
  }

  sh.appendRow(newRow);
  return json({ status:'ok' });
}

// ── ลบข้อมูลทั้งเดือน ──────────────────────────────────────────
function deleteMonthData(d) {
  // d.month = 'MM/YYYY', d.category = 'sales'|'expense'|'opex'|'all'
  const month    = String(d.month || '');
  const category = String(d.category || 'all');
  if (!month) return json({ status:'error', message:'กรุณาระบุเดือน (MM/YYYY)' });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const deleted = [];

  function tryDelete(baseName) {
    const shName = baseName + ' ' + month;
    const sh = ss.getSheetByName(shName);
    if (sh) {
      // ลบข้อมูลทั้งหมด (เก็บ header ไว้)
      if (sh.getLastRow() > 1) {
        sh.deleteRows(2, sh.getLastRow()-1);
      }
      deleted.push(shName);
    }
  }

  if (category === 'sales' || category === 'all') tryDelete(BASE.SALES);
  if (category === 'expense' || category === 'all') tryDelete(BASE.EXPENSE);
  if (category === 'opex' || category === 'all') tryDelete(BASE.OPEX);

  return json({ status:'ok', deleted, month, category });
}

// ── Deduplicate: ลบแถวซ้ำในเดือน เก็บแถวสุดท้ายต่อวันที่ ────────
function deduplicateMonth_(d) {
  const month    = String(d.month || '');
  const category = String(d.category || 'sales');
  if (!month) return json({ status:'error', message:'กรุณาระบุเดือน (MM/YYYY)' });

  const baseMap = { sales: BASE.SALES, expense: BASE.EXPENSE };
  const base = baseMap[category] || BASE.SALES;
  const shName = base + ' ' + month;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(shName);
  if (!sh) return json({ status:'error', message:'ไม่พบ Sheet: ' + shName });

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return json({ status:'ok', removed:0, remaining:0, shName });

  const numCols = sh.getLastColumn();
  const data = sh.getRange(2, 1, lastRow - 1, numCols).getValues();

  // หา index ที่จะเก็บไว้: วันที่เดียวกัน → เก็บ index สุดท้าย
  const dateToLastIdx = new Map();
  data.forEach((row, i) => {
    const dateStr = String(row[0] || '').trim();
    if (dateStr) dateToLastIdx.set(dateStr, i);
  });
  const keepSet = new Set(dateToLastIdx.values());

  // หาแถว (row number ใน sheet) ที่ต้องลบ → ลบจากล่างขึ้นบน
  const toDelete = [];
  data.forEach((_, i) => { if (!keepSet.has(i)) toDelete.push(i + 2); });
  toDelete.sort((a, b) => b - a).forEach(r => sh.deleteRow(r));

  return json({ status:'ok', removed: toDelete.length, remaining: keepSet.size, shName });
}

// ── Config (บริษัท/พนักงาน) — บันทึกใน ScriptProperties ────────
function getConfig_() {
  const sp  = PropertiesService.getScriptProperties();
  const all = sp.getProperties();
  const config = {};
  Object.keys(all).filter(k => k.startsWith('mm69_')).forEach(k => {
    const shortKey = k.slice(5); // ตัด prefix 'mm69_'
    try { config[shortKey] = JSON.parse(all[k]); }
    catch(e) { config[shortKey] = all[k]; }
  });
  return json({ status:'ok', config });
}

function saveConfig_(d) {
  const key = String(d.config_key || '');
  if (!key) return json({ status:'error', message:'กรุณาระบุ config_key' });
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) return json({ status:'error', message:'config_key ไม่ถูกต้อง' });
  const sp = PropertiesService.getScriptProperties();
  sp.setProperty('mm69_' + key, JSON.stringify(d.config_value ?? null));
  return json({ status:'ok', saved:'mm69_'+key });
}

// ── Import (แยกตาม Sheet เดือน + ตรวจซ้ำ / overwrite) ────────

function importSalesRows(d) {
  const rows = d.rows || [];
  const overwrite = !!d.overwrite; // ถ้า overwrite=true → ลบแถวที่ซ้ำแล้วเพิ่มใหม่
  // จัดกลุ่มตามเดือน
  const byMonth = {};
  rows.forEach(r => {
    const m = toMonth(String(r['วันที่']||''));
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(r);
  });
  let total = 0, skipped = 0, overwritten = 0;
  Object.entries(byMonth).forEach(([m, mrs]) => {
    const sh = getOrCreateSheet(BASE.SALES+' '+m, HEADERS.SALES);

    // โหลด date ที่มีอยู่แล้วเพื่อเช็คซ้ำ
    const getExistingRows = () => sh.getLastRow() > 1
      ? sh.getRange(2, 1, sh.getLastRow()-1, 1).getValues()
      : [];

    mrs.forEach(r => {
      const dateVal = String(r['วันที่']||'');
      if (overwrite) {
        // ลบแถวที่มีวันที่ตรงกัน (ค้นหาจากท้ายไปหน้าเพื่อหลีกเลี่ยง index เลื่อน)
        if (sh.getLastRow() > 1) {
          const existing = sh.getRange(2, 1, sh.getLastRow()-1, 1).getValues();
          for (let i = existing.length-1; i >= 0; i--) {
            if (String(existing[i][0]) === dateVal) {
              sh.deleteRow(i+2);
              overwritten++;
            }
          }
        }
      } else {
        const existingDates = new Set(getExistingRows().map(r => String(r[0])));
        if (existingDates.has(dateVal)) { skipped++; return; } // ข้ามซ้ำ
      }

      const shopeeRaw  = n(r['Shopee(ก่อนGP)']);
      const grabRaw    = n(r['Grab(ก่อนGP)']);
      const linemanRaw = n(r['Lineman(ก่อนGP)']);
      const shopeeNet  = Math.round(shopeeRaw  * 0.6576 * 100)/100;
      const grabNet    = Math.round(grabRaw    * 0.679  * 100)/100;
      const linemanNet = Math.round(linemanRaw * 0.679  * 100)/100;
      const income     = n(r['K-Shop(฿)'])+n(r['เงินสด(฿)'])+shopeeNet+grabNet+linemanNet;
      const totalCups  = n(r['ยอดขาย(แก้วรวม)']);
      const bakQty     = n(r['ขนม(ชิ้น)']);
      sh.appendRow([
        dateVal, totalCups, n(r['K-Shop(฿)']), n(r['เงินสด(฿)']),
        shopeeRaw, shopeeNet, grabRaw, grabNet, linemanRaw, linemanNet,
        Math.max(0, totalCups-bakQty),
        bakQty, n(r['รายได้ขนม(฿)']),
        n(r['แก้วฟรี']), n(r['ต้นทุน/แก้วฟรี(฿)']),
        income, ts(d.logged_by),
      ]);
      total++;
    });
  });
  return json({ status:'ok', imported:total, skipped, overwritten });
}

function importExpenseRows(d) {
  const rows = d.rows || [];
  const byMonth = {};
  rows.forEach(r => {
    const m = toMonth(String(r['วันที่']||''));
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(r);
  });
  let total = 0, skipped = 0;
  Object.entries(byMonth).forEach(([m, mrs]) => {
    const sh = getOrCreateSheet(BASE.EXPENSE+' '+m, HEADERS.EXPENSE);

    // โหลด fingerprint ที่มีอยู่: date|รายการ|รวม
    const existingKeys = sh.getLastRow() > 1
      ? new Set(sh.getRange(2, 1, sh.getLastRow()-1, HEADERS.EXPENSE.length).getValues()
          .map(r => String(r[0])+'|'+String(r[3])+'|'+String(r[6])))
      : new Set();

    mrs.forEach(r => {
      const key = String(r['วันที่'])+'|'+String(r['รายการ'])+'|'+String(r['รวม(฿)']);
      if (existingKeys.has(key)) { skipped++; return; } // ข้ามซ้ำ
      sh.appendRow(HEADERS.EXPENSE.map(h => r[h]!==undefined ? r[h] : ''));
      existingKeys.add(key);
      total++;
    });
  });
  return json({ status:'ok', imported:total, skipped });
}

function importOpexRows(d) {
  const rows = d.rows || [];
  const byMonth = {};
  rows.forEach(r => {
    const m = String(r['เดือน']||'');
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(r);
  });
  let total = 0, skipped = 0;
  Object.entries(byMonth).forEach(([m, mrs]) => {
    const sh = getOrCreateSheet(BASE.OPEX+' '+m, HEADERS.OPEX);

    // โหลด fingerprint: เดือน|Key
    const existingKeys = sh.getLastRow() > 1
      ? new Set(sh.getRange(2, 1, sh.getLastRow()-1, 4).getValues()
          .map(r => String(r[0])+'|'+String(r[3])))
      : new Set();

    mrs.forEach(r => {
      const key = String(r['เดือน'])+'|'+String(r['Key']);
      if (existingKeys.has(key)) { skipped++; return; } // ข้ามซ้ำ
      sh.appendRow(HEADERS.OPEX.map(h => r[h]!==undefined ? r[h] : ''));
      existingKeys.add(key);
      total++;
    });
  });
  return json({ status:'ok', imported:total, skipped });
}

// ════════════════════════════════════════════════════════════════
//  ลบแถวซ้ำ — รันจาก Apps Script Editor
//  1) previewDuplicates()  → ดูก่อนว่ามีซ้ำอะไรบ้าง (ไม่ลบจริง)
//  2) removeDuplicates()   → ลบจริงหลังยืนยัน
// ════════════════════════════════════════════════════════════════

// ── helper: คืน { rowsToDelete:[], summary:[] } สำหรับแต่ละ Sheet ──
function findDuplicateRows_() {
  const ss = getSpreadsheet();
  const allSheets = ss.getSheets();
  const report = [];

  allSheets.forEach(sh => {
    const name = sh.getName();
    if (sh.getLastRow() < 2) return;

    let keyFn;
    let colCount;

    if (name.startsWith(BASE.SALES + ' ')) {
      // key = วันที่ (col 0) — 1 แถวต่อวัน
      colCount = HEADERS.SALES.length;
      keyFn = r => String(r[0]);
    } else if (name.startsWith(BASE.EXPENSE + ' ')) {
      // key = วันที่|รายการ|รวม(฿) (col 0, 3, 6)
      colCount = HEADERS.EXPENSE.length;
      keyFn = r => String(r[0])+'|'+String(r[3])+'|'+String(r[6]);
    } else if (name.startsWith(BASE.OPEX + ' ')) {
      // key = เดือน|Key (col 0, 3)
      colCount = HEADERS.OPEX.length;
      keyFn = r => String(r[0])+'|'+String(r[3]);
    } else {
      return; // Sheet อื่น (ราคา ฯลฯ) ข้าม
    }

    const data = sh.getRange(2, 1, sh.getLastRow()-1, colCount).getValues();
    const seen = new Map(); // key → row index ที่เจอแรก (0-based ใน data)
    const dupRows = []; // row index ที่ซ้ำ (0-based ใน data)

    data.forEach((row, i) => {
      if (!row[0]) return; // แถวว่าง ข้าม
      const k = keyFn(row);
      if (seen.has(k)) {
        dupRows.push(i); // แถวซ้ำ — เก็บ index
      } else {
        seen.set(k, i); // บันทึกแถวแรก
      }
    });

    if (dupRows.length > 0) {
      report.push({ sheet: name, sh, dupRows, data });
    }
  });

  return report;
}

// ── previewDuplicates: สร้าง Sheet รายงานแสดงซ้ำ (ไม่ลบจริง) ────
// วิธีดูผล: หลัง Run จะมี Sheet ชื่อ "_DuplicateReport" ใน Spreadsheet
function previewDuplicates() {
  const report = findDuplicateRows_();
  const ss = getSpreadsheet();

  // ลบ Sheet เก่าถ้ามี แล้วสร้างใหม่
  const old = ss.getSheetByName('_DuplicateReport');
  if (old) ss.deleteSheet(old);
  const rsh = ss.insertSheet('_DuplicateReport');
  rsh.getRange(1, 1, 1, 5).setValues([['Sheet','แถวใน Sheet','วันที่/เดือน','รายการ','ยอด(฿)']]);
  rsh.getRange(1, 1, 1, 5).setBackground('#3d2b1f').setFontColor('#fff').setFontWeight('bold');

  if (report.length === 0) {
    rsh.appendRow(['✅ ไม่พบข้อมูลซ้ำ','','','','']);
    console.log('previewDuplicates: ไม่พบข้อมูลซ้ำ');
    return;
  }

  let totalDup = 0;
  report.forEach(({ sheet, dupRows, data }) => {
    dupRows.forEach(i => {
      const row = data[i];
      rsh.appendRow([
        sheet,
        i + 2,                          // เลขแถวจริงใน Sheet (รวม header)
        String(row[0] || ''),           // วันที่ / เดือน
        String(row[3] || ''),           // รายการ / Key
        row[6] !== undefined ? row[6] : '',  // ยอด (ถ้ามี)
      ]);
      totalDup++;
    });
  });

  // ไฮไลท์สีเหลืองเตือน
  if (rsh.getLastRow() > 1)
    rsh.getRange(2, 1, rsh.getLastRow()-1, 5).setBackground('#fff9c4');

  ss.setActiveSheet(rsh);
  console.log(`previewDuplicates: พบซ้ำ ${totalDup} แถว — ดูได้ใน Sheet "_DuplicateReport"`);
  console.log('ถ้าต้องการลบจริง ให้รัน removeDuplicates()');
}

// ── removeDuplicates: ลบจริง (รันหลัง previewDuplicates แล้ว) ──
// ⚠️ ตรวจสอบ _DuplicateReport ก่อนรันฟังก์ชันนี้
function removeDuplicates() {
  const report = findDuplicateRows_();

  if (report.length === 0) {
    console.log('removeDuplicates: ไม่พบข้อมูลซ้ำ ไม่มีการลบ');
    return;
  }

  let deleted = 0;
  report.forEach(({ sheet, sh, dupRows }) => {
    // ลบจากแถวล่างขึ้นบนเพื่อไม่ให้ index เลื่อน
    const sorted = [...dupRows].sort((a, b) => b - a);
    sorted.forEach(i => {
      sh.deleteRow(i + 2); // +2 = header + 0-based
      console.log(`ลบ: ${sheet} แถว ${i+2}`);
      deleted++;
    });
  });

  // ลบ Sheet รายงานเมื่อเสร็จ
  const ss = getSpreadsheet();
  const rsh = ss.getSheetByName('_DuplicateReport');
  if (rsh) ss.deleteSheet(rsh);

  console.log(`✅ removeDuplicates: ลบแถวซ้ำสำเร็จ ${deleted} แถว`);
}

// ── Utilities ─────────────────────────────────────────────────
function n(v) { return Number(v)||0; }
function ts(loggedBy) {
  const t = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
  return loggedBy ? t + ' (' + loggedBy + ')' : t;
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}
