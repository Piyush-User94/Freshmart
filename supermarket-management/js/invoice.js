/* =============================================================
   invoice.js — shared printable invoice builder (window.Invoice)
   ============================================================= */
window.Invoice = (function () {
  'use strict';

  function build(order) {
    const s = DB.getSettings();
    const cust = order.customerName || 'Walk-in Customer';
    const rows = order.items
      .map(
        (it) =>
          '<tr><td>' + App.escapeHtml(it.name) + '</td>' +
          '<td class="num">' + it.qty + '</td>' +
          '<td class="num">' + App.formatCurrency(it.price) + '</td>' +
          '<td class="num">' + App.formatCurrency(it.discount || 0) + '</td>' +
          '<td class="num">' + App.formatCurrency(it.tax || 0) + '</td>' +
          '<td class="num">' + App.formatCurrency(it.total) + '</td></tr>'
      )
      .join('');

    return (
      '<div class="invoice" id="invoiceRoot">' +
      '<div class="invoice__head">' +
      '<div class="invoice__store"><h2>' + App.escapeHtml(s.storeName) + '</h2>' +
      '<p>' + App.escapeHtml(s.storeAddress) + '</p>' +
      '<p>' + App.escapeHtml(s.phone) + ' · ' + App.escapeHtml(s.email) + '</p>' +
      '<p>GSTIN: ' + App.escapeHtml(s.gst) + '</p></div>' +
      '<div class="invoice__meta"><h3>Invoice</h3>' +
      '<p><b>' + App.escapeHtml(order.invoiceNo) + '</b></p>' +
      '<p>' + App.formatDate(order.date, true) + '</p></div>' +
      '</div>' +
      '<div class="invoice__parties">' +
      '<div><label>Billed To</label><b>' + App.escapeHtml(cust) + '</b></div>' +
      '<div style="text-align:right"><label>Payment</label><b>' + App.escapeHtml(order.paymentMethod) + ' · ' + App.escapeHtml(order.paymentStatus) + '</b></div>' +
      '</div>' +
      '<table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Disc</th><th class="num">Tax</th><th class="num">Amount</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<div class="invoice__totals">' +
      '<div class="row"><span>Subtotal</span><span>' + App.formatCurrency(order.subtotal) + '</span></div>' +
      '<div class="row"><span>Discount</span><span>− ' + App.formatCurrency(order.discount) + '</span></div>' +
      '<div class="row"><span>Tax</span><span>' + App.formatCurrency(order.tax) + '</span></div>' +
      '<div class="row grand"><span>Grand Total</span><span>' + App.formatCurrency(order.total) + '</span></div>' +
      '</div>' +
      '<div class="invoice__foot">Thank you for shopping with ' + App.escapeHtml(s.storeName) + '! · This is a computer-generated invoice.</div>' +
      '</div>'
    );
  }

  function show(order) {
    const wrap = document.createElement('div');
    wrap.innerHTML = build(order);
    const foot = document.createElement('div');
    foot.className = 'no-print';
    foot.innerHTML = '<button class="btn btn--ghost" data-x>Close</button><button class="btn btn--primary" data-print>Print Invoice</button>';
    const modal = App.openModal({ title: 'Invoice ' + order.invoiceNo, body: wrap, footer: foot, size: 'lg' });
    foot.querySelector('[data-x]').addEventListener('click', modal.close);
    foot.querySelector('[data-print]').addEventListener('click', () => window.print());
    return modal;
  }

  return { build: build, show: show };
})();
