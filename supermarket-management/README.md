# Supermarket Management Admin

A supermarket back-office dashboard built with **only HTML5, CSS3 and vanilla
JavaScript (ES6+)** — no frameworks, no build step, no backend. All data is
stored in the browser's `localStorage` and seeded with realistic demo data on
first run.

## Run it

Either way works — no install, no server required:

- **Open directly:** double-click `index.html` (runs over `file://`).
- **Or serve it** (nicer URLs, and mirrors production headers):

  ```bash
  python tools/devserver.py
  ```

  then open <http://127.0.0.1:8123/>. This hardened dev server sends the same
  security headers as production (see `SECURITY.md`). A bare
  `python -m http.server 8123 --directory .` also works for functionality.

## Modules

Dashboard · POS / Billing · Products · Categories · Inventory · Suppliers ·
Customers · Orders & Sales · Employees · Expenses · Reports · Settings.

Every table has working search, sort, filter and pagination; every module has
full CRUD; the POS completes real sales (writes the order, reduces stock, logs
the movement, updates the customer, prints an invoice); Reports computes
`Profit = Revenue − COGS − Expenses` with CSV export and print.

## Project structure

```
supermarket-management/
├── index.html, pos.html, products.html, …   # one page per module (12)
├── css/        style.css · dashboard.css · responsive.css
├── js/         version.js · storage.js · app.js · <module>.js · invoice.js
├── assets/     images/ · icons/
├── tools/      devserver.py                  # optional hardened preview server
├── deploy/     nginx.conf · web.config       # host security configs
├── .htaccess, _headers, vercel.json          # host security configs
├── VERSION, version.json, CHANGELOG.md       # release metadata
└── SECURITY.md                               # header set, scan status, threat model
```

`js/storage.js` is the `localStorage` data layer (`window.DB`); `js/app.js` is
the shared UI backbone (`window.App`) that injects the sidebar/topbar and
provides modals, toasts, forms, tables, charts and CSV export. Scripts use the
IIFE + `window` namespace pattern (not ES modules) so the site also runs from
`file://`.

## Versioning

The running version lives in `js/version.js` (exposed as `window.SM_VERSION`
and shown in **Settings → About**), mirrored in `VERSION` (plain text) and
`version.json` (machine-readable), with history in `CHANGELOG.md`. Current
release: see [`VERSION`](VERSION).

## Security & data

This is a frontend-only app: **it has no real authentication and stores data
unencrypted in the browser.** Don't put real personal or payment data in it.
See [`SECURITY.md`](SECURITY.md) for the full header set, the external-scan
status, and the threat model.
