# PetalStepsTM — Project Memory

Living record of what has been built and how the pieces fit together. **Update this file in every PR that ships or changes behavior** — newest entries at the top of the changelog.

## Architecture at a glance

- **Storefront** — Next.js 15 + Tailwind v4 + shadcn UI on Vercel (`petal-steps-tm.vercel.app`). WhatsApp-only ordering to +260 760 732 751; prices in ZMW (unsigned integers); EU sizes 35–45; categories `matte | glossy | statement | red-bottom`.
- **Inventory database** — a Google Sheet. Reads via the published CSV (`PRODUCTS_SHEET_CSV_URL`); writes via the bound Apps Script web app (`scripts/stock_writer.gs` → `STOCK_WRITER_URL` + `STOCK_WRITER_TOKEN`). Writes land in the sheet instantly; the storefront's published CSV lags ~1 minute.
- **Sheet tabs** — `PRODUCTS` (MODEL/SIZE/COUNT + override cols NAME/PRICE/COLOUR/CATEGORY/PHOTO/DESC), `LOG` (interest taps + sold/restock events), `RECEIPTS` (key-guarded rows), `SUBSCRIBERS` (TS/EMAIL, case-insensitive dedupe).
- **Admin** — `/admin` behind `ADMIN_PASSCODE` → session cookie. Tabs: stock, reports, receipts, add style, mailing list.
- **Ordering truth** — "interest" = a client tapping *Send order on WhatsApp* (may never send); "sold" = the admin `−` tap (the trustworthy signal). Reports keep them separate.
- **Apps Script deploy** — every `.gs` change needs Deploy → Manage deployments → ✎ → **New version**; the `/exec` URL is stable across versions. POST responses 302 to an echo URL that must be fetched with GET.

## Changelog

### 2026-10-29 — Review fixes for PR #24 (PR #25)

