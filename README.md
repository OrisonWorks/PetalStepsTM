# Petal Steps by Thandiwe Mwaba — Website

Women's heels storefront for Lusaka, Zambia. Next.js 15 + Tailwind + shadcn-style UI + Remotion promo. Orders go to WhatsApp **+260 760 732 751**. Prices in ZMW (K450–K650).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

## Inventory: Google Sheet is the datasource

The shop reads its catalogue from a published Google Sheet. If the sheet is unreachable, it automatically falls back to the built-in catalogue in `src/lib/products.ts`, so the shop never goes blank.

### One-time setup

1. Import `petal-steps-products.csv` (in this repo) into Google Sheets: **File → Import → Upload**. This is your starting catalogue — 29 styles with prices and per-size stock.
2. In Google Sheets: **File → Share → Publish to web** → choose the sheet → **Comma-separated values (.csv)** → Publish. Copy the URL.
3. Add the URL as an environment variable named `PRODUCTS_SHEET_CSV_URL`:
   - Locally: copy `.env.example` to `.env.local` and paste the URL.
   - On Vercel: Project → Settings → Environment Variables.
4. Redeploy (or restart `npm run dev`). Check `/api/products` — it should show `"source": "sheet"`.

### Day-to-day admin (no code)

Edit the Google Sheet — changes appear on the website within ~5 minutes:

- **Change a price** — edit the `price` cell (ZMW, e.g. `550`).
- **Update stock** — edit `stock_35` … `stock_45` (pairs per EU size). Set to `0` when a size sells out; it disappears from the site.
- **Hide a style** — set `active` to `FALSE`. Set back to `TRUE` to show it again.
- **Add a style** — add a row: unique `sku`, `name`, `color`, `category` (`matte` / `glossy` / `statement` / `red-bottom`), `price`, `photo`, `description`, `active=TRUE`, and stock per size.
- **Photos** — `photo` is a filename in `public/products/` (e.g. `image12.jpg`) or a full `https://` image URL. To use a brand-new photo file, it must be added to `public/products/` in the repo (ask your developer), or paste a hosted image URL instead.
- Only people you share the sheet with (edit access) can change the shop. Everyone else can only view the website.

Keep the header row exactly as-is — the website matches columns by name.

### Alternative: your stock-take sheet also works

If you publish a stock-take sheet instead — one row per size with columns like `COLOR,SIZE,COUNT,MODEL` — the site reads live stock from it and fills in name, price, photo and description from the built-in catalogue by matching `MODEL` to `sku`. Handy when your existing stock sheet is the thing you update every day:

- **Update stock** — edit `COUNT` for the size row; set to `0` when a size sells out.
- **New style** — a `MODEL` that isn't in the site catalogue is skipped until it gets a name and price. Add `NAME` and `PRICE` columns to the sheet to sell it immediately, or ask your developer to add it to the catalogue (photos live in the repo).
- **Overrides** — optional `NAME`, `PRICE`, `CATEGORY`, `PHOTO`, `DESCRIPTION` and `ACTIVE` columns override the catalogue for that `MODEL` (first non-empty value wins). `ACTIVE=FALSE` hides the style.
- **Not on the sheet** — catalogue styles with no rows on the sheet are hidden (the sheet is the stock truth).

## Stock admin (`/admin`) — mark sold from the site

A passcode-protected page at `/admin` lists every style with per-size counts and `−`/`+` buttons: `−` marks one pair sold, `+` restocks. Writes go through a small Google Apps Script you deploy once on your spreadsheet — the published CSV is read-only, so the script is the write path. Changes reach the storefront within seconds.

### One-time setup (in your Google account)

