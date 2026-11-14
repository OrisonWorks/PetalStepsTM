/**
 * Petal Steps — stock writer endpoint.
 *
 * Deploy once on the shop's Google Sheet:
 *   1. Extensions → Apps Script → paste this file.
 *   2. Project Settings (gear) → Script Properties → add:
 *        STOCK_TOKEN = <any long random string>   (same value as STOCK_WRITER_TOKEN env)
 *   3. Deploy → New deployment → type "Web app" → Execute as: Me →
 *      Who has access: Anyone → Deploy. Copy the /exec URL into
 *      STOCK_WRITER_URL.
 *
 * POST JSON body: { token, model, size, set? , delta?, action?: "remove",
 *   undo?: boolean, undoAction?: "remove" }
 * POST JSON body: { token, action: "voidSale", model, size, targetTs,
 *   targetNote } — corrects a mistakenly recorded sale without changing stock.
 *   - `set` writes an absolute count; otherwise `delta` (default -1) is applied,
 *     clamped at 0.
 * POST JSON body: { token, action: "updateProduct", model, fields }
 *   - `fields` may set: name, price, category, description, photo, colour,
 *     active. Columns are created if missing; only provided keys are written,
 *     always to the model's first row (the site reads first non-empty value).
 * POST JSON body: { token, action: "logEvent", event, model, size?, note? }
 *   - Appends a row to the LOG tab: TS, ACTION, MODEL, SIZE, NOTE.
 *     event is "interest" (client tapped order on WhatsApp); sold/restock
 *     writes are logged automatically.
 * POST JSON body: { token, action: "createReceipt", fields }
 *   - Appends to the RECEIPTS tab and returns an auto-numbered PS-#### id.
 * POST JSON body: { token, action: "sendReceiptEmail", email, subject, body }
 *   - Sends the receipt text via MailApp (to the address given).
 * POST JSON body: { token, action: "subscribe", email }
 *   - Appends to the SUBSCRIBERS tab (TS, EMAIL), deduped — the newsletter.
 * POST JSON body: { token, action: "sendNewsletter", subject, html, text? }
 *   - Sends the newsletter to every SUBSCRIBERS address until the daily
 *     Gmail quota runs out; returns {sent, failed, remaining}. Rows whose
 *     STATUS column is marked (e.g. "stop") are skipped; a LAST_BATCH
 *     marker stops a quota-interrupted rerun resending the same message
 *     (the batch key hashes the full subject + text + html, so a later
 *     same-subject campaign still reaches everyone).
 * POST JSON body: { token, action: "unsubscribe", email }
 *   - Marks the SUBSCRIBERS row STATUS=stop so future sends skip it.
 * GET /exec?token=…&kind=log&n=300 — last n LOG rows as JSON.
 * GET /exec?token=…&kind=receipt&no=PS-0001 — one receipt row as JSON.
 * GET /exec?token=…&kind=receipts — all receipt rows (keys stripped).
 * GET /exec?token=…&kind=subscribers — SUBSCRIBERS rows (TS, EMAIL) as JSON.
 * GET /exec?token=…&kind=leads — order taps (model+size) never followed
 *   by a sale — a follow-up/demand list.
 *
 * Time-driven triggers — run installTriggers() ONCE from the editor
 * (Run ▶). It creates/updates:
 *   dailyDigest()   — emails the day's sales/interest summary, ~21:00
 *   weeklyDigest()  — emails the last-7-days rollup, Sunday ~20:00
 *   monthlyDigest() — emails the previous month's rollup, 1st ~08:00
 *   backupSheet()   — emails every tab as CSV attachments, Sunday ~06:00
 * Both mail REPORT_EMAIL (Script Property) or fall back to the owner.
 *
 * Stock-take layout (one row per size): finds every row matching MODEL+SIZE,
 * treats the summed COUNT as the live count, writes the new count to the first
 * row and zeroes duplicates. Restocking a size with no row appends one.
 * Catalogue layout (one row per sku): updates the stock_<size> column.
 * A script lock serializes writes so overlapping sales can't lose updates;
 * SpreadsheetApp.flush() before releasing the lock ensures the write is
 * committed before the next writer reads.
 */
function doPost(e) {
  const out = (o) =>
    ContentService.createTextOutput(JSON.stringify(o)).setMimeType(
      ContentService.MimeType.JSON
    );
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const token = PropertiesService.getScriptProperties().getProperty(
      "STOCK_TOKEN"
    );
    if (!token || body.token !== token)
      return out({ ok: false, error: "unauthorized" });

    if (body.action === "voidSale") return voidSale(body, out);
    if (body.action === "restoreSale") return restoreSale(body, out);
    if (body.action === "updateProduct")
      return updateProduct(body, out);
    if (body.action === "createProduct")
      return createProduct(body, out);
    if (body.action === "logEvent") return logEvent(body, out);
    if (body.action === "subscribe") return subscribeEmail(body, out);
    if (body.action === "createReceipt") return createReceipt(body, out);
    if (body.action === "sendReceiptEmail")
      return sendReceiptEmail(body, out);
    if (body.action === "sendNewsletter")
      return sendNewsletter(body, out);
    if (body.action === "unsubscribe")
      return unsubscribeEmail(body, out);
    if (body.action === "uploadPhoto") return uploadPhoto(body, out);
    if (body.action === "registerReceipt")
      return registerReceipt(body, out);
    if (body.action === "syncReceiptRegister")
      return syncReceiptRegister(body, out);
    if (body.action === "recordReceiptException")
      return recordReceiptException(body, out);
    if (body.action === "resolveReceiptException")
      return resolveReceiptException(body, out);
    if (body.action === "closeFilingPeriod")
      return closeFilingPeriod(body, out);
    if (body.action === "addFilingEvidence")
      return addFilingEvidence(body, out);
    if (body.action === "recordDailyReconciliation")
      return recordDailyReconciliation(body, out);

    const model = String(body.model || "").trim();
    const size = parseInt(body.size, 10);
    if (!model || !size)
      return out({ ok: false, error: "model and size required" });

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      const data = sheet.getDataRange().getValues();
      const headers = data[0].map((h) =>
        String(h).trim().toLowerCase().replace(/\s+/g, "_")
      );
      const modelCol =
        headers.indexOf("model") >= 0
          ? headers.indexOf("model")
          : headers.indexOf("sku");
      const sizeCol = headers.indexOf("size");
      const countCol =
        headers.indexOf("count") >= 0
          ? headers.indexOf("count")
          : headers.indexOf("qty");
      const colorCol = headers.indexOf("color");
      const priceCol = headers.indexOf("price");

      const rowIdxs = [];
      let colIdx = -1;
      if (modelCol >= 0 && sizeCol >= 0 && countCol >= 0) {
        // stock-take layout
        for (let i = 1; i < data.length; i++) {
          if (
            String(data[i][modelCol]).trim() === model &&
            parseInt(data[i][sizeCol], 10) === size
          )
            rowIdxs.push(i);
        }
        colIdx = countCol;
        if (rowIdxs.length === 0) {
          // size never stocked: append a row so restock works
          const applySet =
            body.set != null
              ? Math.max(0, parseInt(body.set, 10) || 0)
              : Math.max(0, body.delta || -1);
          if (applySet <= 0)
            return out({ ok: false, error: "row not found", model, size });
          const newRow = new Array(data[0].length).fill("");
          if (colorCol >= 0) newRow[colorCol] = "";
          newRow[sizeCol] = size;
          newRow[countCol] = applySet;
          newRow[modelCol] = model;
          sheet.appendRow(newRow);
          appendLog_(body.undo ? "undo" : "restock", model, size,
            "0→" + applySet + priceSuffix_(data, modelCol, model, priceCol));
          return out({
            ok: true,
            model,
            size,
            previous: 0,
            count: applySet,
            appended: true,
          });
        }
      } else if (modelCol >= 0) {
        // catalogue layout
        colIdx = headers.indexOf("stock_" + size);
        if (colIdx < 0)
          return out({ ok: false, error: "no stock_" + size + " column" });
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][modelCol]).trim() === model) rowIdxs.push(i);
        }
      } else {
        return out({ ok: false, error: "unrecognized sheet layout" });
      }
      if (rowIdxs.length === 0)
        return out({ ok: false, error: "row not found", model, size });

      const current = rowIdxs.reduce(
        (sum, i) => sum + (parseInt(data[i][colIdx], 10) || 0),
        0
      );
      const next =
        body.set != null
          ? Math.max(0, parseInt(body.set, 10) || 0)
          : Math.max(0, current + (body.delta || -1));
      sheet.getRange(rowIdxs[0] + 1, colIdx + 1).setValue(next);
      for (let k = 1; k < rowIdxs.length; k++)
        sheet.getRange(rowIdxs[k] + 1, colIdx + 1).setValue(0);
      // Stamp the sale-time price into the note so revenue stays correct
      // after later price edits — "0→1 · K450". Legacy rows lack the suffix
      // and the app falls back to the current list price.
      const event = body.undo
        ? "undo"
        : body.action === "remove"
          ? "remove"
          : next < current
            ? "sold"
            : "restock";
      const note = current + "→" + next +
        (body.undo && body.undoAction === "remove" ? " · remove" : "") +
        priceSuffix_(data, modelCol, model, priceCol);
      appendLog_(event, model, size, note);
      return out({ ok: true, model, size, previous: current, count: next });
    } finally {
      SpreadsheetApp.flush();
      lock.releaseLock();
    }
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

