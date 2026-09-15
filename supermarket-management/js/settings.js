/* =============================================================
   settings.js — store profile, billing prefs, appearance, data
   ============================================================= */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const CURRENCIES = [
    { value: '₹', label: '₹  Indian Rupee (INR)' },
    { value: '$', label: '$  US Dollar (USD)' },
    { value: '€', label: '€  Euro (EUR)' },
    { value: '£', label: '£  Pound (GBP)' },
    { value: 'AED', label: 'AED  UAE Dirham' },
  ];
  let storeFb, bizFb;
  let picked = { theme: 'light', sidebarCollapsed: false };

  function storeFields(s) {
    return [
      { name: 'storeName', label: 'Store Name', value: s.storeName, required: true, colSpan: 2 },
      { name: 'storeAddress', label: 'Address', type: 'textarea', value: s.storeAddress, required: true, colSpan: 2 },
      { name: 'phone', label: 'Phone', type: 'tel', value: s.phone, required: true, validate: (v) => (App.isPhone(v.replace(/[^0-9]/g, '').slice(-10)) ? '' : 'Enter a valid phone number') },
      { name: 'email', label: 'Email', type: 'email', value: s.email, required: true, validate: (v) => (App.isEmail(v) ? '' : 'Enter a valid email') },
      { name: 'gst', label: 'GSTIN', value: s.gst, colSpan: 2 },
    ];
  }

  function bizFields(s) {
    return [
      { name: 'currency', label: 'Currency Symbol', type: 'select', value: s.currency, options: CURRENCIES },
      { name: 'taxPercent', label: 'Default Tax / GST (%)', type: 'number', value: s.taxPercent, required: true, min: 0, max: 100, step: 0.5 },
      { name: 'invoicePrefix', label: 'Invoice Prefix', value: s.invoicePrefix, required: true, colSpan: 2, validate: (v) => (/^[A-Za-z0-9-]{1,10}$/.test(v) ? '' : 'Use 1–10 letters, digits or dashes') },
    ];
  }

  function renderThemeSwitch() {
    document.querySelectorAll('#themeSwitch .theme-opt').forEach((opt) => {
      opt.classList.toggle('is-active', opt.getAttribute('data-theme') === picked.theme);
      opt.onclick = () => {
        picked.theme = opt.getAttribute('data-theme');
        App.applyTheme(picked.theme); // live preview
        renderThemeSwitch();
      };
    });
  }

  function save() {
    const a = storeFb.validate();
    const b = bizFb.validate();
    if (!a.valid || !b.valid) { App.toast('Please fix the highlighted fields', 'error'); return; }

    const patch = Object.assign({}, a.values, b.values, {
      taxPercent: Number(b.values.taxPercent),
      invoicePrefix: b.values.invoicePrefix.toUpperCase(),
      theme: picked.theme,
      sidebarCollapsed: $('sidebarCollapsed').checked,
    });
    DB.saveSettings(patch);

    // Reflect changes live in the shared layout
    App.applyTheme(patch.theme);
    const brand = document.querySelector('.brand__name');
    if (brand) brand.textContent = patch.storeName;
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('is-collapsed', patch.sidebarCollapsed);
    document.title = 'Settings · ' + patch.storeName;

    App.toast('Settings saved', 'success');
  }

  async function resetDemo() {
    const ok = await App.confirmDialog({
      title: 'Reset to demo data?',
      message: 'This replaces all products, orders, customers and other records with the original sample data. Your store settings are kept. This cannot be undone.',
      confirmText: 'Reset data',
      danger: true,
    });
    if (!ok) return;
    DB.resetAll();
    App.toast('Demo data restored', 'success');
    setTimeout(() => window.location.reload(), 700);
  }

  async function clearAll() {
    const ok = await App.confirmDialog({
      title: 'Clear all data?',
      message: 'This permanently deletes every product, order, customer, supplier, employee and expense record. Empty tables will remain and will NOT be re-seeded. Store settings are kept. This cannot be undone.',
      confirmText: 'Delete everything',
      danger: true,
    });
    if (!ok) return;
    // Keep the "_seeded" flag so auto-seed on next load stays suppressed → tables remain empty.
    ['categories', 'products', 'suppliers', 'customers', 'employees', 'expenses', 'orders', 'inventory'].forEach(DB.clearData);
    App.toast('All records cleared', 'success');
    setTimeout(() => window.location.reload(), 700);
  }

  function renderAbout() {
    const host = $('aboutBody');
    if (!host) return;
    const v = window.SM_VERSION || { name: 'Supermarket Management Admin', version: '—', channel: '', buildDate: '', schema: '—' };
    const rows = [
      ['Application', v.name],
      ['Version', v.version + (v.channel ? ' (' + v.channel + ')' : '')],
      ['Build date', v.buildDate || '—'],
      ['Data schema', 'v' + v.schema],
      ['Stack', 'HTML5 · CSS3 · Vanilla JS (no frameworks, no build step)'],
      ['Storage', 'Browser localStorage — no server, no external requests'],
    ];
    host.innerHTML =
      '<div class="detail-list">' +
      rows
        .map((r) => '<div class="detail-item"><label>' + App.escapeHtml(r[0]) + '</label><div>' + App.escapeHtml(r[1]) + '</div></div>')
        .join('') +
      '</div>';
  }

  function init() {
    const s = DB.getSettings();
    picked.theme = s.theme === 'dark' ? 'dark' : 'light';

    storeFb = App.buildForm(storeFields(s));
    bizFb = App.buildForm(bizFields(s));
    $('storeForm').appendChild(storeFb.form);
    $('bizForm').appendChild(bizFb.form);

    $('sidebarCollapsed').checked = !!s.sidebarCollapsed;
    renderThemeSwitch();
    renderAbout();

    $('saveBtn').addEventListener('click', save);
    $('resetBtn').addEventListener('click', resetDemo);
    $('clearBtn').addEventListener('click', clearAll);
  }
  document.addEventListener('DOMContentLoaded', init);
})();