1. Open your inventory spreadsheet → **Extensions → Apps Script**. Replace the editor contents with `scripts/stock_writer.gs` from this repo and save.
2. **Project Settings (⚙) → Script Properties → Add script property**: name `STOCK_TOKEN`, value = any long random string (keep it — you'll use it twice).
3. **Deploy → New deployment** → type **Web app** → **Execute as: Me** → **Who has access: Anyone** → **Deploy**. Authorize when prompted. Copy the **Web app URL** (ends in `/exec`).
4. Set environment variables (locally in `.env.local` and in Vercel):
   - `ADMIN_PASSCODE` — the password you sign in with at `/admin`
   - `STOCK_WRITER_URL` — the `/exec` URL from step 3
   - `STOCK_WRITER_TOKEN` — the same `STOCK_TOKEN` value from step 2
5. Redeploy/restart, then open `/admin`.

The script supports both sheet layouts: your stock-take format (`MODEL`/`SIZE`/`COUNT` rows — it updates the matching row's `COUNT`, or appends a row when restocking a size that never had one) and the catalogue format (`stock_35`…`stock_45` columns).

### Editing product details from `/admin`

Each style also has an **Edit** button that opens a form for name, colour, price, category, photo and description. Saves write override columns (`NAME`, `PRICE`, `CATEGORY`, `PHOTO`, `DESCRIPTION`, `COLOUR`) onto the model's first sheet row — the sheet wins over the built-in catalogue, and clearing a value back to empty restores the catalogue default.

> Apps Script web apps serve the deployed version, not the latest saved code. After updating `stock_writer.gs` you must redeploy: **Deploy → Manage deployments → ✎ → Version: New version → Deploy**. The `/exec` URL stays the same.

To change the passcode or token later: update the env vars and redeploy (the script keeps running — `STOCK_TOKEN` must match `STOCK_WRITER_TOKEN`).

### Reports, receipts and backups

`/admin` has four tabs:

- **Stock** — the size grid described above.
- **Add style** — create a brand-new style (style code, name, colour, price, category, photo + starting stock per EU size); it writes new rows to the sheet and goes live within ~a minute. Below the form is a **bulk CSV import**: download the template, fill one row per style in Google Sheets or Excel (File → Download → CSV), upload, review the validation preview, and import — bad rows are flagged and skipped, each row reports its own result.
- **Reports** — a per-day breakdown of pairs marked sold per model, WhatsApp-order "interest" taps (logged when a client taps *Send order on WhatsApp* in their bag), and restocks. Data comes from a `LOG` tab the script auto-creates in the same spreadsheet.
- **Receipts** — generate a numbered receipt (`PS-0001`, `PS-0002`, …) matching the shop's printed receipt pad: client name, items (quick-add from live stock), amount with amount-in-words auto-fill, method and balance. Receipts are stored in a `RECEIPTS` tab and each gets a public shareable link (`/receipt/PS-0001`) you can send the client via WhatsApp or email — the form's *Send via WhatsApp* button opens the chat with the link, and entering a client email sends them a copy automatically. Interim receipts until ZRA smart invoicing is integrated.

### Daily email digest + sheet backup (one-time trigger setup)

Two scheduled functions live in `stock_writer.gs`. Install them once:

1. Apps Script → **Triggers (⏰ clock icon, left rail)** → **+ Add Trigger**:
   - `dailyDigest` → event source **Time-driven** → **Day timer** → pick an evening slot (e.g. 21:00–22:00). Emails the day's sold/restock/interest counts and receipt revenue.
   - `backupSheet` → **Time-driven** → **Week timer** (or Day timer for daily backups) → pick a time. Emails every tab as CSV attachments.
2. Both email the address in Script Property `REPORT_EMAIL` if set, otherwise the script owner's Gmail. Add `REPORT_EMAIL` under Script Properties to override.
3. First run asks for Gmail/send-mail authorization — approve once.

> Apps Script web apps serve the deployed version, not the latest saved code. After updating `stock_writer.gs` you must redeploy: **Deploy → Manage deployments → ✎ → Version: New version → Deploy**. The `/exec` URL stays the same.

## Deploy (Vercel)

1. Push this repo to GitHub (already at `OrisonWorks/PetalStepsTM`).
2. At [vercel.com](https://vercel.com) → Add New Project → import the repo. Framework preset: **Next.js** (auto-detected). No build settings to change.
3. Add `PRODUCTS_SHEET_CSV_URL` in Environment Variables (see above).
4. Deploy. Every future `git push` to `main` auto-redeploys; sheet edits need no redeploy.

## FAQs + mailing list

- The homepage **FAQs** section answers ordering, payment and delivery questions in text, and the three policy card images open full-size on tap.
- The **Petal List** subscribe form writes each email to a `SUBSCRIBERS` tab on the sheet via the writer's `subscribe` action (deduped). The **mailing list** tab in `/admin` lists them (via `kind=subscribers`) with a one-click "copy all emails". Requires the latest `stock_writer.gs` deployed (New version) — until then signups and the admin tab return an error.

## Notes

- Checkout builds a WhatsApp message to the official number — no online payments, stock is confirmed manually on WhatsApp as per shop policy.
- Remotion promo: `npm run remotion:studio`, render with `npm run remotion:render`.