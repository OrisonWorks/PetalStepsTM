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
      const value = String(fields[key]).trim();
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
