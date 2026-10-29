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
 * POST JSON body: { token, model, size, set? , delta? }
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
 * GET /exec?token=…&kind=log&n=300 — last n LOG rows as JSON.
 * GET /exec?token=…&kind=receipt&no=PS-0001 — one receipt row as JSON.
 * GET /exec?token=…&kind=receipts — all receipt rows (keys stripped).
 * GET /exec?token=…&kind=subscribers — SUBSCRIBERS rows (TS, EMAIL) as JSON.
 *
 * Time-driven triggers (install once via the clock icon):
 *   dailyDigest()  — emails the day's sales/interest summary
 *   backupSheet()  — emails every tab as CSV attachments
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

    if (body.action === "updateProduct")
      return updateProduct(body, out);
    if (body.action === "createProduct")
      return createProduct(body, out);
    if (body.action === "logEvent") return logEvent(body, out);
    if (body.action === "subscribe") return subscribeEmail(body, out);
    if (body.action === "createReceipt") return createReceipt(body, out);
    if (body.action === "sendReceiptEmail")
      return sendReceiptEmail(body, out);

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
          appendLog_("restock", model, size, "0→" + applySet);
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
      appendLog_(next < current ? "sold" : "restock", model, size,
        current + "→" + next);
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

// ---------- event log ----------

// POST { action: "logEvent", event, model, size?, note? }
// "interest" events come from public site taps; sold/restock are written
// automatically by the stock path — those events are accepted here too only
// so the API surface stays simple; the app never sends them directly.
function logEvent(body, out) {
  const event = String(body.event || "").trim();
  const model = String(body.model || "").trim();
  if (!["interest", "sold", "restock"].includes(event))
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
    const exists = sheetRows_(ss, "SUBSCRIBERS").some(
      (r) => String(r.email || "").trim().toLowerCase() === email
    );
    if (!exists) {
      sheet.appendRow([new Date(), safe_(email)]);
      SpreadsheetApp.flush();
    }
    return out({ ok: true, email, already: exists });
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
      const n = Math.min(1000, parseInt(p.n || "300", 10) || 300);
      const day = String(p.day || "");
      // Filter by day BEFORE the row cap so older days don't fall off the
      // tail of the log.
      let rows = sheetRows_(ss, "LOG");
      if (day) rows = rows.filter((r) => String(r.ts).indexOf(day) === 0);
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
