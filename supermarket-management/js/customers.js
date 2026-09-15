/* =============================================================
   customers.js — customer CRUD + purchase history
   ============================================================= */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let state = { search: '', status: '', sortKey: 'name', sortDir: 'asc', page: 1, perPage: 10 };

  function filtered() {
    let list = DB.getData('customers', []);
    const q = state.search.toLowerCase();
    if (q) list = list.filter((c) => (c.name + ' ' + c.phone + ' ' + c.email).toLowerCase().includes(q));
    if (state.status) list = list.filter((c) => c.status === state.status);
    return App.sortRows(list, state.sortKey, state.sortDir);
  }

  function ordersOf(id) {
    return DB.getData('orders', []).filter((o) => o.customerId === id).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function render() {
    const info = App.paginate(filtered(), state.page, state.perPage);
    state.page = info.page;
    const tbody = $('tbody');
    if (!info.rows.length) {
      tbody.innerHTML = App.emptyRow(7, 'No customers found');
    } else {
      tbody.innerHTML = info.rows
        .map(
          (c) =>
            '<tr>' +
            '<td class="mono cell-sub">' + App.escapeHtml(c.id) + '</td>' +
            '<td class="cell-product"><span class="avatar avatar--sm" style="background:' + App.colorFor(c.name) + '">' + App.escapeHtml(App.initials(c.name)) + '</span><div><div class="cell-strong">' + App.escapeHtml(c.name) + '</div><div class="cell-sub">' + App.escapeHtml(c.email || '—') + '</div></div></td>' +
            '<td class="cell-sub">' + App.escapeHtml(c.phone || '—') + '</td>' +
            '<td class="num cell-strong">' + App.formatCurrency(c.totalPurchases) + '</td>' +
            '<td class="num">' + App.badge(c.loyaltyPoints + ' pts', 'info') + '</td>' +
            '<td>' + App.badge(c.status === 'active' ? 'Active' : 'Inactive', c.status === 'active' ? 'success' : 'muted') + '</td>' +
            '<td><div class="row-actions">' +
            '<button class="act-btn" data-act="view" data-id="' + c.id + '" title="View">' + App.icon('eye') + '</button>' +
            '<button class="act-btn act-btn--primary" data-act="edit" data-id="' + c.id + '" title="Edit">' + App.icon('edit') + '</button>' +
            '<button class="act-btn act-btn--danger" data-act="delete" data-id="' + c.id + '" title="Delete">' + App.icon('trash') + '</button>' +
            '</div></td></tr>'
        )
        .join('');
    }
    App.renderPagination($('pagination'), info, (pg) => { state.page = pg; render(); });
  }

  function fields(c) {
    c = c || {};
    return [
      { name: 'name', label: 'Customer Name', value: c.name, required: true, colSpan: 2 },
      { name: 'phone', label: 'Phone', type: 'tel', phone: true, value: c.phone, required: true },
      { name: 'email', label: 'Email', type: 'email', value: c.email },
      { name: 'loyaltyPoints', label: 'Loyalty Points', type: 'number', value: c.loyaltyPoints != null ? c.loyaltyPoints : 0, min: 0 },
      { name: 'status', label: 'Status', type: 'select', value: c.status || 'active', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
      { name: 'address', label: 'Address', type: 'textarea', value: c.address, colSpan: 2 },
    ];
  }

  function openForm(cust) {
    const isEdit = !!cust;
    const fb = App.buildForm(fields(cust));
    const foot = document.createElement('div');
    foot.innerHTML = '<button class="btn btn--ghost" data-x>Cancel</button><button class="btn btn--primary" data-save>' + (isEdit ? 'Save Changes' : 'Add Customer') + '</button>';
    const modal = App.openModal({ title: isEdit ? 'Edit Customer' : 'Add Customer', body: fb.form, footer: foot, size: 'lg' });
    foot.querySelector('[data-x]').addEventListener('click', modal.close);
    foot.querySelector('[data-save]').addEventListener('click', () => {
      const res = fb.validate();
      if (!res.valid) return;
      const v = res.values;
      v.loyaltyPoints = Number(v.loyaltyPoints) || 0;
      if (isEdit) { DB.updateData('customers', cust.id, v); App.toast('Customer updated', 'success'); }
      else {
        DB.insert('customers', Object.assign({ id: DB.nextId('customers', 'CUST-', 4), totalPurchases: 0, registrationDate: new Date().toISOString() }, v));
        App.toast('Customer added', 'success');
      }
      modal.close();
      render();
    });
  }

  function openView(c) {
    const hist = ordersOf(c.id);
    const rows = [['ID', c.id], ['Name', c.name], ['Phone', c.phone || '—'], ['Email', c.email || '—'], ['Total Spent', App.formatCurrency(c.totalPurchases)], ['Loyalty Points', c.loyaltyPoints + ' pts'], ['Registered', App.formatDate(c.registrationDate)], ['Status', c.status]];
    const wrap = document.createElement('div');
    let histHtml;
    if (!hist.length) {
      histHtml = '<div class="empty-state" style="padding:20px"><p>No purchases yet.</p></div>';
    } else {
      histHtml =
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>Invoice</th><th>Date</th><th class="num">Items</th><th class="num">Total</th><th>Status</th></tr></thead><tbody>' +
        hist.slice(0, 10).map((o) => '<tr><td class="mono">' + App.escapeHtml(o.invoiceNo) + '</td><td class="cell-sub">' + App.formatDate(o.date) + '</td><td class="num">' + o.items.length + '</td><td class="num cell-strong">' + App.formatCurrency(o.total) + '</td><td>' + App.badge(o.orderStatus, 'muted') + '</td></tr>').join('') +
        '</tbody></table></div>';
    }
    wrap.innerHTML =
      '<div class="flex center gap-sm" style="margin-bottom:16px"><span class="avatar" style="width:52px;height:52px;background:' + App.colorFor(c.name) + '">' + App.escapeHtml(App.initials(c.name)) + '</span><div><h3 style="font-size:18px">' + App.escapeHtml(c.name) + '</h3><div class="text-muted">' + App.escapeHtml(c.phone || '') + '</div></div></div>' +
      '<div class="detail-list">' + rows.map((r) => '<div class="detail-item"><label>' + App.escapeHtml(r[0]) + '</label><div>' + App.escapeHtml(String(r[1])) + '</div></div>').join('') + '</div>' +
      '<h4 style="margin:18px 0 8px">Purchase history</h4>' + histHtml;
    App.openModal({ title: 'Customer Details', body: wrap, size: 'lg' });
  }

  async function del(c) {
    const ok = await App.confirmDialog({ title: 'Delete customer?', message: 'Delete "' + c.name + '"?', confirmText: 'Delete', danger: true });
    if (!ok) return;
    DB.deleteData('customers', c.id);
    App.toast('Customer deleted', 'success');
    render();
  }

  function init() {
    render();
    $('search').addEventListener('input', (e) => { state.search = e.target.value; state.page = 1; render(); });
    App.registerSearch((v) => { $('search').value = v; state.search = v; state.page = 1; render(); });
    $('filterStatus').addEventListener('change', (e) => { state.status = e.target.value; state.page = 1; render(); });
    $('addBtn').addEventListener('click', () => openForm(null));
    $('exportBtn').addEventListener('click', () => {
      const rows = filtered().map((c) => [c.id, c.name, c.phone, c.email, c.totalPurchases, c.loyaltyPoints, c.status]);
      App.exportCsv('customers.csv', ['ID', 'Name', 'Phone', 'Email', 'TotalSpent', 'Points', 'Status'], rows);
      App.toast('Customers exported', 'success');
    });
    document.querySelectorAll('th.sortable').forEach((th) => th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else { state.sortKey = key; state.sortDir = 'asc'; }
      render();
    }));
    $('tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const c = DB.findById('customers', btn.getAttribute('data-id'));
      if (!c) return;
      const act = btn.getAttribute('data-act');
      if (act === 'view') openView(c);
      else if (act === 'edit') openForm(c);
      else del(c);
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