- `netLogRows()` pairs each `undo` with the original write it reversed (same model+size, mirror-image `a→b` note) and drops BOTH — the sale is removed from the day it actually happened rather than netted off the undo's day. Unpaired undos keep the -1 fallback.
- Undo writes no longer offer an "Undo" toast action (undo-of-undo can't be expressed in the log).
- `logOk` now requires `logSupported === true` — a failed analytics fetch shows `—` KPIs, not zeros.

### 2026-10-29 — Review fixes for PR #23 (PR #24)

- `countAction()` nets `undo` rows off the action they reversed (direction parsed from the `a→b` stock note: next>prev reversed a sale). Reports, dashboard KPIs, trend/top-model/size-demand charts all count net — an undone sale no longer counts as sold.
- KPI cards show `—` and the dead-stock card says "couldn't check" when the log read fails, instead of claiming zero sales.
- CSV export escape now also catches whitespace before `=+-@` (`" =cmd"` no longer executes as a formula).

### 2026-10-29 — Review fixes for PR #21 (PR #23)

- `kind=log` cap raised 1000→5000 (older sales kept); undo writes log as `undo` (excluded from sold/restock counts) instead of a fake sale/restock — the `undo:true` flag flows client → `/api/admin/sold` → writer.
- `/api/admin/analytics` returns `logSupported`/`subsSupported`/`receiptsSupported` flags; panels warn on failed reads instead of showing fake zeroes, and dead-stock hides when the log read failed.
- Repeat customers count across ALL receipts; only those with a purchase inside the range are listed (total shown = in-range spend).
- `downloadCsv` prefixes leading `=+-@` with `'` — exported names/fields can't execute as spreadsheet formulas.

### 2026-10-29 — Admin dashboard + analytics (PR #21)

- **Dashboard** (new default admin view): KPI cards — pairs in stock, sold today, order taps today, revenue today; low-stock alerts (≤5 pairs) and dead-stock list (never sold in the log); quick links.
- **Analytics tab**: 7/14/30-day ranges — daily sold-vs-taps trend, top models sold vs interest, EU-size demand heatmap, payment mix (K), referral-source split (from checkout "how did you hear" + receipt field), area split from receipts, subscriber growth, repeat customers by phone; CSV export on the main tables.
- New `GET /api/admin/analytics` — one call returning LOG + RECEIPTS + SUBSCRIBERS for client-side aggregation.
- **Undo sold/restock** — every ± toast gets an Undo action that posts the inverse write.
- **Receipt form**: client name autocomplete from past receipts (datalist), "repeat customer" badge on a phone that appears before, new **Area/city** and **How did they hear** fields → stored on the receipt row (AREA/HEARD headers auto-created).
- `stock_writer.gs`: `kind=receipts` doGet (all rows, keys stripped) + `area`/`heard` receipt fields. **Needs one more New-version redeploy** — panels warn when it's missing and log/subscriber analytics still work without it.

### 2026-10-29 — Storefront UX Phase 1 (PR #20)

- "My size" EU 35–45 filter chips in the shop — filters styles to those with stock in that size (AND-combines with category filter).
- Size strip on every product card: all 11 EU sizes, in-stock highlighted.
- Sticky mobile order bar (bag count + total → opens checkout) and a back-to-top button.
- Optional "How did you hear about us?" select in checkout → appended to the WhatsApp order message and the LOG interest note (referral-source analytics data).
- Reviews section moved above the catalogue for early social proof; shimmer placeholder behind product images.
- Quick-view modal already existed (photo, size pick, add-to-bag) — unchanged.

### 2026-10-29 — Brand logo on the site (PR #19)

- `public/brand/logo-mark.png` — transparent-background wordmark cut out of `logo.jpg` (the watercolor mark from the FAQ cards/receipts); `logo.jpg` square kept for badges/favicon.
- Header brand lockup (Flower2 + text) replaced by the logo mark; same mark used in the hero, admin login, and receipt header.
- Footer and admin header get the square logo as a rounded badge (black script wouldn't read on dark backgrounds).

### 2026-10-29 — FAQs, mailing list, error states (PRs #15–#17)

- FAQs section (`#faqs`, linked from footer) with transcribed policy answers: ordering, payment numbers, Yango bookings, couriers, 5-day hold.
- Policy-card images (order & payment, Lusaka delivery, out-of-town) open full-size on tap via a dialog.
- Newsletter form now really subscribes: writes to `SUBSCRIBERS` tab via the writer's `subscribe` action, deduped, honeypot + 60/hr global rate cap.
- Admin **mailing list** tab: subscriber count, newest-first list, copy-all-emails to clipboard.
- Failed subscriber loads show an error + Retry instead of a fake "0 subscribers" empty state.

### 2026-10-28 — Add style + bulk CSV import (PRs #10–#14)

- Admin **add style** tab: create a brand-new model (code, name, colour, price, category, photo, per-size starting stock) appended to `PRODUCTS` via `createProduct`; appears on the shop within ~1 min.
- **Bulk CSV import**: template download, browser-side validation preview (bad rows flagged/skipped), one confirm writes all valid rows in batches.
- Receipt writes hardened: every field under its own column header in one atomic row; safe on reordered/duplicate-header tabs.
- EU 35–45 sizes enforced; prices must be whole numbers (exploit for `450.50`→K45050 closed).

### 2026-10-28 — Reports, receipts, event log, email backups (PRs #8–#9, #11–#13)

- `LOG` tab: every WhatsApp-order tap logged (model, size, timestamp) plus admin sold/restock actions. Client phone numbers are intentionally NOT logged.
- Admin **reports** tab: per-day pairs sold per model, interest taps, restocks; `?day=YYYY-MM-DD` filtering.
- Admin **receipts** tab: numbered receipts (PS-0001…) matching the printed pad — auto number, quick-add items from live stock, amount-in-words, cash/cheque/momo/bank, balance. Each gets an unguessable public link `/receipt/PS-xxxx?key=…` for WhatsApp/email sharing. Interim until ZRA smart invoicing.
- Apps Script `dailyDigest` + `backupSheet` functions for time-driven triggers: evening sales summary email and daily/weekly CSV backup of every tab (Gmail auth prompt on first trigger run).
- Security hardening from Devin Review rounds: write locks, global login rate limit, formula-injection escaping, key-guarded receipts, honest logEvent failures (no double-sales).

### 2026-10-27 — Sheet inventory + admin foundation (PRs #1–#7)

- Storefront reads live stock from the published stock-take CSV (`MODEL/SIZE/COUNT` rows), falling back to `src/lib/products.ts` when the sheet is unreachable.
- `/admin` passcode login (cookie session, rate-limited) with per-size stock `−`/`+` (markSold/restock) against the sheet.
- Product photo + colour shown on admin stock cards.
- **Edit** product details from admin — writes override columns (NAME/PRICE/COLOUR/CATEGORY/PHOTO/DESC) on the sheet row; clearing a field reverts to the stock-take value.

## Pending / known limitations

- **MTN Zambia reachability** — `*.vercel.app` is unreachable on MTN (works on Airtel); fix is a custom domain. Deferred by user.
- **Manual ops steps after writer changes** — paste latest `stock_writer.gs` → New version deploy; optional `dailyDigest`/`backupSheet` triggers; Vercel `STOCK_WRITER_URL` must track the live `/exec` URL.
- **Deferred**: ZRA smart-invoice integration, non-WhatsApp checkout, 4 hidden SKUs (3500-1, 9116-5, 9511-6, ZJ000628) — fixable via admin Edit.
