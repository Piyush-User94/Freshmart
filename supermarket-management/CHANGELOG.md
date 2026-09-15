# Changelog

All notable changes to the Supermarket Management Admin dashboard.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project uses [Semantic Versioning](https://semver.org/).

The running version is defined in `js/version.js` and mirrored in
`VERSION` and `version.json`. It is shown in **Settings → About**.

## [1.1.0] — 2026-09-04

### Security

Response-header findings from an external scan of the served site. A static
frontend cannot set its own response headers, so these are fixed at the two
places that can: the delivered HTML (where possible) and the host config.

- **Content-Security-Policy** added to all 12 pages via `<meta http-equiv>`,
  and to every host config as a real header. `script-src 'self'` with no
  `unsafe-inline` / `unsafe-eval`; `connect-src 'none'` (the app never makes
  network requests); `object-src`, `base-uri` and `form-action` locked down.
- **Clickjacking protection** — `X-Frame-Options: DENY` plus
  `Content-Security-Policy: frame-ancestors 'none'` in all host configs.
  (Header-only; not expressible from static HTML.)
- **`X-Content-Type-Options: nosniff`** added to all host configs.
- **Referrer-Policy: strict-origin-when-cross-origin** added as a
  `<meta name="referrer">` on every page and as a header in host configs.
- **Permissions-Policy** added to host configs, denying camera, microphone,
  geolocation, USB, serial, payment and other powerful features.
- **HTTPS enforcement** — HTTP→HTTPS redirects and HSTS
  (`max-age=31536000; includeSubDomains; preload`) in all host configs.
- **Server version disclosure** suppressed in all host configs
  (`ServerTokens Prod`, `server_tokens off`, `Server` header removed).
- **CSV formula injection** hardened in `App.exportCsv` — values starting with
  `=`, `+`, `-`, `@`, tab or CR are prefixed with `'` so spreadsheets treat
  them as text instead of executable formulas.
- **Implicit form submission** now suppressed in `App.buildForm`, so pressing
  Enter in a modal field can no longer trigger a page navigation.

### Added

- Host security-header configs: `.htaccess` (Apache), `_headers`
  (Netlify / Cloudflare Pages), `vercel.json` (Vercel),
  `deploy/nginx.conf` (nginx), `deploy/web.config` (IIS).
- `SECURITY.md` — scan findings with status, the deployed header set, the
  threat model, and the limits of a frontend-only app.
- `tools/devserver.py` — optional hardened local preview server that sends the
  production header set and hides its version, so a local scan reflects
  production. The site itself still needs no server.
- Version metadata: `js/version.js`, `VERSION`, `version.json`,
  this changelog, and an **About** card in Settings.

## [1.0.0] — 2026-09-04

### Added

- Twelve working modules: Dashboard, POS / Billing, Products, Categories,
  Inventory, Suppliers, Customers, Orders & Sales, Employees, Expenses,
  Reports and Settings.
- Shared layout injected from `js/app.js`: collapsible sidebar (12 nav items,
  admin profile, logout), topbar with global search, low-stock notifications,
  theme toggle and current date.
- Dashboard with 8 KPI cards, 7-day sales trend, 6-month revenue chart, top
  products, low-stock alerts, recent orders and an activity feed.
- Full CRUD with search, sort, filter and pagination on every major table.
- POS: category tabs, product tiles with live stock, cart with quantity
  steppers, customer selection, discounts, tax, four payment methods, and a
  checkout that writes the order, reduces stock, logs the movement, updates
  customer totals and loyalty points, then renders a printable invoice.
- Reports: date-range and category filters, `Profit = Revenue − COGS −
  Expenses`, P&L summary, SVG charts, CSV export and print.
- Reusable UI systems: modals, confirm dialogs, toasts, dynamic form builder
  with validation, pagination and CSV export — all hand-written.
- Charts drawn as hand-authored SVG (line, bar, horizontal bar, donut); no
  charting library.
- `js/storage.js` data layer over localStorage with demo-data seeding
  (22 products, 8 categories, 10 customers, 5 suppliers, 10 employees,
  20 orders, 15 expenses) in ₹ INR.
- Light and dark themes, responsive layouts down to 640px, and print styles.
- Settings: store profile, currency, tax rate, invoice prefix, appearance,
  reset-to-demo-data and clear-all-data.

### Notes

- No frameworks, no build step, no backend. Opening `index.html` in a browser
  is enough.
- All data lives in the browser's localStorage. This is not a substitute for a
  server, and provides no real authentication — see `SECURITY.md`.

[1.1.0]: #110--2026-09-04
[1.0.0]: #100--2026-09-04
