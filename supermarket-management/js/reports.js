/* =============================================================
   reports.js — date-ranged analytics, profit calc, export/print
   ============================================================= */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const DONUT = ['#16a34a', '#2563eb', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#ef4444', '#0ea5e9'];
  let range = { from: null, to: null, category: '' };

  function ymd(d) { return d.toISOString().slice(0, 10); }
  function catName(id) { const c = DB.getData('categories', []).find((x) => x.id === id); return c ? c.name : '—'; }

  function inRange(dateStr) {
    const d = new Date(dateStr);
    return d >= range.from && d <= range.to;
  }

  function salesInRange() {
    return DB.getData('orders', [])
      .filter((o) => o.orderStatus === 'Completed' && inRange(o.date))
      .map((o) => {
        if (!range.category) return o;
        const items = o.items.filter((it) => {
          const p = DB.findById('products', it.productId);
          return p && p.categoryId === range.category;
        });
        return Object.assign({}, o, { items: items });
      })
      .filter((o) => o.items.length);
  }

  function build() {
    const sales = salesInRange();
    const expenses = DB.getData('expenses', []).filter((e) => inRange(e.date));

    const revenue = sales.reduce((s, o) => s + o.items.reduce((a, it) => a + it.total, 0), 0);
    const cogs = sales.reduce((s, o) => s + o.items.reduce((a, it) => a + (it.cost || 0), 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const orderCount = sales.length;
    const unitsSold = sales.reduce((s, o) => s + o.items.reduce((a, it) => a + it.qty, 0), 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;
    const avgOrder = orderCount ? revenue / orderCount : 0;

    renderKpis([
      { label: 'Revenue', value: App.formatCurrency(revenue) },
      { label: 'Orders', value: App.formatNumber(orderCount) },
      { label: 'Units Sold', value: App.formatNumber(unitsSold) },
      { label: 'Avg Order Value', value: App.formatCurrency(Math.round(avgOrder)) },
    ]);

    renderTrend(sales);
    renderCategory(sales);
    renderTopProducts(sales);
    renderPnl({ revenue, cogs, grossProfit, totalExpenses, netProfit });
    renderExpenseBreak(expenses);

    // stash for export
    build._export = { sales, expenses, revenue, cogs, totalExpenses, netProfit };
  }

  function renderKpis(items) {
    $('kpis').innerHTML = items.map((k) => '<div class="report-kpi"><label>' + App.escapeHtml(k.label) + '</label><div>' + k.value + '</div></div>').join('');
  }

  function renderTrend(sales) {
    const days = Math.round((range.to - range.from) / 86400000) + 1;
    let buckets;
    if (days <= 31) {
      // daily
      const map = {};
      for (let i = 0; i < days; i++) {
        const d = new Date(range.from);
        d.setDate(range.from.getDate() + i);
        map[ymd(d)] = { label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), value: 0 };
      }
      sales.forEach((o) => {
        const key = ymd(new Date(o.date));
        if (map[key]) map[key].value += o.items.reduce((a, it) => a + it.total, 0);
      });
      buckets = Object.values(map);
      // thin labels if many
      if (buckets.length > 12) buckets = buckets.map((b, i) => ({ label: i % 3 === 0 ? b.label : '', value: b.value }));
    } else {
      // monthly
      const map = {};
      let d = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
      while (d <= range.to) {
        map[d.getFullYear() + '-' + d.getMonth()] = { label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), value: 0 };
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
      sales.forEach((o) => {
        const dd = new Date(o.date);
        const key = dd.getFullYear() + '-' + dd.getMonth();
        if (map[key]) map[key].value += o.items.reduce((a, it) => a + it.total, 0);
      });
      buckets = Object.values(map);
    }
    $('salesTrend').innerHTML = buckets.length ? App.charts.bar(buckets) : '<div class="empty-state"><p>No sales in this range</p></div>';
  }

  function renderCategory(sales) {
    const map = {};
    sales.forEach((o) =>
      o.items.forEach((it) => {
        const p = DB.findById('products', it.productId);
        const name = p ? catName(p.categoryId) : 'Other';
        map[name] = (map[name] || 0) + it.total;
      })
    );
    const data = Object.keys(map).map((k, i) => ({ label: k, value: Math.round(map[k]), color: DONUT[i % DONUT.length] }));
    const total = data.reduce((s, d) => s + d.value, 0);
    $('catChart').innerHTML = data.length
      ? App.charts.donut(data, { centerLabel: App.formatCurrency(total), centerSub: 'total' })
      : '<div class="empty-state"><p>No category sales</p></div>';
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
    const top = Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    if (!top.length) { $('topProducts').innerHTML = '<div class="empty-state"><p>No sales</p></div>'; return; }
    $('topProducts').innerHTML = App.charts.hbar(top.map((p) => ({ label: p.name, value: p.revenue, sub: App.formatCurrency(p.revenue) })));
  }

  function renderPnl(p) {
    const rows = [
      ['Sales revenue', App.formatCurrency(p.revenue), ''],
      ['Cost of goods sold', '− ' + App.formatCurrency(p.cogs), 'muted'],
      ['Gross profit', App.formatCurrency(p.grossProfit), 'strong'],
      ['Operating expenses', '− ' + App.formatCurrency(p.totalExpenses), 'muted'],
      ['Net profit', App.formatCurrency(p.netProfit), p.netProfit >= 0 ? 'good' : 'bad'],
    ];
    $('pnl').innerHTML =
      '<div class="pos-summary">' +
      rows
        .map((r) => {
          const cls = r[2] === 'strong' ? ' total' : '';
          let color = '';
          if (r[2] === 'good') color = 'color:var(--primary);font-weight:700';
          if (r[2] === 'bad') color = 'color:var(--danger);font-weight:700';
          return '<div class="pos-summary__row' + cls + '" style="' + color + '"><span>' + r[0] + '</span><span class="mono">' + r[1] + '</span></div>';
        })
        .join('') +
      '</div>';
  }

  function renderExpenseBreak(expenses) {
    const map = {};
    expenses.forEach((e) => (map[e.category] = (map[e.category] || 0) + e.amount));
    const data = Object.keys(map).map((k) => ({ label: k, value: map[k], sub: App.formatCurrency(map[k]) }));
    data.sort((a, b) => b.value - a.value);
    $('expenseBreak').innerHTML = data.length ? App.charts.hbar(data) : '<div class="empty-state"><p>No expenses in this range</p></div>';
  }

  function applyPreset(days) {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (Number(days) - 1));
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    range.from = from;
    range.to = to;
    $('fromDate').value = ymd(from);
    $('toDate').value = ymd(to);
  }

  function readDates() {
    const f = new Date($('fromDate').value);
    const t = new Date($('toDate').value);
    if (!isNaN(f.getTime())) { f.setHours(0, 0, 0, 0); range.from = f; }
    if (!isNaN(t.getTime())) { t.setHours(23, 59, 59, 999); range.to = t; }
  }

  function init() {
    $('filterCategory').innerHTML = '<option value="">All categories</option>' + DB.getData('categories', []).map((c) => '<option value="' + c.id + '">' + App.escapeHtml(c.name) + '</option>').join('');
    applyPreset(30);
    build();

    $('preset').addEventListener('change', (e) => { applyPreset(e.target.value); build(); });
    $('fromDate').addEventListener('change', () => { readDates(); build(); });
    $('toDate').addEventListener('change', () => { readDates(); build(); });
    $('filterCategory').addEventListener('change', (e) => { range.category = e.target.value; build(); });
    $('printBtn').addEventListener('click', () => window.print());
    $('exportBtn').addEventListener('click', () => {
      const ex = build._export;
      const rows = ex.sales.map((o) => [o.invoiceNo, App.formatDate(o.date), o.customerName, o.items.reduce((a, it) => a + it.qty, 0), o.items.reduce((a, it) => a + it.total, 0)]);
      rows.push([]);
      rows.push(['Revenue', '', '', '', ex.revenue]);
      rows.push(['COGS', '', '', '', ex.cogs]);
      rows.push(['Expenses', '', '', '', ex.totalExpenses]);
      rows.push(['Net Profit', '', '', '', ex.netProfit]);
      App.exportCsv('sales-report.csv', ['Invoice', 'Date', 'Customer', 'Units', 'Total'], rows);
      App.toast('Report exported', 'success');
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
