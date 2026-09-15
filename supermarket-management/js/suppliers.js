/* =============================================================
   suppliers.js — supplier CRUD + details / purchase history
   ============================================================= */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let state = { search: '', status: '', sortKey: 'name', sortDir: 'asc', page: 1, perPage: 10 };

  function filtered() {
    let list = DB.getData('suppliers', []);
    const q = state.search.toLowerCase();
    if (q) list = list.filter((s) => (s.name + ' ' + s.contactPerson + ' ' + s.gst + ' ' + s.email).toLowerCase().includes(q));
    if (state.status) list = list.filter((s) => s.status === state.status);
    return App.sortRows(list, state.sortKey, state.sortDir);
  }

  function render() {
    const info = App.paginate(filtered(), state.page, state.perPage);
    state.page = info.page;
    const tbody = $('tbody');
    if (!info.rows.length) {
      tbody.innerHTML = App.emptyRow(7, 'No suppliers found');
    } else {
      tbody.innerHTML = info.rows
        .map(
          (s) =>
            '<tr>' +
            '<td class="mono cell-sub">' + App.escapeHtml(s.id) + '</td>' +
            '<td class="cell-product"><span class="thumb" style="background:' + App.colorFor(s.name) + '">' + App.escapeHtml(App.initials(s.name)) + '</span><span class="cell-strong">' + App.escapeHtml(s.name) + '</span></td>' +
            '<td>' + App.escapeHtml(s.contactPerson) + '</td>' +
            '<td class="cell-sub">' + App.escapeHtml(s.phone) + '</td>' +
            '<td class="mono cell-sub">' + App.escapeHtml(s.gst || '—') + '</td>' +
            '<td>' + App.badge(s.status === 'active' ? 'Active' : 'Inactive', s.status === 'active' ? 'success' : 'muted') + '</td>' +
            '<td><div class="row-actions">' +
            '<button class="act-btn" data-act="view" data-id="' + s.id + '" title="View">' + App.icon('eye') + '</button>' +
            '<button class="act-btn act-btn--primary" data-act="edit" data-id="' + s.id + '" title="Edit">' + App.icon('edit') + '</button>' +
            '<button class="act-btn act-btn--danger" data-act="delete" data-id="' + s.id + '" title="Delete">' + App.icon('trash') + '</button>' +
            '</div></td></tr>'
        )
        .join('');
    }
    App.renderPagination($('pagination'), info, (pg) => { state.page = pg; render(); });
  }

  function fields(s) {
    s = s || {};
    return [
      { name: 'name', label: 'Supplier Name', value: s.name, required: true, colSpan: 2 },
      { name: 'contactPerson', label: 'Contact Person', value: s.contactPerson, required: true },
      { name: 'phone', label: 'Phone', type: 'tel', phone: true, value: s.phone, required: true },
      { name: 'email', label: 'Email', type: 'email', value: s.email },
      { name: 'gst', label: 'GST Number', value: s.gst },
      { name: 'address', label: 'Address', type: 'textarea', value: s.address, colSpan: 2 },
      { name: 'status', label: 'Status', type: 'select', value: s.status || 'active', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
    ];
  }

  function openForm(supplier) {
    const isEdit = !!supplier;
    const fb = App.buildForm(fields(supplier));
    const foot = document.createElement('div');
    foot.innerHTML = '<button class="btn btn--ghost" data-x>Cancel</button><button class="btn btn--primary" data-save>' + (isEdit ? 'Save Changes' : 'Add Supplier') + '</button>';
    const modal = App.openModal({ title: isEdit ? 'Edit Supplier' : 'Add Supplier', body: fb.form, footer: foot, size: 'lg' });
    foot.querySelector('[data-x]').addEventListener('click', modal.close);
    foot.querySelector('[data-save]').addEventListener('click', () => {
      const res = fb.validate();
      if (!res.valid) return;
      if (isEdit) { DB.updateData('suppliers', supplier.id, res.values); App.toast('Supplier updated', 'success'); }
      else { DB.insert('suppliers', Object.assign({ id: DB.nextId('suppliers', 'SUP-', 2), createdAt: new Date().toISOString() }, res.values)); App.toast('Supplier added', 'success'); }
      modal.close();
      render();
    });
  }

  function openView(s) {
    const rows = [['ID', s.id], ['Supplier', s.name], ['Contact Person', s.contactPerson], ['Phone', s.phone], ['Email', s.email || '—'], ['GST', s.gst || '—'], ['Status', s.status], ['Registered', App.formatDate(s.createdAt)]];
    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="detail-list">' + rows.map((r) => '<div class="detail-item"><label>' + App.escapeHtml(r[0]) + '</label><div>' + App.escapeHtml(String(r[1])) + '</div></div>').join('') +
      '<div class="detail-item col-2"><label>Address</label><div>' + App.escapeHtml(s.address || '—') + '</div></div></div>' +
      '<h4 style="margin:18px 0 8px">Purchase history</h4>' +
      '<div class="empty-state" style="padding:20px"><p>No purchase orders recorded for this supplier yet.</p></div>';
    App.openModal({ title: 'Supplier Details', body: wrap, size: 'lg' });
  }

  async function del(s) {
    const ok = await App.confirmDialog({ title: 'Delete supplier?', message: 'Delete "' + s.name + '"?', confirmText: 'Delete', danger: true });
    if (!ok) return;
    DB.deleteData('suppliers', s.id);
    App.toast('Supplier deleted', 'success');
    render();
  }

  function init() {
    render();
    $('search').addEventListener('input', (e) => { state.search = e.target.value; state.page = 1; render(); });
    App.registerSearch((v) => { $('search').value = v; state.search = v; state.page = 1; render(); });
    $('filterStatus').addEventListener('change', (e) => { state.status = e.target.value; state.page = 1; render(); });
    $('addBtn').addEventListener('click', () => openForm(null));
    document.querySelectorAll('th.sortable').forEach((th) => th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else { state.sortKey = key; state.sortDir = 'asc'; }
      render();
    }));
    $('tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const s = DB.findById('suppliers', btn.getAttribute('data-id'));
      if (!s) return;
      const act = btn.getAttribute('data-act');
      if (act === 'view') openView(s);
      else if (act === 'edit') openForm(s);
      else del(s);
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
