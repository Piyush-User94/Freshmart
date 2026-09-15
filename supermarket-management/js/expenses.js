/* =============================================================
   expenses.js — expense CRUD + spend summary tiles
   ============================================================= */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const CATS = ['Electricity', 'Rent', 'Salary', 'Transport', 'Maintenance', 'Other'];
  const METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer'];
  let state = { search: '', category: '', sortKey: 'date', sortDir: 'desc', page: 1, perPage: 10 };

  function sameDay(a, b) { return a.toDateString() === b.toDateString(); }
  function sameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }

  function filtered() {
    let list = DB.getData('expenses', []);
    const q = state.search.toLowerCase();
    if (q) list = list.filter((e) => (e.description + ' ' + e.category).toLowerCase().includes(q));
    if (state.category) list = list.filter((e) => e.category === state.category);
    return App.sortRows(list, state.sortKey, state.sortDir);
  }

  function renderStats() {
    const list = DB.getData('expenses', []);
    const now = new Date();
    const total = list.reduce((s, e) => s + e.amount, 0);
    const month = list.filter((e) => sameMonth(new Date(e.date), now)).reduce((s, e) => s + e.amount, 0);
    const today = list.filter((e) => sameDay(new Date(e.date), now)).reduce((s, e) => s + e.amount, 0);
    const tiles = [
      { icon: 'wallet', cls: 'i-red', value: App.formatCurrency(total), label: 'Total expenses (all time)' },
      { icon: 'chart', cls: 'i-amber', value: App.formatCurrency(month), label: 'This month' },
      { icon: 'receipt', cls: 'i-blue', value: App.formatCurrency(today), label: 'Today' },
      { icon: 'tag', cls: 'i-violet', value: list.length, label: 'Recorded entries' },
    ];
    $('miniStats').innerHTML = tiles
      .map((t) => '<div class="mini-stat"><div class="mini-stat__icon ' + t.cls + '">' + App.icon(t.icon) + '</div><div><div class="mini-stat__value">' + t.value + '</div><div class="mini-stat__label">' + t.label + '</div></div></div>')
      .join('');
  }

  function render() {
    renderStats();
    const info = App.paginate(filtered(), state.page, state.perPage);
    state.page = info.page;
    const tbody = $('tbody');
    if (!info.rows.length) {
      tbody.innerHTML = App.emptyRow(8, 'No expenses recorded');
    } else {
      tbody.innerHTML = info.rows
        .map(
          (e) =>
            '<tr>' +
            '<td class="mono cell-sub">' + App.escapeHtml(e.id) + '</td>' +
            '<td>' + App.badge(e.category, 'muted') + '</td>' +
            '<td>' + App.escapeHtml(e.description) + '</td>' +
            '<td class="num cell-strong">' + App.formatCurrency(e.amount) + '</td>' +
            '<td class="cell-sub">' + App.escapeHtml(e.paymentMethod) + '</td>' +
            '<td class="cell-sub">' + App.formatDate(e.date) + '</td>' +
            '<td class="cell-sub">' + App.escapeHtml(e.addedBy || '—') + '</td>' +
            '<td><div class="row-actions">' +
            '<button class="act-btn act-btn--primary" data-act="edit" data-id="' + e.id + '" title="Edit">' + App.icon('edit') + '</button>' +
            '<button class="act-btn act-btn--danger" data-act="delete" data-id="' + e.id + '" title="Delete">' + App.icon('trash') + '</button>' +
            '</div></td></tr>'
        )
        .join('');
    }
    App.renderPagination($('pagination'), info, (pg) => { state.page = pg; render(); });
  }

  function fields(exp) {
    exp = exp || {};
    return [
      { name: 'category', label: 'Category', type: 'select', value: exp.category || 'Other', options: CATS.map((c) => ({ value: c, label: c })) },
      { name: 'amount', label: 'Amount (₹)', type: 'number', value: exp.amount, required: true, min: 1 },
      { name: 'description', label: 'Description', value: exp.description, required: true, colSpan: 2 },
      { name: 'paymentMethod', label: 'Payment Method', type: 'select', value: exp.paymentMethod || 'Cash', options: METHODS.map((m) => ({ value: m, label: m })) },
      { name: 'date', label: 'Date', type: 'date', value: exp.date || new Date().toISOString().slice(0, 10), required: true },
    ];
  }

  function openForm(exp) {
    const isEdit = !!exp;
    const fb = App.buildForm(fields(exp));
    const foot = document.createElement('div');
    foot.innerHTML = '<button class="btn btn--ghost" data-x>Cancel</button><button class="btn btn--primary" data-save>' + (isEdit ? 'Save Changes' : 'Add Expense') + '</button>';
    const modal = App.openModal({ title: isEdit ? 'Edit Expense' : 'Add Expense', body: fb.form, footer: foot });
    foot.querySelector('[data-x]').addEventListener('click', modal.close);
    foot.querySelector('[data-save]').addEventListener('click', () => {
      const res = fb.validate();
      if (!res.valid) return;
      const v = res.values;
      v.amount = Number(v.amount);
      if (isEdit) { DB.updateData('expenses', exp.id, v); App.toast('Expense updated', 'success'); }
      else { DB.insert('expenses', Object.assign({ id: DB.nextId('expenses', 'EXP-', 4), addedBy: 'Suresh Kumar' }, v)); App.toast('Expense added', 'success'); }
      modal.close();
      render();
    });
  }

  async function del(e) {
    const ok = await App.confirmDialog({ title: 'Delete expense?', message: 'Delete this ' + App.formatCurrency(e.amount) + ' expense?', confirmText: 'Delete', danger: true });
    if (!ok) return;
    DB.deleteData('expenses', e.id);
    App.toast('Expense deleted', 'success');
    render();
  }

  function init() {
    render();
    $('search').addEventListener('input', (e) => { state.search = e.target.value; state.page = 1; render(); });
    App.registerSearch((v) => { $('search').value = v; state.search = v; state.page = 1; render(); });
    $('filterCategory').addEventListener('change', (e) => { state.category = e.target.value; state.page = 1; render(); });
    $('addBtn').addEventListener('click', () => openForm(null));
    $('exportBtn').addEventListener('click', () => {
      const rows = filtered().map((e) => [e.id, e.category, e.description, e.amount, e.paymentMethod, e.date, e.addedBy]);
      App.exportCsv('expenses.csv', ['ID', 'Category', 'Description', 'Amount', 'Payment', 'Date', 'AddedBy'], rows);
      App.toast('Expenses exported', 'success');
    });
    document.querySelectorAll('th.sortable').forEach((th) => th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else { state.sortKey = key; state.sortDir = key === 'date' || key === 'amount' ? 'desc' : 'asc'; }
      render();
    }));
    $('tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const exp = DB.findById('expenses', btn.getAttribute('data-id'));
      if (!exp) return;
      if (btn.getAttribute('data-act') === 'edit') openForm(exp);
      else del(exp);
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
