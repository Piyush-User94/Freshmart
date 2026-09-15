/* =============================================================
   dashboard.js — computes KPIs, charts and feeds for index.html
   ============================================================= */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function sameMonth(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  function isSale(o) {
    return o.orderStatus === 'Completed';
  }

  function build() {
    const products = DB.getData('products', []);
    const customers = DB.getData('customers', []);
    const orders = DB.getData('orders', []);
    const expenses = DB.getData('expenses', []);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

    const sales = orders.filter(isSale);

    const todaysSales = sales.filter((o) => sameDay(new Date(o.date), now)).reduce((s, o) => s + o.total, 0);
    const yesterdaysSales = sales.filter((o) => sameDay(new Date(o.date), yesterday)).reduce((s, o) => s + o.total, 0);

    const monthRevenue = sales.filter((o) => sameMonth(new Date(o.date), now)).reduce((s, o) => s + o.total, 0);
    const lastMonthRevenue = sales.filter((o) => sameMonth(new Date(o.date), lastMonth)).reduce((s, o) => s + o.total, 0);

    const monthCogs = sales
      .filter((o) => sameMonth(new Date(o.date), now))
      .reduce((s, o) => s + o.items.reduce((a, it) => a + (it.cost || 0), 0), 0);
    const monthExpenses = expenses.filter((e) => sameMonth(new Date(e.date), now)).reduce((s, e) => s + e.amount, 0);
    const estProfit = monthRevenue - monthCogs - monthExpenses;

    const lowStock = products.filter((p) => p.stock <= p.minStock);

    const delta = (cur, prev) => {
      if (prev === 0) return cur > 0 ? { txt: 'New', up: true } : { txt: '0%', up: true };
      const pct = Math.round(((cur - prev) / prev) * 100);
      return { txt: (pct >= 0 ? '+' : '') + pct + '%', up: pct >= 0 };
    };
    const dSales = delta(todaysSales, yesterdaysSales);
    const dRev = delta(monthRevenue, lastMonthRevenue);

    renderStats([
      { label: 'Total Products', value: App.formatNumber(products.length), icon: 'box', cls: 'i-green', sub: products.length + ' items catalogued' },
      { label: "Today's Sales", value: App.formatCurrency(todaysSales), icon: 'rupee', cls: 'i-blue', delta: dSales, deltaLabel: 'vs yesterday' },
      { label: 'Total Orders', value: App.formatNumber(orders.length), icon: 'receipt', cls: 'i-violet', sub: sales.length + ' completed' },
      { label: 'Total Customers', value: App.formatNumber(customers.length), icon: 'users', cls: 'i-cyan', sub: 'registered' },
      { label: 'Monthly Revenue', value: App.formatCurrency(monthRevenue), icon: 'chart', cls: 'i-green', delta: dRev, deltaLabel: 'vs last month' },
      { label: 'Low Stock Products', value: App.formatNumber(lowStock.length), icon: 'layers', cls: 'i-amber', sub: 'need restocking' },
      { label: 'Total Expenses', value: App.formatCurrency(monthExpenses), icon: 'wallet', cls: 'i-red', sub: 'this month' },
      {
        label: 'Estimated Profit',
        value: App.formatCurrency(estProfit),
        icon: 'rupee',
        cls: estProfit >= 0 ? 'i-green' : 'i-red',
        sub: 'this month (rev − cost − exp)',
      },
    ]);

    renderSalesChart(sales, now);
    renderRevenueChart(sales, now);
    renderTopProducts(sales);
    renderLowStock(lowStock);
    renderRecentOrders(orders);
    renderActivity(orders, expenses);
  }

  function renderStats(cards) {
    const grid = $('statsGrid');
    grid.innerHTML = cards
      .map((c) => {
        let foot = '';
        if (c.delta) {
          foot =
            '<span class="stat-card__delta ' +
            (c.delta.up ? 'delta--up' : 'delta--down') +
            '">' +
            App.icon(c.delta.up ? 'up' : 'down') +
            App.escapeHtml(c.delta.txt) +
            ' <span class="text-muted" style="font-weight:500">' +
            App.escapeHtml(c.deltaLabel || '') +
            '</span></span>';
        } else if (c.sub) {
          foot = '<span class="stat-card__delta text-muted">' + App.escapeHtml(c.sub) + '</span>';
        }
        return (
          '<div class="stat-card">' +
          '<div class="stat-card__top">' +
          '<div><div class="stat-card__label">' +
          App.escapeHtml(c.label) +
          '</div><div class="stat-card__value">' +
          c.value +
          '</div></div>' +
          '<div class="stat-card__icon ' +
          c.cls +
          '">' +
          App.icon(c.icon) +
          '</div></div>' +
          foot +
          '</div>'
        );
      })
      .join('');
  }

  function renderSalesChart(sales, now) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const total = sales.filter((o) => sameDay(new Date(o.date), d)).reduce((s, o) => s + o.total, 0);
      days.push({ label: d.toLocaleDateString('en-IN', { weekday: 'short' }), value: total });
    }
    $('salesChart').innerHTML = App.charts.line(days);
  }

  function renderRevenueChart(sales, now) {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = sales.filter((o) => sameMonth(new Date(o.date), d)).reduce((s, o) => s + o.total, 0);
      months.push({ label: d.toLocaleDateString('en-IN', { month: 'short' }), value: total });
    }
    $('revenueChart').innerHTML = App.charts.bar(months);
  }

  function renderTopProducts(sales) {
    const map = {};
    sales.forEach((o) =>
      o.items.forEach((it) => {
        if (!map[it.productId]) map[it.productId] = { name: it.name, qty: 0, revenue: 0 };
        map[it.productId].qty += it.qty;
        map[it.productId].revenue += it.total;
      })
    );
    const top = Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6)
      .map((p) => ({ label: p.name, value: p.qty, sub: p.qty + ' sold' }));
    $('topProducts').innerHTML = top.length ? App.charts.hbar(top) : '<div class="empty-state">No sales yet</div>';
  }

  function renderLowStock(lowStock) {
    const host = $('lowStock');
    if (!lowStock.length) {
      host.innerHTML = '<div class="empty-state">' + App.icon('check', 'empty-state__icon') + '<p>All products are well stocked</p></div>';
      return;
    }
    host.innerHTML =
      '<div class="mini-list">' +
      lowStock
        .slice(0, 6)
        .map((p) => {
          const st = App.stockStatus(p);
          return (
            '<div class="mini-row">' +
            '<span class="thumb" style="background:' +
            App.colorFor(p.name) +
            '">' +
            App.escapeHtml(App.initials(p.name)) +
            '</span>' +
            '<div class="mini-row__main"><b>' +
            App.escapeHtml(p.name) +
            '</b><small>' +
            p.stock +
            ' / min ' +
            p.minStock +
            ' ' +
            App.escapeHtml(p.unit) +
            '</small></div>' +
            App.badge(st.label, st.kind) +
            '</div>'
          );
        })
        .join('') +
      '</div>';
  }

  function renderRecentOrders(orders) {
    const recent = orders.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
    const kind = { Completed: 'success', Processing: 'info', Pending: 'warning', Cancelled: 'muted', Refunded: 'danger' };
    $('recentOrders').innerHTML =
      '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Invoice</th><th>Customer</th><th class="num">Total</th><th>Status</th></tr></thead><tbody>' +
      recent
        .map(
          (o) =>
            '<tr><td class="cell-strong mono">' +
            App.escapeHtml(o.invoiceNo) +
            '</td><td>' +
            App.escapeHtml(o.customerName) +
            '<div class="cell-sub">' +
            App.formatDate(o.date) +
            '</div></td><td class="num cell-strong">' +
            App.formatCurrency(o.total) +
            '</td><td>' +
            App.badge(o.orderStatus, kind[o.orderStatus] || 'muted') +
            '</td></tr>'
        )
        .join('') +
      '</tbody></table></div>';
  }

  function renderActivity(orders, expenses) {
    const events = [];
    orders.forEach((o) =>
      events.push({
        time: new Date(o.date),
        icon: 'receipt',
        title: 'Order ' + o.invoiceNo + ' — ' + o.orderStatus,
        sub: o.customerName + ' · ' + App.formatCurrency(o.total),
      })
    );
    expenses.forEach((e) =>
      events.push({
        time: new Date(e.date),
        icon: 'wallet',
        title: 'Expense: ' + e.category,
        sub: e.description + ' · ' + App.formatCurrency(e.amount),
      })
    );
    events.sort((a, b) => b.time - a.time);
    $('recentActivity').innerHTML =
      '<div class="activity">' +
      events
        .slice(0, 7)
        .map(
          (ev) =>
            '<div class="activity__item"><div class="activity__icon">' +
            App.icon(ev.icon) +
            '</div><div class="activity__body"><b>' +
            App.escapeHtml(ev.title) +
            '</b><small>' +
            App.escapeHtml(ev.sub) +
            '</small></div><span class="activity__time">' +
            App.formatDate(ev.time) +
            '</span></div>'
        )
        .join('') +
      '</div>';
  }

  document.addEventListener('DOMContentLoaded', build);
})();