// Writes product metadata overrides (name/price/category/description/photo/
// colour/active) into the model's first row, creating columns when missing.
// The site's parser prefers these sheet values over the built-in catalogue.
function updateProduct(body, out) {
  const model = String(body.model || "").trim();
  const fields = body.fields;
  if (!model || !fields || typeof fields !== "object")
    return out({ ok: false, error: "model and fields required" });
  const ALLOWED = [
    "name",
    "price",
    "category",
    "description",
    "photo",
    "colour",
    "active",
  ];

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map((h) =>
      String(h).trim().toLowerCase().replace(/\s+/g, "_")
    );
    const modelCol =
      headers.indexOf("model") >= 0
        ? headers.indexOf("model")
        : headers.indexOf("sku");
    if (modelCol < 0)
      return out({ ok: false, error: "no model/sku column" });
    let rowIdx = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][modelCol]).trim() === model) {
        rowIdx = i;
        break;
      }
    }
    if (rowIdx < 0) return out({ ok: false, error: "row not found", model });

    let nextCol = data[0].length;
    const written = {};
    for (const key of ALLOWED) {
      if (fields[key] == null) continue;
      let value = String(fields[key]).trim();
      // A leading =, +, -, @ would be stored as a live formula; the
      // apostrophe prefix forces a literal cell (not displayed).
      if (/^[=+\-@]/.test(value)) value = "'" + value;
      let col = headers.indexOf(key);
      if (col < 0) {
        col = nextCol;
        headers.push(key);
        sheet.getRange(1, col + 1).setValue(key.toUpperCase());
        nextCol++;
      }
      sheet.getRange(rowIdx + 1, col + 1).setValue(value);
      written[key] = value;
    }
    return out({ ok: true, model, updated: written });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

// POST { action: "createProduct", model, fields: {name, price, category,
// colour, photo, description}, sizes: [{size, count}, ...] }
// Adds a brand-new style: one stock-take row per size (colour goes in the
// per-row COLOR column), metadata overrides on the first new row. The
// parser prefers these sheet values, so the style is live without a
// catalogue entry.
function createProduct(body, out) {
  const model = String(body.model || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,29}$/.test(model))
    return out({ ok: false, error: "model: 2-30 letters/digits/-/_" });
  const fields = body.fields || {};
  if (!String(fields.name || "").trim())
    return out({ ok: false, error: "name required" });
  const price = parseFloat(String(fields.price || ""));
  if (!(price > 0)) return out({ ok: false, error: "price must be positive" });
  // The storefront parser only reads EU 35–45 stock — outside sizes would
  // create a style it can never show.
  const sizes = (Array.isArray(body.sizes) ? body.sizes : [])
    .map((s) => ({
      size: parseInt(s && s.size, 10),
      count: Math.max(0, parseInt(s && s.count, 10) || 0),
    }))
    .filter((s) => s.size >= 35 && s.size <= 45 && s.count > 0);
  if (sizes.length === 0)
    return out({ ok: false, error: "at least one size with stock required" });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map((h) =>
      String(h).trim().toLowerCase().replace(/\s+/g, "_")
    );
    // Match exactly the headers the storefront parser reads — accepting
    // SKU/QTY here would write rows the site can't see.
    const modelCol = headers.indexOf("model");
    const sizeCol = headers.indexOf("size");
    const countCol = headers.indexOf("count");
    const colorCol = headers.indexOf("color");
    if (modelCol < 0 || sizeCol < 0 || countCol < 0)
      return out({ ok: false, error: "needs stock-take layout (MODEL/SIZE/COUNT)" });
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][modelCol]).trim() === model)
        return out({ ok: false, error: "model already exists", model });
    }

    let nextCol = data[0].length;
    const ensureCol = (key) => {
      let col = headers.indexOf(key);
      if (col < 0) {
        col = nextCol;
        headers.push(key);
        sheet.getRange(1, col + 1).setValue(key.toUpperCase());
        nextCol++;
      }
      return col;
    };

    const firstRow = sheet.getLastRow() + 1;
    for (const s of sizes) {
      const row = new Array(nextCol).fill("");
      if (colorCol >= 0) row[colorCol] = safe_(fields.colour || "");
      row[sizeCol] = s.size;
      row[countCol] = s.count;
      row[modelCol] = model;
      sheet.appendRow(row);
    }
    // Metadata overrides on the first appended row — same mechanism
    // updateProduct uses.
    const OVERRIDE = ["name", "price", "category", "description", "photo"];
    for (const key of OVERRIDE) {
      if (fields[key] == null || String(fields[key]).trim() === "") continue;
      const col = ensureCol(key);
      sheet.getRange(firstRow, col + 1).setValue(safe_(fields[key]));
    }
    appendLog_(
      "restock",
      model,
      "",
      "new style · " + sizes.map((s) => "EU" + s.size + "×" + s.count).join(", ")
    );
    return out({ ok: true, model, sizes });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

// ---------- shared helpers ----------

// Finds a tab by name, creating it with the given header row when missing.
function getOrCreate_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

// " · K450" when the row carries a positive price — empty otherwise.
// Price lives on the model's first row in the stock-take layout, so the
// sale-time price must be read across all of the model's rows — matching
// how the sheet parser resolves it.
function priceSuffix_(data, modelCol, model, priceCol) {
  if (priceCol < 0) return "";
  for (let i = 1; i < data.length; i++) {
    if (modelCol >= 0 && String(data[i][modelCol]).trim() !== model) continue;
    const price = parseFloat(String(data[i][priceCol] || "").replace(/[^0-9.]/g, ""));
    if (price > 0) return " · K" + price;
  }
  return "";
}

