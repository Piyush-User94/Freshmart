/* =============================================================
   orders.js — order list, view, cancel, refund, print invoice
   ============================================================= */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let state = { search: '', status: '', pay: '', page: 1, perPage: 10 };
  const STATUS_KIND = { Completed: 'success', Processing: 'info', Pending: 'warning', Cancelled: 'muted', Refunded: 'danger' };
  const PAY_KIND = { Cash: 'success', UPI: 'secondary', Card: 'info', Other: 'muted' };

  function filtered() {
    let list = DB.getData('orders', []);
    const q = state.search.toLowerCase();
    if (q) list = list.filter((o) => (o.invoiceNo + ' ' + o.customerName).toLowerCase().includes(q));
    if (state.status) list = list.filter((o) => o.orderStatus === state.status);
    if (state.pay) list = list.filter((o) => o.paymentMethod === state.pay);
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function render() {
    const info = App.paginate(filtered(), state.page, state.perPage);
    state.page = info.page;
    const tbody = $('tbody');
    if (!info.rows.length) {
      tbody.innerHTML = App.emptyRow(8, 'No orders found');
    } else {
      tbody.innerHTML = info.rows
        .map((o) => {
          const canCancel = o.orderStatus === 'Pending' || o.orderStatus === 'Processing';
          const canRefund = o.orderStatus === 'Completed';
          return (
            '<tr>' +
            '<td class="cell-strong mono">' + App.escapeHtml(o.invoiceNo) + '</td>' +
            '<td>' + App.escapeHtml(o.customerName) + '</td>' +
            '<td class="cell-sub">' + App.formatDate(o.date) + '</td>' +
            '<td class="num">' + o.items.length + '</td>' +
            '<td class="num cell-strong">' + App.formatCurrency(o.total) + '</td>' +
            '<td>' + App.badge(o.paymentMethod, PAY_KIND[o.paymentMethod] || 'muted') + '</td>' +
            '<td>' + App.badge(o.orderStatus, STATUS_KIND[o.orderStatus] || 'muted') + '</td>' +
            '<td><div class="row-actions">' +
            '<button class="act-btn" data-act="view" data-id="' + o.id + '" title="View">' + App.icon('eye') + '</button>' +
            '<button class="act-btn" data-act="print" data-id="' + o.id + '" title="Print invoice">' + App.icon('print') + '</button>' +
            (canCancel ? '<button class="act-btn act-btn--danger" data-act="cancel" data-id="' + o.id + '" title="Cancel order">' + App.icon('close') + '</button>' : '') +
            (canRefund ? '<button class="act-btn act-btn--danger" data-act="refund" data-id="' + o.id + '" title="Refund order">' + App.icon('rupee') + '</button>' : '') +
            '</div></td></tr>'
          );
        })
        .join('');
    }
    App.renderPagination($('pagination'), info, (pg) => { state.page = pg; render(); });
  }

  function openView(o) {
    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="detail-list">' +
      [['Order ID', o.id], ['Invoice', o.invoiceNo], ['Customer', o.customerName], ['Date', App.formatDate(o.date, true)], ['Payment Method', o.paymentMethod], ['Payment Status', o.paymentStatus], ['Order Status', o.orderStatus], ['Items', o.items.length + ' products']]
        .map((r) => '<div class="detail-item"><label>' + App.escapeHtml(r[0]) + '</label><div>' + App.escapeHtml(String(r[1])) + '</div></div>')
        .join('') +
      '</div>' +
      '<h4 style="margin:18px 0 8px">Order items</h4>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th></tr></thead><tbody>' +
      o.items.map((it) => '<tr><td>' + App.escapeHtml(it.name) + '</td><td class="num">' + it.qty + '</td><td class="num">' + App.formatCurrency(it.price) + '</td><td class="num cell-strong">' + App.formatCurrency(it.total) + '</td></tr>').join('') +
      '</tbody></table></div>' +
      '<div class="pos-summary" style="margin-top:16px">' +
      '<div class="pos-summary__row"><span>Subtotal</span><span class="mono">' + App.formatCurrency(o.subtotal) + '</span></div>' +
      '<div class="pos-summary__row"><span>Discount</span><span class="mono">− ' + App.formatCurrency(o.discount) + '</span></div>' +
      '<div class="pos-summary__row"><span>Tax</span><span class="mono">' + App.formatCurrency(o.tax) + '</span></div>' +
      '<div class="pos-summary__row total"><span>Total</span><span class="mono">' + App.formatCurrency(o.total) + '</span></div></div>';
    const foot = document.createElement('div');
    foot.innerHTML = '<button class="btn btn--ghost" data-x>Close</button><button class="btn btn--primary" data-print>Print Invoice</button>';
    const modal = App.openModal({ title: 'Order ' + o.invoiceNo, body: wrap, footer: foot, size: 'lg' });
    foot.querySelector('[data-x]').addEventListener('click', modal.close);
    foot.querySelector('[data-print]').addEventListener('click', () => { modal.close(); Invoice.show(o); });
  }

  function restock(o) {
    o.items.forEach((it) => {
      const p = DB.findById('products', it.productId);
      if (p) {
        const ns = p.stock + it.qty;
        DB.updateData('products', p.id, { stock: ns });
        DB.logInventory({ productId: p.id, name: p.name, type: 'return (' + o.invoiceNo + ')', change: it.qty, stock: ns, at: new Date().toISOString(), by: 'System' });
      }
    });
  }

  async function cancel(o) {
    const ok = await App.confirmDialog({ title: 'Cancel order?', message: 'Cancel ' + o.invoiceNo + '? Stock for its items will be returned to inventory.', confirmText: 'Cancel Order', danger: true });
    if (!ok) return;
    restock(o);
    DB.updateData('orders', o.id, { orderStatus: 'Cancelled', paymentStatus: 'Cancelled' });
    App.toast('Order ' + o.invoiceNo + ' cancelled', 'success');
    render();
    App.refreshNotifications();
  }

  async function refund(o) {
    const ok = await App.confirmDialog({ title: 'Refund order?', message: 'Refund ' + o.invoiceNo + ' (' + App.formatCurrency(o.total) + ')? Stock will be returned to inventory.', confirmText: 'Refund', danger: true });
    if (!ok) return;
    restock(o);
    DB.updateData('orders', o.id, { orderStatus: 'Refunded', paymentStatus: 'Refunded' });
    // Adjust customer total
    const c = DB.findById('customers', o.customerId);
    if (c) DB.updateData('customers', c.id, { totalPurchases: Math.max(0, c.totalPurchases - o.total) });
    App.toast('Order ' + o.invoiceNo + ' refunded', 'success');
    render();
    App.refreshNotifications();
  }

  function init() {
    render();
    $('search').addEventListener('input', (e) => { state.search = e.target.value; state.page = 1; render(); });
    App.registerSearch((v) => { $('search').value = v; state.search = v; state.page = 1; render(); });
    $('filterStatus').addEventListener('change', (e) => { state.status = e.target.value; state.page = 1; render(); });
    $('filterPay').addEventListener('change', (e) => { state.pay = e.target.value; state.page = 1; render(); });
    $('exportBtn').addEventListener('click', () => {
      const rows = filtered().map((o) => [o.invoiceNo, o.customerName, o.date, o.items.length, o.subtotal, o.discount, o.tax, o.total, o.paymentMethod, o.orderStatus]);
      App.exportCsv('orders.csv', ['Invoice', 'Customer', 'Date', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total', 'Payment', 'Status'], rows);
      App.toast('Orders exported', 'success');
    });
    $('tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const o = DB.findById('orders', btn.getAttribute('data-id'));
      if (!o) return;
      const act = btn.getAttribute('data-act');
      if (act === 'view') openView(o);
      else if (act === 'print') Invoice.show(o);
      else if (act === 'cancel') cancel(o);
      else if (act === 'refund') refund(o);
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
