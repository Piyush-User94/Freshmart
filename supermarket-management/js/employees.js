/* =============================================================
   employees.js — employee CRUD + activate/deactivate
   ============================================================= */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const ROLES = ['Admin', 'Manager', 'Cashier', 'Inventory Staff'];
  const ROLE_KIND = { Admin: 'danger', Manager: 'secondary', Cashier: 'info', 'Inventory Staff': 'muted' };
  let state = { search: '', role: '', status: '', sortKey: 'name', sortDir: 'asc', page: 1, perPage: 10 };

  function filtered() {
    let list = DB.getData('employees', []);
    const q = state.search.toLowerCase();
    if (q) list = list.filter((e) => (e.name + ' ' + e.email + ' ' + e.phone).toLowerCase().includes(q));
    if (state.role) list = list.filter((e) => e.role === state.role);
    if (state.status) list = list.filter((e) => e.status === state.status);
    return App.sortRows(list, state.sortKey, state.sortDir);
  }

  function render() {
    const info = App.paginate(filtered(), state.page, state.perPage);
    state.page = info.page;
    const tbody = $('tbody');
    if (!info.rows.length) {
      tbody.innerHTML = App.emptyRow(8, 'No employees found');
    } else {
      tbody.innerHTML = info.rows
        .map((e) => {
          const active = e.status === 'active';
          return (
            '<tr>' +
            '<td class="mono cell-sub">' + App.escapeHtml(e.id) + '</td>' +
            '<td class="cell-product"><span class="avatar avatar--sm" style="background:' + App.colorFor(e.name) + '">' + App.escapeHtml(App.initials(e.name)) + '</span><div><div class="cell-strong">' + App.escapeHtml(e.name) + '</div><div class="cell-sub">' + App.escapeHtml(e.email) + '</div></div></td>' +
            '<td>' + App.badge(e.role, ROLE_KIND[e.role] || 'muted') + '</td>' +
            '<td class="cell-sub">' + App.escapeHtml(e.phone) + '</td>' +
            '<td class="num cell-strong">' + App.formatCurrency(e.salary) + '</td>' +
            '<td class="cell-sub">' + App.formatDate(e.joiningDate) + '</td>' +
            '<td>' + App.badge(active ? 'Active' : 'Inactive', active ? 'success' : 'muted') + '</td>' +
            '<td><div class="row-actions">' +
            '<button class="act-btn" data-act="toggle" data-id="' + e.id + '" title="' + (active ? 'Deactivate' : 'Activate') + '">' + App.icon(active ? 'close' : 'check') + '</button>' +
            '<button class="act-btn act-btn--primary" data-act="edit" data-id="' + e.id + '" title="Edit">' + App.icon('edit') + '</button>' +
            '<button class="act-btn act-btn--danger" data-act="delete" data-id="' + e.id + '" title="Delete">' + App.icon('trash') + '</button>' +
            '</div></td></tr>'
          );
        })
        .join('');
    }
    App.renderPagination($('pagination'), info, (pg) => { state.page = pg; render(); });
  }

  function fields(emp) {
    emp = emp || {};
    return [
      { name: 'name', label: 'Full Name', value: emp.name, required: true, colSpan: 2 },
      { name: 'email', label: 'Email', type: 'email', value: emp.email, required: true },
      { name: 'phone', label: 'Phone', type: 'tel', phone: true, value: emp.phone, required: true },
      { name: 'role', label: 'Role', type: 'select', value: emp.role || 'Cashier', options: ROLES.map((r) => ({ value: r, label: r })) },
      { name: 'salary', label: 'Monthly Salary (₹)', type: 'number', value: emp.salary, required: true, min: 0 },
      { name: 'joiningDate', label: 'Joining Date', type: 'date', value: emp.joiningDate, required: true },
      { name: 'status', label: 'Status', type: 'select', value: emp.status || 'active', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
    ];
  }

  function openForm(emp) {
    const isEdit = !!emp;
    const fb = App.buildForm(fields(emp));
    const foot = document.createElement('div');
    foot.innerHTML = '<button class="btn btn--ghost" data-x>Cancel</button><button class="btn btn--primary" data-save>' + (isEdit ? 'Save Changes' : 'Add Employee') + '</button>';
    const modal = App.openModal({ title: isEdit ? 'Edit Employee' : 'Add Employee', body: fb.form, footer: foot, size: 'lg' });
    foot.querySelector('[data-x]').addEventListener('click', modal.close);
    foot.querySelector('[data-save]').addEventListener('click', () => {
      const res = fb.validate();
      if (!res.valid) return;
      const v = res.values;
      v.salary = Number(v.salary);
      if (isEdit) { DB.updateData('employees', emp.id, v); App.toast('Employee updated', 'success'); }
      else { DB.insert('employees', Object.assign({ id: DB.nextId('employees', 'EMP-', 2) }, v)); App.toast('Employee added', 'success'); }
      modal.close();
      render();
    });
  }

  async function del(e) {
    const ok = await App.confirmDialog({ title: 'Delete employee?', message: 'Delete "' + e.name + '"?', confirmText: 'Delete', danger: true });
    if (!ok) return;
    DB.deleteData('employees', e.id);
    App.toast('Employee deleted', 'success');
    render();
  }

  function init() {
    render();
    $('search').addEventListener('input', (e) => { state.search = e.target.value; state.page = 1; render(); });
    App.registerSearch((v) => { $('search').value = v; state.search = v; state.page = 1; render(); });
    $('filterRole').addEventListener('change', (e) => { state.role = e.target.value; state.page = 1; render(); });
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
      const emp = DB.findById('employees', btn.getAttribute('data-id'));
      if (!emp) return;
      const act = btn.getAttribute('data-act');
      if (act === 'edit') openForm(emp);
      else if (act === 'delete') del(emp);
      else if (act === 'toggle') {
        DB.updateData('employees', emp.id, { status: emp.status === 'active' ? 'inactive' : 'active' });
        App.toast(emp.name + (emp.status === 'active' ? ' deactivated' : ' activated'), 'success');
        render();
      }
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
