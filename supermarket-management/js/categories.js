/* =============================================================
   categories.js — category CRUD with product counts
   ============================================================= */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let state = { search: '', status: '', sortKey: 'name', sortDir: 'asc', page: 1, perPage: 10 };

  function counts() {
    const map = {};
    DB.getData('products', []).forEach((p) => (map[p.categoryId] = (map[p.categoryId] || 0) + 1));
    return map;
  }

  function filtered() {
    let list = DB.getData('categories', []);
    const q = state.search.toLowerCase();
    if (q) list = list.filter((c) => (c.name + ' ' + c.description).toLowerCase().includes(q));
    if (state.status) list = list.filter((c) => c.status === state.status);
    return App.sortRows(list, state.sortKey, state.sortDir);
  }

  function render() {
    const cmap = counts();
    const info = App.paginate(filtered(), state.page, state.perPage);
    state.page = info.page;
    const tbody = $('tbody');
    if (!info.rows.length) {
      tbody.innerHTML = App.emptyRow(6, 'No categories found');
    } else {
      tbody.innerHTML = info.rows
        .map(
          (c) =>
            '<tr>' +
            '<td class="mono cell-sub">' + App.escapeHtml(c.id) + '</td>' +
            '<td class="cell-strong">' + App.escapeHtml(c.name) + '</td>' +
            '<td class="cell-sub">' + App.escapeHtml(c.description || '—') + '</td>' +
            '<td class="num">' + App.badge((cmap[c.id] || 0) + ' items', 'secondary') + '</td>' +
            '<td>' + App.badge(c.status === 'active' ? 'Active' : 'Inactive', c.status === 'active' ? 'success' : 'muted') + '</td>' +
            '<td><div class="row-actions">' +
            '<button class="act-btn act-btn--primary" data-act="edit" data-id="' + c.id + '" title="Edit">' + App.icon('edit') + '</button>' +
            '<button class="act-btn act-btn--danger" data-act="delete" data-id="' + c.id + '" title="Delete">' + App.icon('trash') + '</button>' +
            '</div></td></tr>'
        )
        .join('');
    }
    App.renderPagination($('pagination'), info, (pg) => { state.page = pg; render(); });
  }

  function openForm(cat) {
    const isEdit = !!cat;
    cat = cat || {};
    const fb = App.buildForm([
      { name: 'name', label: 'Category Name', value: cat.name, required: true, colSpan: 2,
        validate: (v) => {
          const dup = DB.getData('categories', []).find((x) => x.name.toLowerCase() === String(v).toLowerCase() && x.id !== cat.id);
          return dup ? 'A category with this name exists' : '';
        } },
      { name: 'description', label: 'Description', type: 'textarea', value: cat.description, colSpan: 2 },
      { name: 'status', label: 'Status', type: 'select', value: cat.status || 'active', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
    ]);
    const foot = document.createElement('div');
    foot.innerHTML = '<button class="btn btn--ghost" data-x>Cancel</button><button class="btn btn--primary" data-save>' + (isEdit ? 'Save Changes' : 'Add Category') + '</button>';
    const modal = App.openModal({ title: isEdit ? 'Edit Category' : 'Add Category', body: fb.form, footer: foot });
    foot.querySelector('[data-x]').addEventListener('click', modal.close);
    foot.querySelector('[data-save]').addEventListener('click', () => {
      const res = fb.validate();
      if (!res.valid) return;
      if (isEdit) {
        DB.updateData('categories', cat.id, res.values);
        App.toast('Category updated', 'success');
      } else {
        DB.insert('categories', Object.assign({ id: DB.nextId('categories', 'CAT-', 2), createdAt: new Date().toISOString() }, res.values));
        App.toast('Category added', 'success');
      }
      modal.close();
      render();
    });
  }

  async function del(cat) {
    const n = counts()[cat.id] || 0;
    if (n > 0) {
      App.toast('Cannot delete: ' + n + ' product(s) use this category', 'error');
      return;
    }
    const ok = await App.confirmDialog({ title: 'Delete category?', message: 'Delete "' + cat.name + '"?', confirmText: 'Delete', danger: true });
    if (!ok) return;
    DB.deleteData('categories', cat.id);
    App.toast('Category deleted', 'success');
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
      const c = DB.findById('categories', btn.getAttribute('data-id'));
      if (!c) return;
      if (btn.getAttribute('data-act') === 'edit') openForm(c);
      else del(c);
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
