# Security

This document records how the Supermarket Management Admin dashboard responds
to the external scan findings, the response headers it ships to production, and
the honest limits of a frontend-only application.

## What this app is

A static site: HTML5, CSS3 and vanilla JavaScript, no build step and no
backend. All data lives in the browser's `localStorage` (keys prefixed `sm_`).
It runs by opening `index.html`, or from any static host.

Two consequences follow directly, and the app states both in the UI
(Settings → Data Management):

- **There is no real authentication.** The "admin profile" and "logout" are UI
  only. Anything shipped to the browser is fully visible to the user; a
  frontend cannot keep a secret or enforce an access rule. Do not treat this as
  a security boundary. A production deployment needs a server that
  authenticates requests and stores data server-side.
- **Data is local and unencrypted.** `localStorage` is readable by any script
  on the origin and by anyone with access to the machine. Do not store real
  personal or payment data.

## Scan findings and status

The scan was run against `python -m http.server`, a bare development server
that sends no security headers and advertises its version. A static frontend
cannot set its own response headers, so each finding is fixed at the layer that
can: the delivered HTML where a directive supports it, and the host/server
config for the rest. Ready-to-use configs are included for the common hosts.

| # | Severity | Finding | Status | Fix |
|---|----------|---------|--------|-----|
| 1 | High | HTTPS not enforced | Fixed at host | HTTP→HTTPS redirect + HSTS in every host config. Managed hosts (Netlify, Cloudflare Pages, Vercel) serve HTTPS-only by default. |
| 2 | High | Content-Security-Policy missing | Fixed | `<meta http-equiv="Content-Security-Policy">` on all 12 pages **and** a real header in every host config. |
| 3 | Medium | Clickjacking protection missing | Fixed at host | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` in every host config. (Not expressible from static HTML — `X-Frame-Options` and `frame-ancestors` are ignored in a `<meta>` tag.) |
| 4 | Low | MIME-sniffing protection missing | Fixed at host | `X-Content-Type-Options: nosniff` in every host config. |
| 5 | Low | Referrer-Policy missing | Fixed | `<meta name="referrer" content="strict-origin-when-cross-origin">` on every page + header in host configs. |
| 6 | Low | Permissions-Policy missing | Fixed at host | Restrictive `Permissions-Policy` (denies camera, mic, geolocation, USB, serial, payment, …) in every host config. |
| 7 | Low | Server software version disclosed | Fixed at host | Version suppressed in every host config; the bundled dev server (`tools/devserver.py`) reports a bare `Server: webserver`. |

To reproduce the fixed state locally, run the hardened dev server instead of
the bare one:

```bash
python tools/devserver.py
```

It sends the production header set (minus HSTS, which is only valid over TLS)
and hides its version, so a local scan reflects production rather than the
stock `http.server` defaults. Add `--tls --certfile cert.pem --keyfile key.pem`
to test over HTTPS.

## Header set shipped to production

Delivered by `.htaccess`, `_headers`, `vercel.json`, `deploy/nginx.conf` and
`deploy/web.config`:

| Header | Value (summary) |
|--------|-----------------|
| `Content-Security-Policy` | `default-src 'self'`; `script-src 'self'` (no `unsafe-inline`/`unsafe-eval`); `connect-src 'none'`; `object-src`/`base-uri`/`form-action` `'none'`; `frame-ancestors 'none'`; `upgrade-insecure-requests` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | all powerful features denied (`fullscreen=(self)` kept for the print/invoice view) |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |

### Why the CSP is shaped this way

- **`script-src 'self'`** with no `'unsafe-inline'` and no `'unsafe-eval'`.
  Every script is an external same-origin file (`js/*.js`); there are no inline
  `<script>` blocks, no inline event-handler attributes (`onclick=…`), and no
  `eval` / `new Function`. This is the directive that most reduces XSS impact.
- **`style-src 'self' 'unsafe-inline'`.** The UI sets a few `style` attributes
  from code (chart bar heights, avatar colours). Those need `'unsafe-inline'`
  for styles. This is a deliberate, documented trade-off; it does not permit
  script execution. It could be tightened later by moving inline styles to
  CSS custom properties.
- **`connect-src 'none'`.** The app never issues `fetch`/`XHR`/WebSocket calls;
  denying them outright means a successful injection still cannot exfiltrate
  `localStorage` to a remote host.
- **`object-src`, `frame-src`, `worker-src`, `media-src` `'none'`** and
  **`base-uri 'none'` / `form-action 'none'`** remove plugin, framing, worker,
  base-tag-hijack and form-redirect vectors the app doesn't use.

The `<meta>` CSP in each page uses `file:` in addition to `'self'` so the same
policy also holds when the site is opened directly from disk (`file://`), which
is a supported way to run it. The host-header CSP omits `file:` since it only
applies to HTTP(S) responses.

## Application-level protections (in the code)

These are independent of headers and apply even when the site runs from
`file://`:

- **Output encoding.** All user-provided text is escaped via `App.escapeHtml`
  before being placed in `innerHTML`; the only unescaped markup inserted is
  author-controlled SVG icons. This is the primary defence against stored XSS
  from record fields (product names, customer names, expense descriptions, …).
- **Input validation.** `App.buildForm` enforces required fields, email/phone
  formats, numeric min/max and custom rules (e.g. duplicate-SKU prevention)
  before anything is written to storage. Storage helpers guard JSON parsing
  with try/catch.
- **CSV injection neutralised.** `App.exportCsv` prefixes any value beginning
  with `=`, `+`, `-`, `@`, TAB or CR with an apostrophe so spreadsheets treat
  it as text, not a formula — while leaving plain numbers (including negatives)
  numeric.
- **No implicit form submission.** Forms call `preventDefault` on submit, so
  pressing Enter in a field cannot trigger a navigation/reload.
- **Destructive actions are confirmed.** Delete, cancel/refund, clear-cart,
  reset-demo-data and clear-all-data all require an explicit confirm dialog.
- **No secrets in the client.** There are no API keys, passwords or tokens in
  the JavaScript, because there is no backend to hold them against.

## Threat model, briefly

- **In scope, and mitigated:** stored XSS via record fields (output encoding +
  CSP), clickjacking (frame headers), MIME sniffing, referrer leakage, CSV
  formula injection, transport downgrade (HTTPS/HSTS at the host), version
  fingerprinting.
- **Out of scope by design:** authentication, authorization, server-side
  validation, data confidentiality, multi-user integrity, audit logging. These
  require a backend and are not solvable in a static frontend. Treat this app
  as a single-operator local tool or a UI prototype, not a production system of
  record.

## Reporting

This is a demo/portfolio project. If you find an issue, note it in
`CHANGELOG.md` under a new version and fix it in the relevant file
(`js/app.js` for shared behaviour, the per-module file otherwise, the host
configs for headers).
