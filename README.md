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

## Deploy (Vercel)

1. Push this repo to GitHub (already at `OrisonWorks/PetalStepsTM`).
2. At [vercel.com](https://vercel.com) → Add New Project → import the repo. Framework preset: **Next.js** (auto-detected). No build settings to change.
3. Add `PRODUCTS_SHEET_CSV_URL` in Environment Variables (see above).
4. Deploy. Every future `git push` to `main` auto-redeploys; sheet edits need no redeploy.

## Notes

- Checkout builds a WhatsApp message to the official number — no online payments, stock is confirmed manually on WhatsApp as per shop policy.
- Remotion promo: `npm run remotion:studio`, render with `npm run remotion:render`.