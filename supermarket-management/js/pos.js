/* =============================================================
   pos.js — point-of-sale cart, checkout, stock reduction, invoice
   ============================================================= */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let cart = []; // [{ productId, qty }]
  let payMethod = 'Cash';
  let posSearch = '';
  let activeCat = '';

  /* ---------- Line maths ---------- */
  function lineFor(item) {
    const p = DB.findById('products', item.productId);
    if (!p) return null;
    const base = p.sellingPrice * item.qty;
    const disc = Math.round(base * (p.discount / 100));
    const taxable = base - disc;
    const tax = Math.round(taxable * (p.tax / 100));
    return { product: p, qty: item.qty, base: base, discount: disc, tax: tax, total: taxable + tax };
  }

  function totals() {
    let subtotal = 0, prodDisc = 0, tax = 0;
    cart.forEach((it) => {
      const l = lineFor(it);
      if (!l) return;
      subtotal += l.base;
      prodDisc += l.discount;
      tax += l.tax;
    });
    let extra = Number($('extraDiscount').value) || 0;
    const maxExtra = Math.max(0, subtotal - prodDisc);
    if (extra > maxExtra) extra = maxExtra;
    const discount = prodDisc + extra;
    const total = subtotal - discount + tax;
    return { subtotal: subtotal, prodDisc: prodDisc, extra: extra, discount: discount, tax: tax, total: total };
  }

  /* ---------- Product grid ---------- */
  function renderCats() {
    const cats = DB.getData('categories', []);
    $('posCats').innerHTML =
      '<button class="pos-cat' + (activeCat === '' ? ' is-active' : '') + '" data-cat="">All</button>' +
      cats.map((c) => '<button class="pos-cat' + (activeCat === c.id ? ' is-active' : '') + '" data-cat="' + c.id + '">' + App.escapeHtml(c.name) + '</button>').join('');
  }

  function renderGrid() {
    let list = DB.getData('products', []);
    if (activeCat) list = list.filter((p) => p.categoryId === activeCat);
    const q = posSearch.toLowerCase();
    if (q) list = list.filter((p) => (p.name + ' ' + p.sku + ' ' + p.brand).toLowerCase().includes(q));
    const grid = $('posGrid');
    if (!list.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">' + App.icon('box', 'empty-state__icon') + '<p>No products found</p></div>';
      return;
    }
    grid.innerHTML = list
      .map((p) => {
        const inCart = cart.find((c) => c.productId === p.id);
        const remaining = p.stock - (inCart ? inCart.qty : 0);
        const disabled = remaining <= 0;
        return (
          '<button class="pos-tile" data-id="' + p.id + '"' + (disabled ? ' disabled' : '') + '>' +
          '<div class="pos-tile__thumb" style="background:' + App.colorFor(p.name) + '">' + App.escapeHtml(App.initials(p.name)) + '</div>' +
          '<div class="pos-tile__name">' + App.escapeHtml(p.name) + '</div>' +
          '<div class="pos-tile__foot"><span class="pos-tile__price">' + App.formatCurrency(p.sellingPrice) + '</span>' +
          '<span class="pos-tile__stock">' + (disabled ? 'Out' : remaining + ' left') + '</span></div>' +
          '</button>'
        );
      })
      .join('');
  }

  /* ---------- Cart ---------- */
  function addToCart(productId) {
    const p = DB.findById('products', productId);
    if (!p) return;
    const existing = cart.find((c) => c.productId === productId);
    const current = existing ? existing.qty : 0;
    if (current + 1 > p.stock) {
      App.toast('Only ' + p.stock + ' ' + p.unit + ' of ' + p.name + ' in stock', 'warning');
      return;
    }
    if (existing) existing.qty += 1;
    else cart.push({ productId: productId, qty: 1 });
    renderCart();
    renderGrid();
  }

  function changeQty(productId, delta) {
    const item = cart.find((c) => c.productId === productId);
    if (!item) return;
    const p = DB.findById('products', productId);
    const next = item.qty + delta;
    if (next <= 0) {
      cart = cart.filter((c) => c.productId !== productId);
    } else if (p && next > p.stock) {
      App.toast('Only ' + p.stock + ' ' + p.unit + ' available', 'warning');
      return;
    } else {
      item.qty = next;
    }
    renderCart();
    renderGrid();
  }

  function removeItem(productId) {
    cart = cart.filter((c) => c.productId !== productId);
    renderCart();
    renderGrid();
  }

  function renderCart() {
    const host = $('cartItems');
    if (!cart.length) {
      host.innerHTML = '<div class="pos-cart__empty">' + App.icon('cart') + '<p>Cart is empty.<br>Tap a product to add it.</p></div>';
    } else {
      host.innerHTML = cart
        .map((it) => {
          const l = lineFor(it);
          if (!l) return '';
          return (
            '<div class="cart-item">' +
            '<div class="cart-item__info"><b>' + App.escapeHtml(l.product.name) + '</b><small>' + App.formatCurrency(l.product.sellingPrice) + ' each</small></div>' +
            '<div class="qty-stepper"><button data-dec="' + it.productId + '" aria-label="Decrease">−</button><span>' + it.qty + '</span><button data-inc="' + it.productId + '" aria-label="Increase">+</button></div>' +
            '<div class="cart-item__total">' + App.formatCurrency(l.total) + '</div>' +
            '<button class="cart-item__remove" data-rm="' + it.productId + '" aria-label="Remove">' + App.icon('trash') + '</button>' +
            '</div>'
          );
        })
        .join('');
    }
    renderSummary();
  }

  function renderSummary() {
    const t = totals();
    $('summary').innerHTML =
      '<div class="pos-summary__row"><span>Subtotal</span><span class="mono">' + App.formatCurrency(t.subtotal) + '</span></div>' +
      '<div class="pos-summary__row"><span>Discount</span><span class="mono">− ' + App.formatCurrency(t.discount) + '</span></div>' +
      '<div class="pos-summary__row"><span>Tax</span><span class="mono">' + App.formatCurrency(t.tax) + '</span></div>' +
      '<div class="pos-summary__row total"><span>Total</span><span class="mono">' + App.formatCurrency(t.total) + '</span></div>';
  }

  function fillCustomers() {
    const customers = DB.getData('customers', []);
    $('customer').innerHTML = customers.map((c) => '<option value="' + c.id + '">' + App.escapeHtml(c.name) + (c.phone ? ' · ' + App.escapeHtml(c.phone) : '') + '</option>').join('');
    // default to walk-in if present
    const walk = customers.find((c) => /walk-in/i.test(c.name));
    if (walk) $('customer').value = walk.id;
  }


  /* ---------- Checkout ---------- */
  function completeSale() {
    if (!cart.length) {
      App.toast('Cart is empty', 'error');
      return;
    }
    const t = totals();
    const custId = $('customer').value;
    const cust = DB.findById('customers', custId);

    const items = cart.map((it) => {
      const l = lineFor(it);
      return { productId: l.product.id, name: l.product.name, price: l.product.sellingPrice, qty: it.qty, discount: l.discount, tax: l.tax, total: l.total, cost: l.product.purchasePrice * it.qty };
    });

    const order = {
      id: DB.nextId('orders', 'ORD-', 4),
      invoiceNo: DB.nextInvoiceNo(),
      customerId: custId,
      customerName: cust ? cust.name : 'Walk-in Customer',
      date: new Date().toISOString(),
      items: items,
      subtotal: t.subtotal,
      discount: t.discount,
      tax: t.tax,
      total: t.total,
      paymentMethod: payMethod,
      paymentStatus: 'Paid',
      orderStatus: 'Completed',
    };

    // Reduce stock + log
    items.forEach((it) => {
      const p = DB.findById('products', it.productId);
      if (p) {
        const ns = Math.max(0, p.stock - it.qty);
        DB.updateData('products', p.id, { stock: ns });
        DB.logInventory({ productId: p.id, name: p.name, type: 'sale (' + order.invoiceNo + ')', change: -it.qty, stock: ns, at: order.date, by: 'POS' });
        if (ns <= p.minStock) App.toast(p.name + ' hit low stock', 'warning');
      }
    });

    DB.insert('orders', order);

    // Update customer stats
    if (cust) {
      DB.updateData('customers', cust.id, {
        totalPurchases: (cust.totalPurchases || 0) + t.total,
        loyaltyPoints: (cust.loyaltyPoints || 0) + Math.floor(t.total / 100),
      });
    }

    App.toast('Sale completed — ' + order.invoiceNo, 'success');
    cart = [];
    $('extraDiscount').value = '';
    renderCart();
    renderGrid();
    App.refreshNotifications();
    Invoice.show(order);
  }

  /* ---------- Wiring ---------- */
  function init() {
    renderCats();
    renderGrid();
    renderCart();
    fillCustomers();

    $('posSearch').addEventListener('input', (e) => { posSearch = e.target.value; renderGrid(); });
    App.registerSearch((v) => { $('posSearch').value = v; posSearch = v; renderGrid(); });

    $('posCats').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      activeCat = b.getAttribute('data-cat');
      renderCats();
      renderGrid();
    });

    $('posGrid').addEventListener('click', (e) => {
      const tile = e.target.closest('.pos-tile');
      if (tile && !tile.disabled) addToCart(tile.getAttribute('data-id'));
    });

    $('cartItems').addEventListener('click', (e) => {
      const inc = e.target.closest('[data-inc]');
      const dec = e.target.closest('[data-dec]');
      const rm = e.target.closest('[data-rm]');
      if (inc) changeQty(inc.getAttribute('data-inc'), 1);
      else if (dec) changeQty(dec.getAttribute('data-dec'), -1);
      else if (rm) removeItem(rm.getAttribute('data-rm'));
    });

    $('extraDiscount').addEventListener('input', renderSummary);

    $('payMethods').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pay]');
      if (!b) return;
      payMethod = b.getAttribute('data-pay');
      document.querySelectorAll('.pay-btn').forEach((x) => x.classList.toggle('is-active', x === b));
    });

    $('clearCart').addEventListener('click', async () => {
      if (!cart.length) return;
      const ok = await App.confirmDialog({ title: 'Clear cart?', message: 'Remove all items from the current sale?', confirmText: 'Clear', danger: true });
      if (ok) { cart = []; $('extraDiscount').value = ''; renderCart(); renderGrid(); }
    });

    $('completeSale').addEventListener('click', completeSale);
  }
  document.addEventListener('DOMContentLoaded', init);
})();
