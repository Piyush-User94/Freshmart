/* =============================================================
   inventory.js — stock overview, adjustments & movement log
   ============================================================= */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let state = { search: '', status: '', page: 1, perPage: 10 };

  function filtered() {
    let list = DB.getData('products', []);
    const q = state.search.toLowerCase();
    if (q) list = list.filter((p) => (p.name + ' ' + p.sku).toLowerCase().includes(q));
    if (state.status) list = list.filter((p) => App.stockStatus(p).label === state.status);
    return list.sort((a, b) => a.stock - b.stock);
  }

  function renderStats() {
    const products = DB.getData('products', []);
    const low = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
    const out = products.filter((p) => p.stock === 0).length;
    const expiring = products.filter((p) => {
      const s = App.stockStatus(p);
      return s.label === 'Expiring Soon' || s.label === 'Expired';
    }).length;
    const totalUnits = products.reduce((s, p) => s + p.stock, 0);

    const tiles = [
      { icon: 'layers', cls: 'i-blue', value: App.formatNumber(totalUnits), label: 'Total stock units' },
      { icon: 'warn', cls: 'i-amber', value: low, label: 'Low-stock items' },
      { icon: 'close', cls: 'i-red', value: out, label: 'Out-of-stock items' },
      { icon: 'info', cls: 'i-violet', value: expiring, label: 'Expiring / expired' },
    ];
    $('miniStats').innerHTML = tiles
      .map(
        (t) =>
          '<div class="mini-stat"><div class="mini-stat__icon ' + t.cls + '">' + App.icon(t.icon) + '</div>' +
          '<div><div class="mini-stat__value">' + t.value + '</div><div class="mini-stat__label">' + t.label + '</div></div></div>'
      )
      .join('');
  }

  function render() {
    renderStats();
    const info = App.paginate(filtered(), state.page, state.perPage);
    state.page = info.page;
    const tbody = $('tbody');
    if (!info.rows.length) {
      tbody.innerHTML = App.emptyRow(7, 'No products found');
    } else {
      tbody.innerHTML = info.rows
        .map((p) => {
          const st = App.stockStatus(p);
          return (
            '<tr>' +
            '<td class="cell-product"><span class="thumb" style="background:' + App.colorFor(p.name) + '">' + App.escapeHtml(App.initials(p.name)) + '</span><span class="cell-strong">' + App.escapeHtml(p.name) + '</span></td>' +
            '<td class="mono cell-sub">' + App.escapeHtml(p.sku) + '</td>' +
            '<td class="num cell-strong">' + p.stock + ' <span class="cell-sub">' + App.escapeHtml(p.unit) + '</span></td>' +
            '<td class="num">' + p.minStock + '</td>' +
            '<td>' + App.badge(st.label, st.kind) + '</td>' +
            '<td class="cell-sub">' + App.formatDate(p.expiryDate) + '</td>' +
            '<td><div class="row-actions"><button class="btn btn--sm btn--ghost" data-act="adjust" data-id="' + p.id + '">Adjust</button></div></td>' +
            '</tr>'
          );
        })
        .join('');
    }
    App.renderPagination($('pagination'), info, (pg) => { state.page = pg; render(); });
    renderMovements();
  }

  function renderMovements() {
    const log = DB.getData('inventory', []);
    const host = $('movements');
    if (!log.length) {
      host.innerHTML = '<div class="empty-state"><p>No stock movements recorded yet. Adjust stock to see history here.</p></div>';
      return;
    }
    host.innerHTML =
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Type</th><th class="num">Change</th><th class="num">New Stock</th><th>By</th><th>When</th></tr></thead><tbody>' +
      log.slice(0, 20).map((m) => {
        const pos = m.change >= 0;
        return '<tr><td class="cell-strong">' + App.escapeHtml(m.name) + '</td><td>' + App.badge(m.type, 'muted') + '</td>' +
          '<td class="num ' + (pos ? '' : '') + '" style="color:' + (pos ? 'var(--primary)' : 'var(--danger)') + ';font-weight:700">' + (pos ? '+' : '') + m.change + '</td>' +
          '<td class="num">' + m.stock + '</td><td class="cell-sub">' + App.escapeHtml(m.by || '—') + '</td><td class="cell-sub">' + App.formatDate(m.at, true) + '</td></tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function openAdjust(product) {
    const fb = App.buildForm([
      { name: 'mode', label: 'Adjustment Type', type: 'select', value: 'add',
        options: [{ value: 'add', label: 'Add stock (+)' }, { value: 'remove', label: 'Remove stock (−)' }, { value: 'set', label: 'Set exact value' }] },
      { name: 'amount', label: 'Quantity', type: 'number', value: 1, required: true, min: 0 },
      { name: 'reason', label: 'Reason / Note', value: '', colSpan: 2, placeholder: 'e.g. New delivery, damaged goods, stock count' },
    ]);
    const info = document.createElement('div');
    info.className = 'text-muted';
    info.style.marginBottom = '12px';
    info.textContent = 'Current stock: ' + product.stock + ' ' + product.unit;
    const body = document.createElement('div');
    body.appendChild(info);
    body.appendChild(fb.form);

    const foot = document.createElement('div');
    foot.innerHTML = '<button class="btn btn--ghost" data-x>Cancel</button><button class="btn btn--primary" data-save>Update Stock</button>';
    const modal = App.openModal({ title: 'Adjust Stock — ' + product.name, body: body, footer: foot });
    foot.querySelector('[data-x]').addEventListener('click', modal.close);
    foot.querySelector('[data-save]').addEventListener('click', () => {
      const res = fb.validate();
      if (!res.valid) return;
      const amt = Number(res.values.amount);
      let newStock = product.stock;
      if (res.values.mode === 'add') newStock = product.stock + amt;
      else if (res.values.mode === 'remove') newStock = Math.max(0, product.stock - amt);
      else newStock = amt;

      const change = newStock - product.stock;
      DB.updateData('products', product.id, { stock: newStock });
      DB.logInventory({ productId: product.id, name: product.name, type: res.values.mode + (res.values.reason ? ' · ' + res.values.reason : ''), change: change, stock: newStock, at: new Date().toISOString(), by: 'Suresh Kumar' });
      modal.close();
      App.toast('Stock updated: ' + product.name + ' → ' + newStock + ' ' + product.unit, 'success');
      if (newStock <= product.minStock) App.toast(product.name + ' is now at/below minimum stock', 'warning');
      render();
      App.refreshNotifications();
    });
  }

  function init() {
    render();
    $('search').addEventListener('input', (e) => { state.search = e.target.value; state.page = 1; render(); });
    App.registerSearch((v) => { $('search').value = v; state.search = v; state.page = 1; render(); });
    $('filterStatus').addEventListener('change', (e) => { state.status = e.target.value; state.page = 1; render(); });
    $('exportBtn').addEventListener('click', () => {
      const rows = filtered().map((p) => [p.name, p.sku, p.stock, p.minStock, p.unit, App.stockStatus(p).label, p.expiryDate]);
      App.exportCsv('inventory.csv', ['Product', 'SKU', 'Stock', 'MinStock', 'Unit', 'Status', 'Expiry'], rows);
      App.toast('Inventory exported', 'success');
    });
    $('tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const p = DB.findById('products', btn.getAttribute('data-id'));
      if (p) openAdjust(p);
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
