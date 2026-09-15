/* =============================================================
   products.js — full product CRUD, search, sort, filter, paginate
   ============================================================= */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let state = { search: '', category: '', status: '', sortKey: 'name', sortDir: 'asc', page: 1, perPage: 10 };

  function categories() {
    return DB.getData('categories', []);
  }
  function catName(id) {
    const c = categories().find((x) => x.id === id);
    return c ? c.name : '—';
  }

  function filtered() {
    let list = DB.getData('products', []);
    const q = state.search.toLowerCase();
    if (q) list = list.filter((p) => (p.name + ' ' + p.sku + ' ' + p.brand).toLowerCase().includes(q));
    if (state.category) list = list.filter((p) => p.categoryId === state.category);
    if (state.status) list = list.filter((p) => App.stockStatus(p).label === state.status);
    return App.sortRows(list, state.sortKey, state.sortDir);
  }

  function render() {
    const list = filtered();
    const info = App.paginate(list, state.page, state.perPage);
    state.page = info.page;
    const tbody = $('tbody');

    if (!info.rows.length) {
      tbody.innerHTML = App.emptyRow(9, 'No products match your filters');
    } else {
      tbody.innerHTML = info.rows
        .map((p) => {
          const st = App.stockStatus(p);
          return (
            '<tr>' +
            '<td class="mono cell-sub">' + App.escapeHtml(p.id) + '</td>' +
            '<td><span class="thumb" style="background:' + App.colorFor(p.name) + '">' + App.escapeHtml(App.initials(p.name)) + '</span></td>' +
            '<td class="cell-product"><div><div class="cell-strong">' + App.escapeHtml(p.name) + '</div><div class="cell-sub">' + App.escapeHtml(p.brand) + '</div></div></td>' +
            '<td>' + App.escapeHtml(catName(p.categoryId)) + '</td>' +
            '<td class="mono cell-sub">' + App.escapeHtml(p.sku) + '</td>' +
            '<td class="num cell-strong">' + App.formatCurrency(p.sellingPrice) + '</td>' +
            '<td class="num">' + p.stock + ' <span class="cell-sub">' + App.escapeHtml(p.unit) + '</span></td>' +
            '<td>' + App.badge(st.label, st.kind) + '</td>' +
            '<td><div class="row-actions">' +
            actBtn('eye', 'view', p.id, 'View') +
            actBtn('edit', 'edit', p.id, 'Edit', 'primary') +
            actBtn('trash', 'delete', p.id, 'Delete', 'danger') +
            '</div></td></tr>'
          );
        })
        .join('');
    }
    App.renderPagination($('pagination'), info, (pg) => {
      state.page = pg;
      render();
    });
    updateSortIndicators();
  }

  function actBtn(icon, act, id, label, variant) {
    return (
      '<button class="act-btn' + (variant ? ' act-btn--' + variant : '') + '" data-act="' + act + '" data-id="' + id + '" title="' + label + '" aria-label="' + label + '">' +
      App.icon(icon) + '</button>'
    );
  }

  function updateSortIndicators() {
    document.querySelectorAll('th.sortable').forEach((th) => {
      const key = th.getAttribute('data-sort');
      const base = th.textContent.replace(/[▲▼]/g, '').trim();
      th.innerHTML = base + (state.sortKey === key ? (state.sortDir === 'asc' ? ' ▲' : ' ▼') : '');
    });
  }

  /* ---------- Category options ---------- */
  function fillCategoryFilter() {
    const sel = $('filterCategory');
    sel.innerHTML = '<option value="">All categories</option>' + categories().map((c) => '<option value="' + c.id + '">' + App.escapeHtml(c.name) + '</option>').join('');
  }

  /* ---------- Product form ---------- */
  function productFields(p) {
    p = p || {};
    const catOpts = categories().map((c) => ({ value: c.id, label: c.name }));
    return [
      { name: 'name', label: 'Product Name', value: p.name, required: true, colSpan: 2, placeholder: 'e.g. Amul Taaza Milk 1L' },
      { name: 'sku', label: 'SKU', value: p.sku, required: true, placeholder: 'SKU-1001',
        validate: (v) => {
          const dup = DB.getData('products', []).find((x) => x.sku.toLowerCase() === String(v).toLowerCase() && x.id !== p.id);
          return dup ? 'This SKU already exists' : '';
        } },
      { name: 'barcode', label: 'Barcode', value: p.barcode, placeholder: '890...' },
      { name: 'categoryId', label: 'Category', type: 'select', value: p.categoryId, required: true, options: catOpts },
      { name: 'brand', label: 'Brand', value: p.brand, placeholder: 'e.g. Amul' },
      { name: 'purchasePrice', label: 'Purchase Price (₹)', type: 'number', value: p.purchasePrice, required: true, min: 0, step: '0.01' },
      { name: 'sellingPrice', label: 'Selling Price (₹)', type: 'number', value: p.sellingPrice, required: true, min: 0, step: '0.01',
        validate: (v, all) => (Number(v) < Number(all.purchasePrice) ? 'Selling price is below purchase price' : '') },
      { name: 'tax', label: 'Tax (%)', type: 'number', value: p.tax != null ? p.tax : 0, min: 0, max: 100, step: '0.01' },
      { name: 'discount', label: 'Discount (%)', type: 'number', value: p.discount != null ? p.discount : 0, min: 0, max: 100, step: '0.01' },
      { name: 'stock', label: 'Stock Quantity', type: 'number', value: p.stock != null ? p.stock : 0, required: true, min: 0 },
      { name: 'minStock', label: 'Minimum Stock', type: 'number', value: p.minStock != null ? p.minStock : 0, required: true, min: 0 },
      { name: 'unit', label: 'Unit', type: 'select', value: p.unit || 'pcs', options: ['pcs', 'kg', 'g', 'L', 'ml', 'pack', 'bag', 'box'].map((u) => ({ value: u, label: u })) },
      { name: 'expiryDate', label: 'Expiry Date', type: 'date', value: p.expiryDate },
      { name: 'image', label: 'Product Image URL', value: p.image, placeholder: 'https://… (optional)', colSpan: 2 },
      { name: 'description', label: 'Description', type: 'textarea', value: p.description, colSpan: 2 },
    ];
  }

  function openForm(product) {
    const isEdit = !!product;
    const fb = App.buildForm(productFields(product));
    const foot = document.createElement('div');
    foot.innerHTML = '<button class="btn btn--ghost" data-x>Cancel</button><button class="btn btn--primary" data-save>' + (isEdit ? 'Save Changes' : 'Add Product') + '</button>';

    const modal = App.openModal({ title: isEdit ? 'Edit Product' : 'Add Product', body: fb.form, footer: foot, size: 'lg' });
    foot.querySelector('[data-x]').addEventListener('click', modal.close);
    foot.querySelector('[data-save]').addEventListener('click', () => {
      const res = fb.validate();
      if (!res.valid) return;
      const v = res.values;
      const record = {
        name: v.name, sku: v.sku, barcode: v.barcode, categoryId: v.categoryId, brand: v.brand,
        purchasePrice: Number(v.purchasePrice), sellingPrice: Number(v.sellingPrice),
        tax: Number(v.tax) || 0, discount: Number(v.discount) || 0,
        stock: Number(v.stock), minStock: Number(v.minStock), unit: v.unit,
        expiryDate: v.expiryDate, image: v.image, description: v.description, status: 'active',
      };
      if (isEdit) {
        const before = product.stock;
        DB.updateData('products', product.id, record);
        if (Number(v.stock) !== before) {
          DB.logInventory({ productId: product.id, name: v.name, type: 'edit', change: Number(v.stock) - before, stock: Number(v.stock), at: new Date().toISOString(), by: 'Suresh Kumar' });
        }
        App.toast('Product updated successfully', 'success');
      } else {
        record.id = DB.nextId('products', 'P-', 4);
        record.createdAt = new Date().toISOString();
        DB.insert('products', record);
        DB.logInventory({ productId: record.id, name: record.name, type: 'add', change: record.stock, stock: record.stock, at: new Date().toISOString(), by: 'Suresh Kumar' });
        App.toast('Product added successfully', 'success');
      }
      modal.close();
      render();
      App.refreshNotifications();
    });
  }

  function openView(product) {
    const st = App.stockStatus(product);
    const rows = [
      ['Product ID', product.id], ['Name', product.name], ['Brand', product.brand || '—'],
      ['Category', catName(product.categoryId)], ['SKU', product.sku], ['Barcode', product.barcode || '—'],
      ['Purchase Price', App.formatCurrency(product.purchasePrice)], ['Selling Price', App.formatCurrency(product.sellingPrice)],
      ['Tax', product.tax + '%'], ['Discount', product.discount + '%'],
      ['Stock', product.stock + ' ' + product.unit], ['Minimum Stock', product.minStock + ' ' + product.unit],
      ['Expiry Date', App.formatDate(product.expiryDate)], ['Status', st.label],
    ];
    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="flex center gap-sm" style="margin-bottom:16px">' +
      '<span class="thumb" style="width:56px;height:56px;font-size:18px;background:' + App.colorFor(product.name) + '">' + App.escapeHtml(App.initials(product.name)) + '</span>' +
      '<div><h3 style="font-size:18px">' + App.escapeHtml(product.name) + '</h3><div>' + App.badge(st.label, st.kind) + '</div></div></div>' +
      '<div class="detail-list">' +
      rows.map((r) => '<div class="detail-item"><label>' + App.escapeHtml(r[0]) + '</label><div>' + App.escapeHtml(String(r[1])) + '</div></div>').join('') +
      (product.description ? '<div class="detail-item col-2"><label>Description</label><div>' + App.escapeHtml(product.description) + '</div></div>' : '') +
      '</div>';
    App.openModal({ title: 'Product Details', body: wrap, size: 'lg' });
  }

  async function del(product) {
    const ok = await App.confirmDialog({
      title: 'Delete product?',
      message: 'Delete "' + product.name + '"? This action cannot be undone.',
      confirmText: 'Delete', danger: true,
    });
    if (!ok) return;
    DB.deleteData('products', product.id);
    App.toast('Product deleted', 'success');
    render();
    App.refreshNotifications();
  }

  /* ---------- Wiring ---------- */
  function init() {
    fillCategoryFilter();
    render();

    $('search').addEventListener('input', (e) => { state.search = e.target.value; state.page = 1; render(); });
    App.registerSearch((v) => { $('search').value = v; state.search = v; state.page = 1; render(); });
    $('filterCategory').addEventListener('change', (e) => { state.category = e.target.value; state.page = 1; render(); });
    $('filterStatus').addEventListener('change', (e) => { state.status = e.target.value; state.page = 1; render(); });
    $('perPage').addEventListener('change', (e) => { state.perPage = Number(e.target.value); state.page = 1; render(); });
    $('addBtn').addEventListener('click', () => openForm(null));

    $('exportBtn').addEventListener('click', () => {
      const rows = filtered().map((p) => [p.id, p.name, p.brand, catName(p.categoryId), p.sku, p.purchasePrice, p.sellingPrice, p.stock, p.unit, App.stockStatus(p).label]);
      App.exportCsv('products.csv', ['ID', 'Name', 'Brand', 'Category', 'SKU', 'Purchase', 'Selling', 'Stock', 'Unit', 'Status'], rows);
      App.toast('Products exported to CSV', 'success');
    });

    document.querySelectorAll('th.sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortKey = key; state.sortDir = 'asc'; }
        render();
      });
    });

    $('tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const p = DB.findById('products', btn.getAttribute('data-id'));
      if (!p) return;
      const act = btn.getAttribute('data-act');
      if (act === 'view') openView(p);
      else if (act === 'edit') openForm(p);
      else if (act === 'delete') del(p);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
