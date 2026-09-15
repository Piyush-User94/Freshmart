/* =============================================================
   app.js — shared application shell + UI utilities
   Exposed as window.App. Depends on window.DB (storage.js).
   ============================================================= */
window.App = (function () {
  'use strict';

  /* ---------- Navigation model ---------- */
  const NAV = [
    { key: 'dashboard', label: 'Dashboard', href: 'index.html', icon: 'dashboard' },
    { key: 'pos', label: 'POS / Billing', href: 'pos.html', icon: 'pos' },
    { key: 'products', label: 'Products', href: 'products.html', icon: 'box' },
    { key: 'categories', label: 'Categories', href: 'categories.html', icon: 'tag' },
    { key: 'inventory', label: 'Inventory', href: 'inventory.html', icon: 'layers' },
    { key: 'suppliers', label: 'Suppliers', href: 'suppliers.html', icon: 'truck' },
    { key: 'customers', label: 'Customers', href: 'customers.html', icon: 'users' },
    { key: 'orders', label: 'Orders', href: 'orders.html', icon: 'receipt' },
    { key: 'employees', label: 'Employees', href: 'employees.html', icon: 'badge' },
    { key: 'expenses', label: 'Expenses', href: 'expenses.html', icon: 'wallet' },
    { key: 'reports', label: 'Reports', href: 'reports.html', icon: 'chart' },
    { key: 'settings', label: 'Settings', href: 'settings.html', icon: 'gear' },
  ];

  /* ---------- Inline SVG icons (safe, author-controlled markup) ---------- */
  const ICONS = {
    dashboard: '<path d="M3 13h8V3H3zM13 21h8v-8h-8zM3 21h8v-6H3zM13 11h8V3h-8z"/>',
    pos: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/>',
    box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    tag: '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    layers: '<path d="M12 2l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5M3 17l9 5 9-5"/>',
    truck: '<path d="M1 5h13v10H1zM14 8h4l3 3v4h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0113 0M16 5.5a3 3 0 010 6M21.5 20a5.8 5.8 0 00-4-5.5"/>',
    receipt: '<path d="M5 3h14v18l-3-2-3 2-3-2-3 2zM8 8h8M8 12h8M8 16h5"/>',
    badge: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="2.6"/><path d="M7.5 18a4.5 4.5 0 019 0"/>',
    wallet: '<rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M2.5 10h19M17 14h.01"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    bell: '<path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 004 0"/>',
    logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    eye: '<path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2 2M17.8 17.8l2 2M4.2 19.8l2-2M17.8 6.2l2-2"/>',
    moon: '<path d="M20 14A8 8 0 019.5 3.5 8.5 8.5 0 1020 14z"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    print: '<path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M2 3h3l2.4 12.5A2 2 0 009.3 17H18a2 2 0 002-1.6L21.5 7H6"/>',
    rupee: '<path d="M7 4h10M7 9h10M13 4c3 0 4 5 0 5H8l6 8"/>',
  };

  function icon(name, cls) {
    const body = ICONS[name] || '';
    return (
      '<svg class="icon ' +
      (cls || '') +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      body +
      '</svg>'
    );
  }

  /* ---------- Escaping / sanitising ---------- */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------- Formatters ---------- */
  function currencySymbol() {
    return DB.getSettings().currency || '₹';
  }
  function formatCurrency(n, withSymbol) {
    const num = Number(n) || 0;
    const s = num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
    return withSymbol === false ? s : currencySymbol() + s;
  }
  function formatNumber(n) {
    return (Number(n) || 0).toLocaleString('en-IN');
  }
  function formatDate(d, withTime) {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '—';
    const opts = { day: '2-digit', month: 'short', year: 'numeric' };
    if (withTime) {
      opts.hour = '2-digit';
      opts.minute = '2-digit';
    }
    return date.toLocaleDateString('en-IN', opts);
  }

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  }
  function toggleTheme() {
    const s = DB.getSettings();
    const next = s.theme === 'dark' ? 'light' : 'dark';
    DB.saveSettings({ theme: next });
    applyTheme(next);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.innerHTML = icon(next === 'dark' ? 'sun' : 'moon');
  }
  // Apply immediately (script is deferred, <html> already parsed) to limit flash.
  applyTheme(DB.getSettings().theme);

  /* ---------- Toast notifications ---------- */
  function ensureToastHost() {
    let host = document.getElementById('toastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toastHost';
      host.className = 'toast-host';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    return host;
  }
  function toast(message, type, timeout) {
    const host = ensureToastHost();
    const t = document.createElement('div');
    t.className = 'toast toast--' + (type || 'success');
    const ic = type === 'error' ? 'close' : type === 'warning' ? 'warn' : type === 'info' ? 'info' : 'check';
    t.innerHTML = '<span class="toast__icon">' + icon(ic) + '</span><span class="toast__msg"></span>';
    t.querySelector('.toast__msg').textContent = message;
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-in'));
    const life = timeout || 3200;
    const close = () => {
      t.classList.remove('is-in');
      setTimeout(() => t.remove(), 250);
    };
    const timer = setTimeout(close, life);
    t.addEventListener('click', () => {
      clearTimeout(timer);
      close();
    });
  }

  /* ---------- Modal system ---------- */
  let modalStack = [];
  function openModal(opts) {
    opts = opts || {};
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const modal = document.createElement('div');
    modal.className = 'modal' + (opts.size ? ' modal--' + opts.size : '');

    const head = document.createElement('div');
    head.className = 'modal__head';
    const h = document.createElement('h3');
    h.className = 'modal__title';
    h.textContent = opts.title || '';
    const x = document.createElement('button');
    x.className = 'icon-btn modal__close';
    x.setAttribute('aria-label', 'Close dialog');
    x.innerHTML = icon('close');
    head.appendChild(h);
    head.appendChild(x);

    const body = document.createElement('div');
    body.className = 'modal__body';
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body instanceof Node) body.appendChild(opts.body);

    modal.appendChild(head);
    modal.appendChild(body);

    if (opts.footer) {
      const foot = document.createElement('div');
      foot.className = 'modal__foot';
      if (typeof opts.footer === 'string') foot.innerHTML = opts.footer;
      else if (opts.footer instanceof Node) foot.appendChild(opts.footer);
      modal.appendChild(foot);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => overlay.classList.add('is-in'));

    const api = {
      overlay: overlay,
      modal: modal,
      body: body,
      close: function () {
        overlay.classList.remove('is-in');
        setTimeout(() => {
          overlay.remove();
          modalStack = modalStack.filter((m) => m !== api);
          if (!modalStack.length) document.body.classList.remove('modal-open');
        }, 200);
        if (typeof opts.onClose === 'function') opts.onClose();
      },
    };
    modalStack.push(api);

    x.addEventListener('click', api.close);
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay && opts.dismissible !== false) api.close();
    });
    // focus first focusable
    setTimeout(() => {
      const f = modal.querySelector('input,select,textarea,button:not(.modal__close)');
      if (f) f.focus();
    }, 60);
    return api;
  }

  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.innerHTML =
        '<p class="confirm__msg"></p>' +
        '<div class="modal__foot">' +
        '<button class="btn btn--ghost" data-act="cancel">' +
        escapeHtml(opts.cancelText || 'Cancel') +
        '</button>' +
        '<button class="btn ' +
        (opts.danger ? 'btn--danger' : 'btn--primary') +
        '" data-act="ok">' +
        escapeHtml(opts.confirmText || 'Confirm') +
        '</button></div>';
      wrap.querySelector('.confirm__msg').textContent = opts.message || 'Are you sure?';
      const m = openModal({ title: opts.title || 'Please confirm', body: wrap, size: 'sm' });
      wrap.querySelector('[data-act="cancel"]').addEventListener('click', () => {
        m.close();
        resolve(false);
      });
      wrap.querySelector('[data-act="ok"]').addEventListener('click', () => {
        m.close();
        resolve(true);
      });
    });
  }

  // ESC closes topmost modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalStack.length) {
      modalStack[modalStack.length - 1].close();
    }
  });

  /* ---------- Validation helpers ---------- */
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
  const isPhone = (v) => /^[6-9]\d{9}$/.test(String(v).replace(/[\s-]/g, ''));
  const isPositive = (v) => Number(v) > 0;
  const isNonNegative = (v) => Number(v) >= 0;

  /* ---------- Dynamic form builder ----------
     fields: [{ name,label,type,value,options,required,min,max,step,placeholder,hint,colSpan,validate }]
     returns { form, getValues, validate, setError, clearErrors } */
  function buildForm(fields) {
    const form = document.createElement('form');
    form.className = 'form-grid';
    form.setAttribute('novalidate', '');
    // Suppress implicit submission: pressing Enter in a field must not trigger a
    // native form submit (which would navigate/reload the page). Saving is always
    // driven explicitly by the modal's Save button calling validate().
    form.addEventListener('submit', (e) => e.preventDefault());

    fields.forEach((f) => {
      const group = document.createElement('div');
      group.className = 'form-group' + (f.colSpan === 2 ? ' col-2' : '');
      const id = 'f_' + f.name;

      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.className = 'form-label';
      label.innerHTML = escapeHtml(f.label) + (f.required ? ' <span class="req">*</span>' : '');
      group.appendChild(label);

      let input;
      if (f.type === 'select') {
        input = document.createElement('select');
        (f.options || []).forEach((o) => {
          const opt = document.createElement('option');
          opt.value = o.value;
          opt.textContent = o.label;
          if (String(o.value) === String(f.value)) opt.selected = true;
          input.appendChild(opt);
        });
      } else if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = f.rows || 3;
        input.value = f.value != null ? f.value : '';
      } else {
        input = document.createElement('input');
        input.type = f.type || 'text';
        if (f.value != null) input.value = f.value;
        if (f.min != null) input.min = f.min;
        if (f.max != null) input.max = f.max;
        if (f.step != null) input.step = f.step;
      }
      input.id = id;
      input.name = f.name;
      input.className = 'form-control';
      if (f.placeholder) input.placeholder = f.placeholder;
      if (f.readonly) input.readOnly = true;
      group.appendChild(input);

      if (f.hint) {
        const hint = document.createElement('small');
        hint.className = 'form-hint';
        hint.textContent = f.hint;
        group.appendChild(hint);
      }
      const err = document.createElement('small');
      err.className = 'form-error';
      err.setAttribute('data-error-for', f.name);
      group.appendChild(err);

      form.appendChild(group);
    });

    function getValues() {
      const out = {};
      fields.forEach((f) => {
        const el = form.elements[f.name];
        let v = el ? el.value : '';
        if (f.type === 'number') v = v === '' ? '' : Number(v);
        else if (typeof v === 'string') v = v.trim();
        out[f.name] = v;
      });
      return out;
    }

    function clearErrors() {
      form.querySelectorAll('.form-error').forEach((e) => (e.textContent = ''));
      form.querySelectorAll('.form-control').forEach((e) => e.classList.remove('is-invalid'));
    }

    function setError(name, msg) {
      const err = form.querySelector('[data-error-for="' + name + '"]');
      if (err) err.textContent = msg;
      const el = form.elements[name];
      if (el) el.classList.add('is-invalid');
    }

    function validate() {
      clearErrors();
      const values = getValues();
      let ok = true;
      let firstBad = null;
      fields.forEach((f) => {
        const v = values[f.name];
        let msg = '';
        if (f.required && (v === '' || v === null || v === undefined)) {
          msg = f.label + ' is required';
        } else if (v !== '' && f.type === 'email' && !isEmail(v)) {
          msg = 'Enter a valid email address';
        } else if (v !== '' && f.type === 'tel' && f.phone && !isPhone(v)) {
          msg = 'Enter a valid 10-digit phone number';
        } else if (v !== '' && f.type === 'number' && f.min != null && Number(v) < Number(f.min)) {
          msg = f.label + ' must be at least ' + f.min;
        } else if (typeof f.validate === 'function') {
          msg = f.validate(v, values) || '';
        }
        if (msg) {
          ok = false;
          setError(f.name, msg);
          if (!firstBad) firstBad = f.name;
        }
      });
      if (firstBad && form.elements[firstBad]) form.elements[firstBad].focus();
      return { valid: ok, values: values };
    }

    return { form: form, getValues: getValues, validate: validate, setError: setError, clearErrors: clearErrors };
  }

  /* ---------- Pagination ---------- */
  function paginate(arr, page, perPage) {
    const total = arr.length;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const p = Math.min(Math.max(1, page), pages);
    const start = (p - 1) * perPage;
    return { rows: arr.slice(start, start + perPage), page: p, pages: pages, total: total, start: start };
  }

  function renderPagination(container, info, onPage) {
    if (!container) return;
    container.innerHTML = '';
    const from = info.total === 0 ? 0 : info.start + 1;
    const to = Math.min(info.start + info.rows.length, info.total);

    const label = document.createElement('span');
    label.className = 'pagination__info';
    label.textContent = 'Showing ' + from + '–' + to + ' of ' + info.total;
    container.appendChild(label);

    const nav = document.createElement('div');
    nav.className = 'pagination__nav';

    const mk = (txt, page, disabled, active) => {
      const b = document.createElement('button');
      b.className = 'page-btn' + (active ? ' is-active' : '');
      b.innerHTML = txt;
      b.disabled = !!disabled;
      if (!disabled && !active) b.addEventListener('click', () => onPage(page));
      return b;
    };

    nav.appendChild(mk(icon('up', 'rot-left'), info.page - 1, info.page <= 1));
    const windowSize = 5;
    let startP = Math.max(1, info.page - 2);
    let endP = Math.min(info.pages, startP + windowSize - 1);
    startP = Math.max(1, endP - windowSize + 1);
    for (let p = startP; p <= endP; p++) nav.appendChild(mk(String(p), p, false, p === info.page));
    nav.appendChild(mk(icon('down', 'rot-left'), info.page + 1, info.page >= info.pages));

    container.appendChild(nav);
  }

  /* ---------- Sorting helper ---------- */
  function sortRows(rows, key, dir) {
    const factor = dir === 'desc' ? -1 : 1;
    return rows.slice().sort((a, b) => {
      let x = a[key];
      let y = b[key];
      if (typeof x === 'string') x = x.toLowerCase();
      if (typeof y === 'string') y = y.toLowerCase();
      if (x == null) return 1;
      if (y == null) return -1;
      if (x < y) return -1 * factor;
      if (x > y) return 1 * factor;
      return 0;
    });
  }

  /* ---------- Empty-state helper ---------- */
  function emptyRow(colspan, message) {
    return (
      '<tr class="empty-row"><td colspan="' +
      colspan +
      '"><div class="empty-state">' +
      icon('box', 'empty-state__icon') +
      '<p>' +
      escapeHtml(message || 'No records found') +
      '</p></div></td></tr>'
    );
  }

  /* ---------- CSV export ---------- */
  function exportCsv(filename, headers, rows) {
    const esc = (v) => {
      let s = v == null ? '' : String(v);
      // Neutralize spreadsheet formula injection (OWASP): a cell beginning with
      // = + - @ TAB or CR is evaluated as a formula by Excel / Google Sheets, so
      // a value like "=cmd|'/c calc'!A1" pulled from a text field could execute.
      // Prefix such values with an apostrophe, but leave plain numbers (incl.
      // negatives like -14) alone so numeric columns stay numeric.
      if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    let csv = headers.map(esc).join(',') + '\n';
    rows.forEach((r) => {
      csv += r.map(esc).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* =============================================================
     CHARTS (hand-drawn SVG / CSS — no libraries)
     ============================================================= */
  function svgEl(w, h, extraClass) {
    return (
      '<svg class="chart ' +
      (extraClass || '') +
      '" viewBox="0 0 ' +
      w +
      ' ' +
      h +
      '" preserveAspectRatio="none" role="img">'
    );
  }

  const charts = {
    // data: [{label, value}]
    line: function (data, o) {
      o = o || {};
      const w = 640;
      const h = 240;
      const padX = 36;
      const padY = 24;
      const max = Math.max(1, ...data.map((d) => d.value));
      const stepX = (w - padX * 2) / Math.max(1, data.length - 1);
      const yFor = (v) => h - padY - (v / max) * (h - padY * 2);
      const xFor = (i) => padX + i * stepX;

      let path = '';
      let area = '';
      data.forEach((d, i) => {
        const x = xFor(i);
        const y = yFor(d.value);
        path += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
        area += (i === 0 ? 'M' + x + ' ' + (h - padY) + ' L' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      });
      area += 'L' + xFor(data.length - 1) + ' ' + (h - padY) + ' Z';

      let grid = '';
      for (let g = 0; g <= 4; g++) {
        const y = padY + ((h - padY * 2) / 4) * g;
        grid += '<line class="chart-grid" x1="' + padX + '" y1="' + y + '" x2="' + (w - padX) + '" y2="' + y + '"/>';
      }
      let dots = '';
      let labels = '';
      data.forEach((d, i) => {
        const x = xFor(i);
        dots += '<circle class="chart-dot" cx="' + x + '" cy="' + yFor(d.value) + '" r="3"><title>' + escapeHtml(d.label + ': ' + formatCurrency(d.value)) + '</title></circle>';
        labels += '<text class="chart-xlabel" x="' + x + '" y="' + (h - 6) + '" text-anchor="middle">' + escapeHtml(d.label) + '</text>';
      });
      return (
        svgEl(w, h, 'chart--line') +
        grid +
        '<path class="chart-area" d="' + area + '"/>' +
        '<path class="chart-linepath" d="' + path + '"/>' +
        dots +
        labels +
        '</svg>'
      );
    },

    bar: function (data, o) {
      o = o || {};
      const w = 640;
      const h = 240;
      const padX = 36;
      const padY = 24;
      const max = Math.max(1, ...data.map((d) => d.value));
      const gap = 14;
      const bw = (w - padX * 2 - gap * (data.length - 1)) / data.length;
      let grid = '';
      for (let g = 0; g <= 4; g++) {
        const y = padY + ((h - padY * 2) / 4) * g;
        grid += '<line class="chart-grid" x1="' + padX + '" y1="' + y + '" x2="' + (w - padX) + '" y2="' + y + '"/>';
      }
      let bars = '';
      let labels = '';
      data.forEach((d, i) => {
        const bh = (d.value / max) * (h - padY * 2);
        const x = padX + i * (bw + gap);
        const y = h - padY - bh;
        bars +=
          '<rect class="chart-bar" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, bh).toFixed(1) + '" rx="4">' +
          '<title>' + escapeHtml(d.label + ': ' + formatCurrency(d.value)) + '</title></rect>';
        labels += '<text class="chart-xlabel" x="' + (x + bw / 2) + '" y="' + (h - 6) + '" text-anchor="middle">' + escapeHtml(d.label) + '</text>';
      });
      return svgEl(w, h, 'chart--bar') + grid + bars + labels + '</svg>';
    },

    // horizontal bars: [{label,value}]
    hbar: function (data) {
      const max = Math.max(1, ...data.map((d) => d.value));
      let html = '<div class="hbar-list">';
      data.forEach((d) => {
        const pct = Math.round((d.value / max) * 100);
        html +=
          '<div class="hbar">' +
          '<div class="hbar__label" title="' + escapeHtml(d.label) + '">' + escapeHtml(d.label) + '</div>' +
          '<div class="hbar__track"><div class="hbar__fill" style="width:' + pct + '%"></div></div>' +
          '<div class="hbar__val">' + escapeHtml(d.sub != null ? d.sub : formatNumber(d.value)) + '</div>' +
          '</div>';
      });
      html += '</div>';
      return html;
    },

    // donut: [{label,value,color}]
    donut: function (data, o) {
      o = o || {};
      const total = data.reduce((s, d) => s + d.value, 0) || 1;
      const r = 60;
      const c = 2 * Math.PI * r;
      let offset = 0;
      let segs = '';
      data.forEach((d) => {
        const frac = d.value / total;
        const len = frac * c;
        segs +=
          '<circle class="donut-seg" cx="80" cy="80" r="' + r + '" fill="none" stroke="' + d.color + '" ' +
          'stroke-width="26" stroke-dasharray="' + len.toFixed(2) + ' ' + (c - len).toFixed(2) + '" ' +
          'stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 80 80)"><title>' +
          escapeHtml(d.label + ': ' + formatNumber(d.value)) + '</title></circle>';
        offset += len;
      });
      const center = o.centerLabel
        ? '<text x="80" y="76" text-anchor="middle" class="donut-center">' + escapeHtml(o.centerLabel) + '</text>' +
          '<text x="80" y="96" text-anchor="middle" class="donut-sub">' + escapeHtml(o.centerSub || '') + '</text>'
        : '';
      let legend = '<ul class="donut-legend">';
      data.forEach((d) => {
        legend +=
          '<li><span class="dot" style="background:' + d.color + '"></span>' +
          escapeHtml(d.label) + ' <b>' + formatNumber(d.value) + '</b></li>';
      });
      legend += '</ul>';
      return (
        '<div class="donut-wrap"><svg viewBox="0 0 160 160" class="chart chart--donut">' +
        '<circle cx="80" cy="80" r="' + r + '" fill="none" class="donut-track" stroke-width="26"/>' +
        segs + center + '</svg>' + legend + '</div>'
      );
    },
  };

  /* =============================================================
     LAYOUT (sidebar + topbar) — injected into every page
     ============================================================= */
  let searchHandler = null;
  function registerSearch(fn) {
    searchHandler = fn;
  }

  function buildSidebar(activeKey) {
    const s = DB.getSettings();
    const collapsed = s.sidebarCollapsed;
    const aside = document.createElement('aside');
    aside.className = 'sidebar' + (collapsed ? ' is-collapsed' : '');
    aside.id = 'sidebar';

    let links = '';
    NAV.forEach((n) => {
      links +=
        '<a class="nav-link' + (n.key === activeKey ? ' is-active' : '') + '" href="' + n.href + '">' +
        '<span class="nav-link__icon">' + icon(n.icon) + '</span>' +
        '<span class="nav-link__label">' + escapeHtml(n.label) + '</span></a>';
    });

    aside.innerHTML =
      '<div class="sidebar__brand">' +
      '<span class="brand__logo">' + icon('cart') + '</span>' +
      '<span class="brand__name">' + escapeHtml(s.storeName) + '</span>' +
      '</div>' +
      '<nav class="sidebar__nav" aria-label="Primary">' + links + '</nav>' +
      '<div class="sidebar__foot">' +
      '<div class="profile-card">' +
      '<span class="avatar">SK</span>' +
      '<span class="profile-card__meta"><b>Suresh Kumar</b><small>Administrator</small></span>' +
      '</div>' +
      '<button class="btn btn--ghost btn--block logout-btn" id="logoutBtn">' +
      '<span class="nav-link__icon">' + icon('logout') + '</span>' +
      '<span class="nav-link__label">Logout</span></button>' +
      '</div>';
    return aside;
  }

  function buildTopbar(title) {
    const header = document.createElement('header');
    header.className = 'topbar';
    const s = DB.getSettings();
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

    header.innerHTML =
      '<button class="icon-btn" id="sidebarToggle" aria-label="Toggle sidebar">' + icon('menu') + '</button>' +
      '<h1 class="topbar__title">' + escapeHtml(title) + '</h1>' +
      '<div class="topbar__search"><span class="topbar__search-icon">' + icon('search') + '</span>' +
      '<input type="search" id="globalSearch" placeholder="Search this page…" aria-label="Search"></div>' +
      '<div class="topbar__actions">' +
      '<span class="topbar__date">' + escapeHtml(today) + '</span>' +
      '<div class="notif"><button class="icon-btn" id="notifBtn" aria-label="Notifications">' + icon('bell') +
      '<span class="notif__badge" id="notifBadge" hidden>0</span></button>' +
      '<div class="notif__panel" id="notifPanel" hidden></div></div>' +
      '<button class="icon-btn" id="themeToggle" aria-label="Toggle theme">' + icon(s.theme === 'dark' ? 'sun' : 'moon') + '</button>' +
      '<span class="avatar avatar--sm">SK</span>' +
      '</div>';
    return header;
  }

  function buildNotifications() {
    const products = DB.getData('products', []);
    const low = products.filter((p) => p.stock <= p.minStock);
    const badge = document.getElementById('notifBadge');
    const panel = document.getElementById('notifPanel');
    if (!panel) return;

    if (low.length) {
      badge.hidden = false;
      badge.textContent = low.length > 9 ? '9+' : String(low.length);
    }
    let html = '<div class="notif__head">Notifications</div>';
    if (!low.length) {
      html += '<div class="notif__empty">You\'re all caught up 🎉</div>';
    } else {
      low.slice(0, 8).forEach((p) => {
        const out = p.stock === 0;
        html +=
          '<a class="notif__item" href="inventory.html">' +
          '<span class="notif__dot ' + (out ? 'dot--danger' : 'dot--warning') + '"></span>' +
          '<span><b>' + escapeHtml(p.name) + '</b><small>' +
          (out ? 'Out of stock' : 'Low stock: ' + p.stock + ' ' + escapeHtml(p.unit) + ' left') +
          '</small></span></a>';
      });
      html += '<a class="notif__all" href="inventory.html">View inventory →</a>';
    }
    panel.innerHTML = html;
  }

  function wireTopbar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        // On mobile, toggle drawer; on desktop, collapse.
        if (window.matchMedia('(max-width: 900px)').matches) {
          sidebar.classList.toggle('is-open');
          document.body.classList.toggle('drawer-open', sidebar.classList.contains('is-open'));
        } else {
          sidebar.classList.toggle('is-collapsed');
          DB.saveSettings({ sidebarCollapsed: sidebar.classList.contains('is-collapsed') });
        }
      });
    }
    // Close drawer when clicking a nav link (mobile)
    document.querySelectorAll('.nav-link').forEach((a) => {
      a.addEventListener('click', () => {
        if (window.matchMedia('(max-width: 900px)').matches && sidebar) {
          sidebar.classList.remove('is-open');
          document.body.classList.remove('drawer-open');
        }
      });
    });

    const theme = document.getElementById('themeToggle');
    if (theme) theme.addEventListener('click', toggleTheme);

    const logout = document.getElementById('logoutBtn');
    if (logout)
      logout.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Log out?',
          message: 'This demo has no real authentication. You will simply return to the dashboard.',
          confirmText: 'Log out',
        });
        if (ok) {
          toast('Logged out (demo)', 'info');
          setTimeout(() => (window.location.href = 'index.html'), 600);
        }
      });

    const search = document.getElementById('globalSearch');
    if (search)
      search.addEventListener('input', (e) => {
        if (typeof searchHandler === 'function') searchHandler(e.target.value);
      });

    const notifBtn = document.getElementById('notifBtn');
    const notifPanel = document.getElementById('notifPanel');
    if (notifBtn && notifPanel) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPanel.hidden = !notifPanel.hidden;
      });
      document.addEventListener('click', (e) => {
        if (!notifPanel.hidden && !notifPanel.contains(e.target)) notifPanel.hidden = true;
      });
    }
  }

  function renderLayout() {
    const body = document.body;
    const activeKey = body.getAttribute('data-page') || '';
    const title = body.getAttribute('data-title') || 'Dashboard';

    // Skeleton wrappers
    const sidebar = buildSidebar(activeKey);
    const scrim = document.createElement('div');
    scrim.className = 'drawer-scrim';
    scrim.addEventListener('click', () => {
      sidebar.classList.remove('is-open');
      document.body.classList.remove('drawer-open');
    });

    const mainWrap = document.createElement('div');
    mainWrap.className = 'main-wrap';
    const topbar = buildTopbar(title);

    // Move existing content into <main>
    const content = document.createElement('main');
    content.className = 'content';
    content.id = 'content';
    const holder = document.getElementById('page');
    if (holder) {
      while (holder.firstChild) content.appendChild(holder.firstChild);
      holder.remove();
    }

    mainWrap.appendChild(topbar);
    mainWrap.appendChild(content);

    body.insertBefore(scrim, body.firstChild);
    body.insertBefore(mainWrap, scrim.nextSibling);
    body.insertBefore(sidebar, body.firstChild);

    wireTopbar();
    buildNotifications();
    document.title = title + ' · ' + DB.getSettings().storeName;
  }

  document.addEventListener('DOMContentLoaded', renderLayout);

  /* ---------- Avatar / thumbnail helpers ---------- */
  const PALETTE = ['#16a34a', '#2563eb', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#ef4444', '#0ea5e9', '#14b8a6', '#f97316'];
  function colorFor(str) {
    let h = 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }
  function initials(name) {
    const parts = String(name || '?').trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /* ---------- Status badge helper ---------- */
  function badge(text, kind) {
    return '<span class="badge badge--' + (kind || 'muted') + '">' + escapeHtml(text) + '</span>';
  }

  function stockStatus(p) {
    const today = new Date();
    const exp = p.expiryDate ? new Date(p.expiryDate) : null;
    if (exp && exp < today) return { label: 'Expired', kind: 'danger' };
    if (p.stock === 0) return { label: 'Out of Stock', kind: 'danger' };
    if (exp) {
      const days = Math.ceil((exp - today) / 86400000);
      if (days <= 14) return { label: 'Expiring Soon', kind: 'warning' };
    }
    if (p.stock <= p.minStock) return { label: 'Low Stock', kind: 'warning' };
    return { label: 'In Stock', kind: 'success' };
  }

  /* ---------- Public API ---------- */
  return {
    NAV: NAV,
    icon: icon,
    escapeHtml: escapeHtml,
    formatCurrency: formatCurrency,
    formatNumber: formatNumber,
    formatDate: formatDate,
    currencySymbol: currencySymbol,
    toast: toast,
    openModal: openModal,
    confirmDialog: confirmDialog,
    buildForm: buildForm,
    paginate: paginate,
    renderPagination: renderPagination,
    sortRows: sortRows,
    emptyRow: emptyRow,
    exportCsv: exportCsv,
    charts: charts,
    registerSearch: registerSearch,
    applyTheme: applyTheme,
    toggleTheme: toggleTheme,
    badge: badge,
    colorFor: colorFor,
    initials: initials,
    stockStatus: stockStatus,
    isEmail: isEmail,
    isPhone: isPhone,
    isPositive: isPositive,
    isNonNegative: isNonNegative,
    refreshNotifications: buildNotifications,
  };
})();