// Appends one LOG row: TS, ACTION, MODEL, SIZE, NOTE. Never throws — a
// failed log must not fail the stock write it trails (a reported failure
// would invite a retry that double-counts the sale).
function appendLog_(action, model, size, note) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreate_(ss, "LOG", ["TS", "ACTION", "MODEL", "SIZE", "NOTE"]);
    sheet.appendRow([
      new Date(),
      safe_(action),
      safe_(model),
      size == null ? "" : safe_(size),
      safe_(note || ""),
    ]);
    return true;
  } catch (err) {
    // deliberately swallowed — see comment above
    return false;
  }
}

// Prefixes formula-leading characters so values can't execute in the sheet.
function safe_(value) {
  let v = String(value).trim();
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  return v;
}

// Small stable hash (djb2) for campaign keys — identical input always
// gives the same key, so newsletter retries resume the same campaign.
function hash_(s) {
  let h = 5381;
  const str = String(s);
  for (let i = 0; i < str.length; i++) h = (h * 33 + str.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

// Returns a tab's data rows as objects keyed by header name.
function sheetRows_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map((h) => String(h).trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((h, c) => {
      row[h] = data[i][c] instanceof Date
        ? Utilities.formatDate(
            data[i][c],
            Session.getScriptTimeZone(),
            "yyyy-MM-dd'T'HH:mm:ss"
          )
        : String(data[i][c]);
    });
    rows.push(row);
  }
  return rows;
}

function ensureComplianceSheets_(ss) {
  getOrCreate_(ss, "RECEIPT_REGISTER", [
    "ID", "RECEIPT_NO", "SOURCE", "ISSUE_DATE", "PERIOD", "STATUS",
    "CLIENT", "AMOUNT", "ITEMS", "PAYMENT_METHOD", "NOTES",
    "CREATED_TS", "UPDATED_TS", "EVIDENCE_URL"
  ]);
  getOrCreate_(ss, "RECEIPT_EXCEPTIONS", [
    "ID", "PERIOD", "RECEIPT_NO", "TYPE", "SEVERITY", "DETAILS",
    "STATUS", "RESOLUTION", "CREATED_TS", "RESOLVED_TS"
  ]);
  getOrCreate_(ss, "FILING_PERIODS", [
    "PERIOD", "STATUS", "GROSS_TURNOVER", "RECEIPT_COUNT",
    "EXCEPTION_COUNT", "TAX_METHOD", "CALCULATED_TAX",
    "APPROVED_BY", "APPROVED_TS", "ACK_REF", "PAYMENT_REF", "NOTES"
  ]);
  getOrCreate_(ss, "FILING_EVIDENCE", [
    "ID", "PERIOD", "TYPE", "NAME", "CONTENT_URL", "CREATED_TS"
  ]);
  getOrCreate_(ss, "DAILY_RECONCILIATIONS", [
    "ID", "DATE", "PERIOD", "RECEIPT_TOTAL", "CASH_TOTAL",
    "MOBILE_MONEY_TOTAL", "BANK_TOTAL", "OUTSTANDING_TOTAL",
    "DIFFERENCE", "STATUS", "NOTES", "CREATED_TS"
  ]);
}

function id_() {
  return Utilities.getUuid().replace(/-/g, "").slice(0, 16);
}

function period_(value) {
  const p = String(value || "").trim();
  return /^\d{4}-\d{2}$/.test(p) ? p : "";
}

function appendComplianceRow_(ss, name, headers, values) {
  const sheet = getOrCreate_(ss, name, headers);
  sheet.appendRow(values);
  return true;
}

function registerReceipt(body, out) {
  const f = body.fields || {};
  const no = String(f.receiptNo || "").trim();
  const date = String(f.issueDate || "").trim();
  const period = period_(f.period || date.slice(0, 7));
  const status = String(f.status || "valid").trim();
  const amount = parseInt(String(f.amount || "").replace(/[^0-9]/g, ""), 10) || 0;
  if (!no || !date || !period)
    return out({ ok: false, error: "receipt number, issue date and period required" });
  if (!["valid", "unused", "void", "reissued", "needs_review"].includes(status))
    return out({ ok: false, error: "invalid receipt status" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureComplianceSheets_(ss);
    const rows = sheetRows_(ss, "RECEIPT_REGISTER");
    if (rows.some((r) => String(r.receipt_no) === no))
      return out({ ok: false, error: "receipt already registered" });
    const now = new Date();
    appendComplianceRow_(ss, "RECEIPT_REGISTER", [
      "ID", "RECEIPT_NO", "SOURCE", "ISSUE_DATE", "PERIOD", "STATUS",
      "CLIENT", "AMOUNT", "ITEMS", "PAYMENT_METHOD", "NOTES",
      "CREATED_TS", "UPDATED_TS", "EVIDENCE_URL"
    ], [
      id_(), safe_(no), safe_(f.source || "physical"), safe_(date), safe_(period),
      safe_(status), safe_(f.client || ""), amount, safe_(f.items || ""),
      safe_(f.method || ""), safe_(f.notes || ""), now, now, safe_(f.evidenceUrl || "")
    ]);
    return out({ ok: true, receiptNo: no });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

function syncReceiptRegister(body, out) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureComplianceSheets_(ss);
    const register = sheetRows_(ss, "RECEIPT_REGISTER");
    const known = new Set(register.map((r) => String(r.receipt_no)));
    const receipts = sheetRows_(ss, "RECEIPTS");
    const sheet = ss.getSheetByName("RECEIPT_REGISTER");
    let added = 0;
    receipts.forEach((r) => {
      const no = String(r.no || "").trim();
      if (!no || known.has(no)) return;
      const date = String(r.date || "").slice(0, 10);
      if (!date) return;
      sheet.appendRow([
        id_(), safe_(no), "digital", safe_(date), safe_(date.slice(0, 7)),
        "valid", safe_(r.client || ""), parseInt(String(r.amount || "").replace(/[^0-9]/g, ""), 10) || 0,
        safe_(r.items || ""), safe_(r.method || ""), safe_(r.note || ""),
        new Date(), new Date(), ""
      ]);
      known.add(no);
      added++;
    });
    return out({ ok: true, added });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

function recordReceiptException(body, out) {
  const f = body.fields || {};
  const period = period_(f.period);
  const receiptNo = String(f.receiptNo || "").trim();
  const type = String(f.type || "").trim();
  const details = String(f.details || "").trim();
  if (!period || !type || !details)
    return out({ ok: false, error: "period, type and details required" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureComplianceSheets_(ss);
    const now = new Date();
    appendComplianceRow_(ss, "RECEIPT_EXCEPTIONS", [
      "ID", "PERIOD", "RECEIPT_NO", "TYPE", "SEVERITY", "DETAILS",
      "STATUS", "RESOLUTION", "CREATED_TS", "RESOLVED_TS"
    ], [
      id_(), safe_(period), safe_(receiptNo), safe_(type),
      safe_(f.severity || "review"), safe_(details), "open", "", now, ""
    ]);
    return out({ ok: true });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

function resolveReceiptException(body, out) {
  const f = body.fields || {};
  const id = String(f.id || "").trim();
  const resolution = String(f.resolution || "").trim();
  if (!id || !resolution) return out({ ok: false, error: "exception id and resolution required" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureComplianceSheets_(ss);
    const sheet = ss.getSheetByName("RECEIPT_EXCEPTIONS");
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map((h) => String(h).trim().toLowerCase());
    const idCol = headers.indexOf("id");
    const statusCol = headers.indexOf("status");
    const resolutionCol = headers.indexOf("resolution");
    const resolvedCol = headers.indexOf("resolved_ts");
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) !== id) continue;
      if (String(data[i][statusCol]).toLowerCase() === "resolved")
        return out({ ok: false, error: "exception already resolved" });
      sheet.getRange(i + 1, statusCol + 1).setValue("resolved");
      sheet.getRange(i + 1, resolutionCol + 1).setValue(safe_(resolution));
      sheet.getRange(i + 1, resolvedCol + 1).setValue(new Date());
      return out({ ok: true });
    }
    return out({ ok: false, error: "exception not found" });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

function closeFilingPeriod(body, out) {
  const f = body.fields || {};
  const period = period_(f.period);
  const status = String(f.status || "review").trim();
  if (!period || !["review", "approved", "submitted"].includes(status))
    return out({ ok: false, error: "valid period and status required" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureComplianceSheets_(ss);
    const existing = sheetRows_(ss, "FILING_PERIODS");
    const sheet = ss.getSheetByName("FILING_PERIODS");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map((h) => String(h).trim().toLowerCase());
    const rowIndex = existing.findIndex((r) => String(r.period) === period);
    const previous = rowIndex >= 0 ? existing[rowIndex] : {};
    const values = {
      period, status, gross_turnover: parseInt(String(f.grossTurnover || "").replace(/[^0-9]/g, ""), 10) || 0,
      receipt_count: parseInt(f.receiptCount, 10) || 0,
      exception_count: parseInt(f.exceptionCount, 10) || 0,
      tax_method: String(f.taxMethod || "manual_review"),
      calculated_tax: parseInt(String(f.calculatedTax || "").replace(/[^0-9]/g, ""), 10) || 0,
      approved_by: String(f.approvedBy || ""),
      approved_ts: status === "approved" || status === "submitted" ? new Date() : "",
      ack_ref: Object.prototype.hasOwnProperty.call(f, "ackRef") ? String(f.ackRef || "") : String(previous.ack_ref || ""),
      payment_ref: Object.prototype.hasOwnProperty.call(f, "paymentRef") ? String(f.paymentRef || "") : String(previous.payment_ref || ""),
      notes: String(f.notes || "")
    };
    const row = headers.map((h) => values[h] == null ? "" : values[h]);
    if (rowIndex >= 0) sheet.getRange(rowIndex + 2, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);
    return out({ ok: true, period, status });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

function addFilingEvidence(body, out) {
  const f = body.fields || {};
  const period = period_(f.period);
  const name = String(f.name || "").trim();
  const type = String(f.type || "document").trim();
  const url = String(f.contentUrl || "").trim();
  if (!period || !name)
    return out({ ok: false, error: "period and evidence name required" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureComplianceSheets_(ss);
    appendComplianceRow_(ss, "FILING_EVIDENCE", [
      "ID", "PERIOD", "TYPE", "NAME", "CONTENT_URL", "CREATED_TS"
    ], [id_(), safe_(period), safe_(type), safe_(name), safe_(url), new Date()]);
    return out({ ok: true });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

function recordDailyReconciliation(body, out) {
  const f = body.fields || {};
  const date = String(f.date || "").trim();
  const period = period_(f.period);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !period)
    return out({ ok: false, error: "valid date and period required" });
  const receiptTotal = Number(f.receiptTotal) || 0;
  const cashTotal = Number(f.cashTotal) || 0;
  const mobileMoneyTotal = Number(f.mobileMoneyTotal) || 0;
  const bankTotal = Number(f.bankTotal) || 0;
  const outstandingTotal = Number(f.outstandingTotal) || 0;
  const difference = receiptTotal - cashTotal - mobileMoneyTotal - bankTotal - outstandingTotal;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureComplianceSheets_(ss);
    appendComplianceRow_(ss, "DAILY_RECONCILIATIONS", [
      "ID", "DATE", "PERIOD", "RECEIPT_TOTAL", "CASH_TOTAL",
      "MOBILE_MONEY_TOTAL", "BANK_TOTAL", "OUTSTANDING_TOTAL",
      "DIFFERENCE", "STATUS", "NOTES", "CREATED_TS"
    ], [
      id_(), safe_(date), safe_(period), receiptTotal, cashTotal,
      mobileMoneyTotal, bankTotal, outstandingTotal, difference,
      Math.abs(difference) < 0.01 ? "matched" : "exception",
      safe_(String(f.notes || "")), new Date()
    ]);
    return out({ ok: true, difference });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

// Corrects a mistakenly recorded sale after the short-lived stock toast has
// disappeared. This is a log correction only: current stock is unchanged.
function voidSale(body, out) {
  const model = String(body.model || "").trim();
  const size = String(body.size || "").trim();
  const targetTs = String(body.targetTs || "").trim();
  const targetNote = String(body.targetNote || "").trim();
  if (!model || !size || !targetTs || !targetNote)
    return out({ ok: false, error: "target sale required" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const rows = sheetRows_(SpreadsheetApp.getActiveSpreadsheet(), "LOG");
    const targetIndex = rows.findIndex((r) =>
      r.action === "sold" &&
      String(r.model) === model &&
      String(r.size) === size &&
      String(r.ts) === targetTs &&
      String(r.note) === targetNote
    );
    if (targetIndex < 0) return out({ ok: false, error: "sale not found" });
    const pairedSales = new Set();
    for (let i = rows.length - 1; i >= 0; i--) {
      const v = rows[i];
      if (v.action !== "void" || String(v.model) !== model || String(v.size) !== size) continue;
      const marker = String(v.note || "");
      const match = /^void sold (?:(\d{4}-\d{2}-\d{2}T\S+) )?(.*)$/.exec(marker);
      if (!match) continue;
      for (let j = i - 1; j >= 0; j--) {
        const o = rows[j];
        if (pairedSales.has(j) || o.action !== "sold" || String(o.model) !== model ||
            String(o.size) !== size || String(o.note) !== match[2]) continue;
        if (match[1] && String(o.ts) !== match[1]) continue;
        pairedSales.add(j);
        break;
      }
    }
    if (pairedSales.has(targetIndex))
      return out({ ok: false, error: "sale already corrected" });
    const marker = "void sold " + targetTs + " " + targetNote;
    if (!appendLog_("void", model, size, marker))
      return out({ ok: false, error: "correction failed" });
    return out({ ok: true });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

// Reverses a mistaken "not sold" correction without changing current stock.
function restoreSale(body, out) {
  const model = String(body.model || "").trim();
  const size = String(body.size || "").trim();
  const targetTs = String(body.targetTs || "").trim();
  const targetNote = String(body.targetNote || "").trim();
  if (!model || !size || !targetTs || !targetNote)
    return out({ ok: false, error: "target sale required" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const rows = sheetRows_(SpreadsheetApp.getActiveSpreadsheet(), "LOG");
    const target = rows.find((r) =>
      r.action === "sold" &&
      String(r.model) === model &&
      String(r.size) === size &&
      String(r.ts) === targetTs &&
      String(r.note) === targetNote
    );
    if (!target) return out({ ok: false, error: "sale not found" });
    const marker = "void sold " + target.ts + " " + target.note;
    if (!rows.some((r) =>
      r.action === "void" &&
      String(r.model) === model &&
      String(r.size) === size &&
      (String(r.note) === marker || String(r.note) === "void sold " + target.note)
    ))
      return out({ ok: false, error: "sale is not corrected" });
    const restoreMarker = "unvoid sold " + target.ts + " " + target.note;
    if (rows.some((r) =>
      r.action === "unvoid" &&
      String(r.model) === model &&
      String(r.size) === size &&
      String(r.note) === restoreMarker
    ))
      return out({ ok: false, error: "sale already restored" });
    if (!appendLog_("unvoid", model, size, restoreMarker))
      return out({ ok: false, error: "restore failed" });
    return out({ ok: true });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

// ---------- event log ----------

// POST { action: "logEvent", event, model, size?, note? }
// "interest" events come from public site taps; sold/restock are written
// automatically by the stock path — those events are accepted here too only
// so the API surface stays simple; the app never sends them directly.
function logEvent(body, out) {
  const event = String(body.event || "").trim();
  const model = String(body.model || "").trim();
  if (!["interest", "sold", "restock", "edit", "create", "receipt", "unsubscribe", "compliance", "whatsapp"].includes(event))
    return out({ ok: false, error: "unknown event" });
  if (!model) return out({ ok: false, error: "model required" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const logged = appendLog_(event, model, body.size || "",
      safe_(String(body.note || "")).slice(0, 300));
    // Unlike stock writes (which must not fail on a log failure), an
    // interest event IS the log write — report it honestly.
    if (!logged) return out({ ok: false, error: "log write failed" });
    return out({ ok: true });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

// ---------- mailing list ----------

// POST { action: "subscribe", email } → appends to a SUBSCRIBERS tab
// (TS, EMAIL), deduped case-insensitively. Public-facing (the site's
// newsletter form) so it does as little as possible.
function subscribeEmail(body, out) {
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 320)
    return out({ ok: false, error: "invalid email" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreate_(ss, "SUBSCRIBERS", ["TS", "EMAIL"]);
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map((h) => String(h).trim().toLowerCase());
    const emailCol = headers.indexOf("email");
    const statusCol = headers.indexOf("status");
    let exists = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][emailCol]).trim().toLowerCase() === email) {
        exists = true;
        // A resubscribe after opting out clears the stop marker.
        if (statusCol >= 0 && String(data[i][statusCol]).trim()) {
          sheet.getRange(i + 1, statusCol + 1).setValue("");
          sheet.getRange(i + 1, 1).setValue(new Date());
          SpreadsheetApp.flush();
        }
        break;
      }
    }
    if (!exists) {
      sheet.appendRow([new Date(), safe_(email)]);
      SpreadsheetApp.flush();
    }
    return out({ ok: true, email, already: exists });
  } finally {
    lock.releaseLock();
  }
}

// POST { action: "unsubscribe", email } → marks STATUS=stop on the
// SUBSCRIBERS row (a suppression, not a deletion — the address stays for
// dedupe, and resubscribing clears the marker).
function unsubscribeEmail(body, out) {
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return out({ ok: false, error: "invalid email" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreate_(ss, "SUBSCRIBERS", ["TS", "EMAIL"]);
    const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map((h) => String(h).trim().toLowerCase());
    const colOf = (name) => {
      let col = header.lastIndexOf(name);
      if (col < 0) {
        col = header.length;
        header.push(name);
        sheet.getRange(1, col + 1).setValue(name.toUpperCase());
      }
      return col;
    };
    const emailCol = header.indexOf("email");
    const statusCol = colOf("status");
    const data = sheet.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][emailCol]).trim().toLowerCase() === email) {
        sheet.getRange(i + 1, statusCol + 1).setValue("stop");
        found = true;
        break;
      }
    }
    if (!found) {
      // Row to mark stop on even when the address isn't on file — a
      // later re-add via subscribe clears it.
      const row = new Array(statusCol + 1).fill("");
      row[0] = new Date();
      row[emailCol] = safe_(email);
      row[statusCol] = "stop";
      sheet.appendRow(row);
    }
    SpreadsheetApp.flush();
    return out({ ok: true, email });
  } finally {
    lock.releaseLock();
  }
}

// ---------- receipts ----------

// POST { action: "createReceipt", fields: { client, phone, items, amount,
// words, method, balance, note } } → { ok, no: "PS-0007" }
// items is a plain-text lines blob; words is amount-in-words (site-generated).
function createReceipt(body, out) {
  const f = body.fields || {};
  const amount = parseInt(String(f.amount || "").replace(/[^0-9]/g, ""), 10);
  if (!(amount > 0)) return out({ ok: false, error: "amount must be positive" });
  if (!String(f.client || "").trim())
    return out({ ok: false, error: "client name required" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreate_(ss, "RECEIPTS", [
      "NO", "DATE", "CLIENT", "PHONE", "ITEMS", "AMOUNT",
      "WORDS", "METHOD", "BALANCE", "NOTE", "KEY",
    ]);
    // Write every field under its own header — a pre-existing tab may be
    // missing KEY or have columns in a different order, and positional
    // writes would land values under the wrong headers. One setValues
    // call keeps the write atomic: no half-written receipt on failure.
    const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map((h) => String(h).trim().toLowerCase());
    const colOf = (name) => {
      // lastIndexOf matches sheetRows_, which lets the last duplicate
      // header win — writing the first would leave the read column empty.
      let col = header.lastIndexOf(name);
      if (col < 0) {
        col = header.length;
        header.push(name);
        sheet.getRange(1, col + 1).setValue(name.toUpperCase());
      }
      return col;
    };
    const no =
      "PS-" + String(sheet.getLastRow()).padStart(4, "0");
    // Unguessable per-receipt key — the public /receipt/<no>?k=<key> link
    // needs it, so sequential numbers can't be enumerated.
    const key = Utilities.getUuid().replace(/-/g, "").slice(0, 12);
    const row = [];
    const put = (name, value) => {
      row[colOf(name)] = value;
    };
    put("no", no);
    put("date", new Date());
    put("client", safe_(f.client));
    put("phone", safe_(f.phone || ""));
    put("items", safe_(String(f.items || "")).slice(0, 1500));
    put("amount", amount);
    put("words", safe_(String(f.words || "")).slice(0, 200));
    put("method", safe_(String(f.method || "")));
    put("balance", safe_(String(f.balance || "")));
    put("note", safe_(String(f.note || "")).slice(0, 300));
    put("area", safe_(String(f.area || "")).slice(0, 100));
    put("heard", safe_(String(f.heard || "")).slice(0, 60));
    put("key", key);
    for (let c = 0; c < row.length; c++) if (row[c] === undefined) row[c] = "";
    const rowNum = sheet.getLastRow() + 1;
    sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
    return out({ ok: true, no, key });
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

// POST { action: "sendReceiptEmail", email, subject, body }
function sendReceiptEmail(body, out) {
  const email = String(body.email || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return out({ ok: false, error: "valid email required" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return out({ ok: false, error: "busy" });
  try {
    MailApp.sendEmail(
      email,
      safe_(String(body.subject || "Petal Steps receipt")).slice(0, 200),
      String(body.body || "").slice(0, 8000)
    );
    return out({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// ---------- newsletter ----------

// POST { action: "uploadPhoto", mime, data }
// Saves a product photo to a shared "petalsteps-photos" Drive folder
// (anyone-with-link can view) and returns an embeddable URL. `data` is
// base64, with or without a data: prefix.
function uploadPhoto(body, out) {
  const data = String(body.data || "");
  const mime = String(body.mime || "").trim() || "image/jpeg";
  if (!/^image\/(png|jpe?g|webp|gif|avif)$/.test(mime))
    return out({ ok: false, error: "unsupported image type" });
  const b64 = data.includes(",")
    ? data.slice(data.indexOf(",") + 1)
    : data;
  if (!b64) return out({ ok: false, error: "no image data" });
  if (b64.length > 8 * 1024 * 1024)
    return out({ ok: false, error: "image too large" });
  const ext = mime.split("/")[1].replace("jpeg", "jpg");
  const name = "product-" + Utilities.getUuid() + "." + ext;
  const blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, name);
  const file = photoFolder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return out({
    ok: true,
    id: file.getId(),
    url: "https://lh3.googleusercontent.com/d/" + file.getId(),
  });
}

function photoFolder_() {
  const it = DriveApp.getFoldersByName("petalsteps-photos");
  return it.hasNext() ? it.next() : DriveApp.createFolder("petalsteps-photos");
}

// Run once from the Apps Script editor to grant Drive authorization before
// the web app's first upload. Safe to rerun; it does not create duplicates.
function authorizeDrive() {
  const folder = photoFolder_();
  Logger.log("Drive access is authorized. Folder: " + folder.getName());
}

// POST { action: "sendNewsletter", subject, html, text? }
// Sends to every SUBSCRIBERS row. Free Gmail sends ~100 recipients/day —
// MailApp.getRemainingDailyQuota() gates the loop so a big list degrades
// to a partial send the caller can rerun tomorrow, not an error. Rows
// with a STATUS value (e.g. "stop") are skipped; each send stamps
// LAST_BATCH with a key hashed from the full subject+text+html, so a
// quota-interrupted rerun continues where it stopped — while any NEW
// content (same subject, different message or photo) has a different
// key and sends to all.
function sendNewsletter(body, out) {
  const subject = safe_(String(body.subject || "").trim()).slice(0, 200);
  const html = String(body.html || "").slice(0, 60000);
  const text = String(body.text || "").slice(0, 20000);
  if (!subject) return out({ ok: false, error: "subject required" });
  if (!html && !text) return out({ ok: false, error: "html or text required" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(60000)) return out({ ok: false, error: "busy" });
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreate_(ss, "SUBSCRIBERS", ["TS", "EMAIL"]);
    const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map((h) => String(h).trim().toLowerCase());
    const colOf = (name) => {
      let col = header.lastIndexOf(name);
      if (col < 0) {
        col = header.length;
        header.push(name);
        sheet.getRange(1, col + 1).setValue(name.toUpperCase());
      }
      return col;
    };
    const emailCol = header.indexOf("email");
    const statusCol = colOf("status");
    const batchCol = colOf("last_batch");
    // Campaign identity = hash of the FULL delivered content (subject +
    // text + html), not the subject alone: rerunning the same send
    // resumes it, while any content change — a different message, a new
    // featured photo — gets a different key and reaches everyone.
    const batchKey = hash_(subject + "|" + text + "|" + html);
    const data = sheet.getDataRange().getValues();
    let eligible = 0;
    let sent = 0;
    let failed = 0;
    for (let i = 1; i < data.length; i++) {
      const email = String(data[i][emailCol] || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) continue;
      if (String(data[i][statusCol] || "").trim()) continue; // opted out
      if (String(data[i][batchCol] || "").trim() === batchKey) continue; // got this send
      eligible++;
      if (MailApp.getRemainingDailyQuota() <= 0) continue;
      try {
        const plain = text || "View this email in a browser-capable client — Petal Steps.";
        MailApp.sendEmail(email, subject, plain, html ? { htmlBody: html } : {});
        sheet.getRange(i + 1, batchCol + 1).setValue(batchKey);
        sent++;
      } catch (err) {
        failed++;
      }
    }
    const remaining = eligible - sent - failed;
    SpreadsheetApp.flush();
    appendLog_("newsletter", "-", "",
      subject.slice(0, 80) + " · " + sent + " sent" +
      (failed ? " · " + failed + " failed" : "") +
      (remaining ? " · " + remaining + " left (quota)" : ""));
    return out({ ok: true, total: eligible, sent, failed, remaining });
  } finally {
    lock.releaseLock();
  }
}

// ---------- read endpoints ----------

// GET /exec?token=…&kind=log&n=300 | kind=receipt&no=PS-0001 | kind=subscribers | kind=receipts
function doGet(e) {
  const out = (o) =>
    ContentService.createTextOutput(JSON.stringify(o)).setMimeType(
      ContentService.MimeType.JSON
    );
  try {
    const p = (e && e.parameter) || {};
    const token = PropertiesService.getScriptProperties().getProperty(
      "STOCK_TOKEN"
    );
    if (!token || p.token !== token)
      return out({ ok: false, error: "unauthorized" });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const kind = String(p.kind || "");
    if (kind === "log") {
      const n = Math.min(5000, parseInt(p.n || "300", 10) || 300);
      const day = String(p.day || "");
      const from = String(p.from || "");
      const to = String(p.to || "");
      // Filter by day/range BEFORE the row cap so older events don't fall
      // off the tail of the log.
      let rows = sheetRows_(ss, "LOG");
      if (day) rows = rows.filter((r) => String(r.ts).indexOf(day) === 0);
      else if (from || to)
        rows = rows.filter((r) => {
          const d = String(r.ts).slice(0, 10);
          return (!from || d >= from) && (!to || d <= to);
        });
      return out({ ok: true, rows: rows.slice(-n) });
    }
    if (kind === "receipt") {
      const no = String(p.no || "").trim();
      const k = String(p.k || "").trim();
      if (!no || !k) return out({ ok: false, error: "no and k required" });
      const row = sheetRows_(ss, "RECEIPTS").find(
        (r) => r.no === no && r.key === k
      );
      if (!row) return out({ ok: false, error: "not found" });
      delete row.key;
      return out({ ok: true, receipt: row });
    }
    if (kind === "subscribers") {
      const rows = sheetRows_(ss, "SUBSCRIBERS").map((r) => ({
        ts: r.ts,
        email: r.email,
        status: r.status || "",
      }));
      return out({ ok: true, subscribers: rows });
    }
    if (kind === "receipts") {
      // All receipts for admin analytics — key stripped so the
      // unguessable share links are never exposed by this read.
      const rows = sheetRows_(ss, "RECEIPTS").map((r) => {
        const copy = Object.assign({}, r);
        delete copy.key;
        return copy;
      });
      return out({ ok: true, receipts: rows });
    }
    if (kind === "compliance") {
      ensureComplianceSheets_(ss);
      return out({
        ok: true,
        register: sheetRows_(ss, "RECEIPT_REGISTER"),
        exceptions: sheetRows_(ss, "RECEIPT_EXCEPTIONS"),
        periods: sheetRows_(ss, "FILING_PERIODS"),
        evidence: sheetRows_(ss, "FILING_EVIDENCE"),
        reconciliations: sheetRows_(ss, "DAILY_RECONCILIATIONS"),
      });
    }
    if (kind === "leads") {
      // Order taps (interest) never followed by a sale of the same
      // model+size — unfilled demand worth a follow-up or a restock.
      const rows = sheetRows_(ss, "LOG");
      // Pair each undo with the write it reversed (same model+size,
      // mirror a→b note) and drop both — an undone sale must not keep
      // hiding the taps it once filled. Same pairing as the admin UI.
      const dead = new Array(rows.length).fill(false);
      for (let i = rows.length - 1; i >= 0; i--) {
        const u = rows[i];
        if (dead[i]) continue;
        if (u.action === "unvoid") {
          const match = /^unvoid (sold|remove|restock) (?:(\d{4}-\d{2}-\d{2}T\S+) )?(.*)$/.exec(String(u.note || ""));
          if (!match) continue;
          const voidNote = "void " + match[1] + " " + match[3];
          for (let j = i - 1; j >= 0; j--) {
            const v = rows[j];
            if (dead[j] || v.action !== "void" || v.model !== u.model ||
                String(v.size) !== String(u.size) ||
                (String(v.note) !== voidNote && String(v.note) !== `void ${match[1]} ${match[2]} ${match[3]}`)) continue;
            for (let k = j - 1; k >= 0; k--) {
              const o = rows[k];
              if (dead[k] || o.action !== match[1]) continue;
              if (o.model === u.model && String(o.size) === String(u.size) &&
                  String(o.note) === match[3] && (!match[2] || String(o.ts) === match[2])) {
                dead[j] = true;
                dead[i] = true;
                break;
              }
            }
            break;
          }
          continue;
        }
        if (u.action === "void") {
          const match = /^void (sold|remove|restock) (?:(\d{4}-\d{2}-\d{2}T\S+) )?(.*)$/.exec(String(u.note || ""));
          if (!match) continue;
          for (let j = i - 1; j >= 0; j--) {
            const o = rows[j];
            if (dead[j] || o.action !== match[1]) continue;
            if (o.model === u.model && String(o.size) === String(u.size) &&
                String(o.note) === match[3] && (!match[2] || String(o.ts) === match[2])) {
              dead[j] = true;
              dead[i] = true;
              break;
            }
          }
          continue;
        }
        if (u.action !== "undo") continue;
        const m = String(u.note || "").split("→").map((x) => parseInt(x, 10));
        if (m.length !== 2 || m.some((x) => isNaN(x))) continue;
        const kind = String(u.note || "").includes("· remove")
          ? "remove"
          : m[1] > m[0]
            ? "sold"
            : "restock";
        const mirror = m[1] + "→" + m[0];
        for (let j = i - 1; j >= 0; j--) {
          const o = rows[j];
          if (dead[j] || o.action !== kind) continue;
          if (o.model === u.model && String(o.size) === String(u.size) && String(o.note) === mirror) {
            dead[j] = true;
            dead[i] = true;
            break;
          }
        }
      }
      const lastSold = {};
      rows.forEach((r, i) => {
        const key = r.model + "|" + r.size;
        if (!dead[i] && r.action === "sold" && (!lastSold[key] || String(r.ts) > String(lastSold[key])))
          lastSold[key] = r.ts;
      });
      const leads = {};
      rows.forEach((r, i) => {
        if (dead[i] || r.action !== "interest") return;
        const key = r.model + "|" + r.size;
        // A sale AFTER the tap counts it as filled — a tap newer than
        // the last sale is still open demand.
        if (lastSold[key] && String(r.ts) <= String(lastSold[key])) return;
        // Contact rides in the note as `· for NAME · tel PHONE` when the
        // client consented at checkout — the newest tap wins. Rows arrive in
        // write order, so >= keeps the later row when two taps share a second.
        if (!leads[key]) leads[key] = { model: r.model, size: r.size, taps: 0, lastTs: "", who: "", phone: "" };
        leads[key].taps++;
        if (String(r.ts) >= String(leads[key].lastTs)) {
          leads[key].lastTs = r.ts;
          const who = / · for ([^·]+?) · tel ([^·]+?)\s*(?:·|$)/.exec(String(r.note || ""));
          leads[key].who = who ? who[1].trim() : "";
          leads[key].phone = who ? who[2].trim() : "";
        }
      });
      return out({ ok: true, leads: Object.values(leads) });
    }
    return out({ ok: false, error: "unknown kind" });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

// ---------- scheduled jobs (install as time-driven triggers) ----------

// Emails today's sales + interest summary. Daily trigger, e.g. 21:00.
function dailyDigest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  const rows = sheetRows_(ss, "LOG").filter((r) =>
    String(r.ts).indexOf(today) === 0
  );
  const sales = rows.filter((r) => r.action === "sold");
  const interest = rows.filter((r) => r.action === "interest");
  const restock = rows.filter((r) => r.action === "restock");
  const receipts = sheetRows_(ss, "RECEIPTS").filter((r) =>
    String(r.date).indexOf(today) === 0
  );
  const perModel = {};
  sales.forEach((r) => {
    perModel[r.model] = (perModel[r.model] || 0) + 1;
  });
  const lines = Object.keys(perModel)
    .sort()
    .map((m) => "  " + m + "  ×  " + perModel[m]);
  const revenue = receipts.reduce(
    (sum, r) => sum + (parseInt(String(r.amount), 10) || 0),
    0
  );
  const text =
    "Petal Steps — " +
    today +
    "\n\nPairs marked sold: " +
    sales.length +
    (lines.length ? "\n" + lines.join("\n") : "\n  (none)") +
    "\n\nReceipts issued: " +
    receipts.length +
    " (K" +
    revenue.toLocaleString() +
    ")" +
    "\nInterest taps on WhatsApp order: " +
    interest.length +
    "\nRestocks: " +
    restock.length +
    "\n\n— Petal Steps shop";
  MailApp.sendEmail(
    reportEmail_(),
    "Petal Steps — daily sales " + today,
    text
  );
}

// Weekly rollup, triggered Sunday evening: last-7-days sales, estimated
// revenue (from the `· K<price>` stamp on sale notes), taps and receipts.
function weeklyDigest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = Session.getScriptTimeZone();
  const start = new Date(Date.now() - 6 * 864e5);
  const fromDay = Utilities.formatDate(start, tz, "yyyy-MM-dd");
  const toDay = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  sendRollup_(ss, fromDay, toDay, "weekly sales " + fromDay + " → " + toDay);
}

// Monthly rollup, triggered on the 1st: the full previous calendar month.
function monthlyDigest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = Session.getScriptTimeZone();
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ym = Utilities.formatDate(prev, tz, "yyyy-MM");
  sendRollup_(ss, ym + "-01", ym + "-31", "monthly sales " + ym);
}

function sendRollup_(ss, fromDay, toDay, subject) {
  const log = sheetRows_(ss, "LOG");
  // Pair each undo with the write it reversed (same model+size, mirror
  // a→b note — compare only the segment before the `· K<price>` stamp)
  // and drop both, exactly like the admin UI's netLogRows. Pairing runs
  // over the WHOLE log so an undo inside the window can cancel a sale
  // from before it.
  const dead = new Array(log.length).fill(false);
  for (let i = log.length - 1; i >= 0; i--) {
    const u = log[i];
    if (dead[i]) continue;
    if (u.action === "unvoid") {
      const match = /^unvoid (sold|remove|restock) (?:(\d{4}-\d{2}-\d{2}T\S+) )?(.*)$/.exec(String(u.note || ""));
      if (!match) continue;
      const voidNote = "void " + match[1] + " " + match[3];
      for (let j = i - 1; j >= 0; j--) {
        const v = log[j];
        if (dead[j] || v.action !== "void" || v.model !== u.model ||
            String(v.size) !== String(u.size) ||
            (String(v.note) !== voidNote && String(v.note) !== `void ${match[1]} ${match[2]} ${match[3]}`)) continue;
        for (let k = j - 1; k >= 0; k--) {
          const o = log[k];
          if (dead[k] || o.action !== match[1]) continue;
          if (o.model === u.model && String(o.size) === String(u.size) &&
              String(o.note) === match[3] && (!match[2] || String(o.ts) === match[2])) {
            dead[j] = true;
            dead[i] = true;
            break;
          }
        }
        break;
      }
      continue;
    }
    if (u.action === "void") {
      const match = /^void (sold|remove|restock) (?:(\d{4}-\d{2}-\d{2}T\S+) )?(.*)$/.exec(String(u.note || ""));
      if (!match) continue;
      for (let j = i - 1; j >= 0; j--) {
        const o = log[j];
        if (dead[j] || o.action !== match[1]) continue;
        if (o.model === u.model && String(o.size) === String(u.size) &&
            String(o.note) === match[3] && (!match[2] || String(o.ts) === match[2])) {
          dead[j] = true;
          dead[i] = true;
          break;
        }
      }
      continue;
    }
    if (u.action !== "undo") continue;
    const m = String(u.note || "").split("→").map((x) => parseInt(x, 10));
    if (m.length !== 2 || m.some((x) => isNaN(x))) continue;
    const kind = String(u.note || "").includes("· remove")
      ? "remove"
      : m[1] > m[0]
        ? "sold"
        : "restock";
    const mirror = m[1] + "→" + m[0];
    for (let j = i - 1; j >= 0; j--) {
      const o = log[j];
      if (dead[j] || o.action !== kind) continue;
      if (
        o.model === u.model &&
        String(o.size) === String(u.size) &&
        String(o.note || "").split(" · ")[0] === mirror
      ) {
        dead[j] = true;
        dead[i] = true;
        break;
      }
    }
  }
  const inRange = (r) => {
    const d = String(r.ts).slice(0, 10);
    return d >= fromDay && d <= toDay;
  };
  const rawRange = log.filter(inRange);
  const rows = log.filter((r, i) => !dead[i] && inRange(r));
  const sales = rows.filter((r) => r.action === "sold");
  const interest = rows.filter((r) => r.action === "interest");
  const undos = rawRange.filter((r) => r.action === "undo");
  const receipts = sheetRows_(ss, "RECEIPTS").filter((r) => {
    const d = String(r.date).slice(0, 10);
    return d >= fromDay && d <= toDay;
  });
  const prices = priceByModel_(ss);
  const perModel = {};
  const revPerModel = {};
  let revenue = 0;
  sales.forEach((r) => {
    perModel[r.model] = (perModel[r.model] || 0) + 1;
    const m = /·\s*K(\d+(?:\.\d+)?)/.exec(String(r.note || ""));
    // Unstamped rows (logged before the price stamp existed) fall back to
    // the model's current list price, same as the admin dashboards.
    const rev = m ? parseFloat(m[1]) : prices[r.model] || 0;
    revenue += rev;
    revPerModel[r.model] = (revPerModel[r.model] || 0) + rev;
  });
  const lines = Object.keys(perModel)
    .sort((a, b) => perModel[b] - perModel[a])
    .map(
      (m) =>
        "  " + m + "  ×  " + perModel[m] +
        (revPerModel[m] ? "  ·  K" + revPerModel[m].toLocaleString() : "")
    );
  const receiptsTotal = receipts.reduce(
    (s, r) => s + (parseInt(String(r.amount), 10) || 0),
    0
  );
  const text =
    "Petal Steps — " + fromDay + " to " + toDay +
    "\n\nPairs marked sold: " + sales.length +
    " (undos logged: " + undos.length + ")" +
    (lines.length ? "\n" + lines.join("\n") : "\n  (none)") +
    "\n\nEst. revenue from sale stamps: K" + revenue.toLocaleString() +
    "\nReceipts issued: " + receipts.length + " (K" + receiptsTotal.toLocaleString() + ")" +
    "\nInterest taps on WhatsApp order: " + interest.length +
    "\n\n— Petal Steps shop";
  MailApp.sendEmail(reportEmail_(), "Petal Steps — " + subject, text);
}

// model → current PRICE, read off the products sheet (first sheet) with
// the same header resolution the write path uses. Backs the rollup
// fallback for sale rows that predate the `· K<price>` note stamp.
function priceByModel_(ss) {
  const map = {};
  try {
    const data = ss.getSheets()[0].getDataRange().getValues();
    const headers = data[0].map((h) =>
      String(h).trim().toLowerCase().replace(/\s+/g, "_")
    );
    const modelCol =
      headers.indexOf("model") >= 0
        ? headers.indexOf("model")
        : headers.indexOf("sku");
    const priceCol = headers.indexOf("price");
    if (modelCol < 0 || priceCol < 0) return map;
    for (let i = 1; i < data.length; i++) {
      const m = String(data[i][modelCol]).trim();
      if (!m || map[m]) continue;
      const p = parseFloat(
        String(data[i][priceCol] || "").replace(/[^0-9.]/g, "")
      );
      if (p > 0) map[m] = p;
    }
  } catch (e) {
    /* revenue fallback just reports K0 if the sheet can't be read */
  }
  return map;
}

// Emails every tab as CSV attachments. Daily or weekly trigger.
function backupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const date = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );
  const attachments = ss.getSheets().map((sh) => {
    const csv = sh
      .getDataRange()
      .getValues()
      .map((row) => row.map(csvCell_).join(","))
      .join("\n");
    return Utilities.newBlob(
      csv,
      "text/csv",
      ss.getName() + "-" + sh.getName() + "-" + date + ".csv"
    );
  });
  MailApp.sendEmail(
    reportEmail_(),
    "Petal Steps — sheet backup " + date,
    "CSV export of every tab is attached. To restore, re-import the CSV(s) into the sheet.",
    { attachments: attachments }
  );
}

function reportEmail_() {
  return (
    PropertiesService.getScriptProperties().getProperty("REPORT_EMAIL") ||
    Session.getActiveUser().getEmail()
  );
}

// Run ONCE from the editor (Run ▶): creates the scheduled jobs. Safe to
// rerun — existing triggers for these functions are replaced, so nothing
// double-fires. First run asks for the Gmail/Calendar-style authorizations
// MailApp needs; approve once.
function installTriggers() {
  const handlers = ["dailyDigest", "weeklyDigest", "monthlyDigest", "backupSheet"];
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (handlers.indexOf(t.getHandlerFunction()) >= 0)
      ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("dailyDigest")
    .timeBased()
    .everyDays(1)
    .atHour(21)
    .create();
  ScriptApp.newTrigger("weeklyDigest")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(20)
    .create();
  ScriptApp.newTrigger("monthlyDigest")
    .timeBased()
    .onMonthDay(1)
    .atHour(8)
    .create();
  ScriptApp.newTrigger("backupSheet")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(6)
    .create();
}

function csvCell_(v) {
  const s =
    v instanceof Date
      ? Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
      : String(v);
  // Formula-leading values must survive re-import as literals, not become
  // executable formulas in whatever sheet the backup is restored into.
  const escaped = /^[=+\-@]/.test(s) ? "'" + s : s;
  return /[",\n]/.test(escaped) ? '"' + escaped.replace(/"/g, '""') + '"' : escaped;
}
