// ============================================================
//  Minimal แม่ริม 69 — Google Apps Script (GAS)
//  Spreadsheet ID: 1BaUPfSKfB_YcjXtpPoh9YwJR5H2kC_fHsN9i2jzhCVo
// ============================================================

var SPREADSHEET_ID = "1BaUPfSKfB_YcjXtpPoh9YwJR5H2kC_fHsN9i2jzhCVo";

// ------------------------------------------------------------
// doGet — ดึงฐานข้อมูลราคากลางล่าสุดส่งกลับไปยัง HTML
// ------------------------------------------------------------
function doGet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // สร้าง sheet Material_Prices ถ้ายังไม่มี
  var priceSheet = ss.getSheetByName("Material_Prices");
  if (!priceSheet) {
    priceSheet = ss.insertSheet("Material_Prices");
    priceSheet.appendRow(["Supplier", "ItemName", "LatestPrice", "LastUpdated"]);
  }

  var priceData = priceSheet.getDataRange().getValues();

  return ContentService
    .createTextOutput(JSON.stringify({ prices: priceData }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------
// doPost — รับข้อมูลจาก HTML แล้วบันทึกลง Sheet
// ------------------------------------------------------------
function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ── 1. บันทึกยอดขายประจำวัน (Data_Sales) ──────────────
    if (params.formType === "sales_form") {
      var sheet = ss.getSheetByName("Data_Sales");
      if (!sheet) {
        sheet = ss.insertSheet("Data_Sales");
        sheet.appendRow([
          "วันที่", "ยอดขายรวม", "K-Shop", "เงินสด",
          "Shopee", "Grab", "Lineman",
          "จำนวนขนม (ชิ้น)", "รายได้ขนม",
          "กาแฟแจกฟรี (แก้ว)", "ราคากาแฟ/แก้ว", "ต้นทุนกาแฟรวม"
        ]);
      }

      var freeCoffeeTotal = Number(params.coffee_qty) * Number(params.coffee_price);
      sheet.appendRow([
        params.date,
        Number(params.sales),
        Number(params.kshop),
        Number(params.cash),
        Number(params.shopee),
        Number(params.grab),
        Number(params.lineman),
        Number(params.bakery_qty),
        Number(params.bakery_income),
        Number(params.coffee_qty),
        Number(params.coffee_price),
        freeCoffeeTotal
      ]);
    }

    // ── 2. บันทึกรายจ่ายทุกประเภท (Data_Expenses) ─────────
    if (params.formType === "expense_form") {
      var sheet = ss.getSheetByName("Data_Expenses");
      if (!sheet) {
        sheet = ss.insertSheet("Data_Expenses");
        sheet.appendRow([
          "วันที่", "หมวดหมู่", "Supplier", "รายการ/สินค้า",
          "ราคา/หน่วย", "จำนวน", "ยอดรวม", "ช่องทางชำระ"
        ]);
      }

      sheet.appendRow([
        params.date,
        params.category,
        params.supplier,
        params.item_name,
        Number(params.price_per_unit),
        Number(params.qty),
        Number(params.total_amount),
        params.pay_method
      ]);

      // อัปเดตราคากลางอัตโนมัติ (เฉพาะวัตถุดิบและขนม)
      if (
        params.category === "ต้นทุนวัตถุดิบ" ||
        params.category === "ต้นทุนขนมหน้าร้าน"
      ) {
        updateDynamicPrice(
          ss,
          params.supplier,
          params.item_name,
          Number(params.price_per_unit),
          params.date
        );
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ------------------------------------------------------------
// updateDynamicPrice — จดจำราคาล่าสุดของแต่ละสินค้าอัตโนมัติ
//   - ถ้ามีอยู่แล้ว → อัปเดตราคาและวันที่
//   - ถ้ายังไม่มี  → เพิ่มแถวใหม่
// ------------------------------------------------------------
function updateDynamicPrice(ss, supplier, item, price, date) {
  var sheet = ss.getSheetByName("Material_Prices");
  if (!sheet) {
    sheet = ss.insertSheet("Material_Prices");
    sheet.appendRow(["Supplier", "ItemName", "LatestPrice", "LastUpdated"]);
  }

  var data  = sheet.getDataRange().getValues();
  var found = false;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === supplier && data[i][1] === item) {
      sheet.getRange(i + 1, 3).setValue(price);  // LatestPrice
      sheet.getRange(i + 1, 4).setValue(date);   // LastUpdated
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([supplier, item, price, date]);
  }
}
