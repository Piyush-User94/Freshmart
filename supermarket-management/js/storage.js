/* =============================================================
   storage.js — localStorage data layer + demo data seeding
   Exposed as window.DB (no globals leaked).
   ============================================================= */
window.DB = (function () {
  'use strict';

  const PREFIX = 'sm_'; // supermarket namespace to avoid clashes

  /* ---------- Low level primitives ---------- */
  function saveData(key, data) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('saveData failed for', key, e);
      return false;
    }
  }

  function getData(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null || raw === undefined) return fallback !== undefined ? fallback : [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('getData failed for', key, e);
      return fallback !== undefined ? fallback : [];
    }
  }

  function clearData(key) {
    localStorage.removeItem(PREFIX + key);
  }

  /* ---------- Collection helpers (array of {id,...}) ---------- */
  function insert(key, record) {
    const list = getData(key, []);
    list.push(record);
    saveData(key, list);
    return record;
  }

  function updateData(key, id, patch) {
    const list = getData(key, []);
    const idx = list.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) return null;
    list[idx] = Object.assign({}, list[idx], patch, { id: list[idx].id });
    saveData(key, list);
    return list[idx];
  }

  function deleteData(key, id) {
    const list = getData(key, []);
    const next = list.filter((r) => String(r.id) !== String(id));
    saveData(key, next);
    return list.length !== next.length;
  }

  function findById(key, id) {
    return getData(key, []).find((r) => String(r.id) === String(id)) || null;
  }

  /* ---------- ID generation ---------- */
  function nextId(key, prefix, pad) {
    const list = getData(key, []);
    let max = 0;
    list.forEach((r) => {
      const n = parseInt(String(r.id).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    const num = max + 1;
    return prefix + String(num).padStart(pad || 3, '0');
  }

  function nextInvoiceNo() {
    const settings = getSettings();
    const orders = getData('orders', []);
    let max = 1000;
    orders.forEach((o) => {
      const n = parseInt(String(o.invoiceNo).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return (settings.invoicePrefix || 'INV') + '-' + (max + 1);
  }

  /* ---------- Settings ---------- */
  const DEFAULT_SETTINGS = {
    storeName: 'FreshMart Supermarket',
    storeAddress: '14 MG Road, Bengaluru, Karnataka 560001',
    phone: '+91 98450 12345',
    email: 'billing@freshmart.in',
    gst: '29ABCDE1234F1Z5',
    currency: '₹',
    taxPercent: 5,
    invoicePrefix: 'INV',
    theme: 'light',
    sidebarCollapsed: false,
  };

  function getSettings() {
    const s = getData('settings', null);
    return Object.assign({}, DEFAULT_SETTINGS, s && !Array.isArray(s) ? s : {});
  }

  function saveSettings(patch) {
    const merged = Object.assign({}, getSettings(), patch);
    saveData('settings', merged);
    return merged;
  }

  /* ---------- Inventory movement log ---------- */
  function logInventory(entry) {
    const list = getData('inventory', []);
    list.unshift(entry); // newest first
    if (list.length > 500) list.length = 500; // cap log size
    saveData('inventory', list);
  }

  /* =============================================================
     DEMO DATA
     ============================================================= */
  function iso(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  }
  function isoFuture(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  }

  function seedCategories() {
    const cats = [
      ['Dairy & Eggs', 'Milk, curd, butter, cheese and eggs'],
      ['Staples & Grains', 'Atta, rice, pulses, sugar and salt'],
      ['Snacks & Biscuits', 'Chips, biscuits and namkeen'],
      ['Beverages', 'Soft drinks, juices, tea and coffee'],
      ['Household Care', 'Detergents, cleaners and utensils'],
      ['Personal Care', 'Soap, shampoo, oral and skin care'],
      ['Cooking Essentials', 'Edible oils, spices and masalas'],
      ['Bakery', 'Bread, buns, cakes and rusk'],
    ];
    return cats.map((c, i) => ({
      id: 'CAT-' + String(i + 1).padStart(2, '0'),
      name: c[0],
      description: c[1],
      status: 'active',
      createdAt: iso(120 - i),
    }));
  }

  function seedProducts(categories) {
    const byName = {};
    categories.forEach((c) => (byName[c.name] = c.id));
    // name, category, brand, purchase, selling, unit, stock, minStock, tax%, disc%, expiryDaysAhead
    const rows = [
      ['Amul Taaza Milk 1L', 'Dairy & Eggs', 'Amul', 52, 60, 'pcs', 120, 30, 0, 0, 12],
      ['Amul Butter 500g', 'Dairy & Eggs', 'Amul', 235, 265, 'pcs', 40, 15, 5, 0, 90],
      ['Farm Fresh Eggs (12)', 'Dairy & Eggs', 'Suguna', 68, 84, 'pack', 8, 20, 0, 0, 15],
      ['Nestle Dahi 400g', 'Dairy & Eggs', 'Nestle', 40, 48, 'pcs', 22, 10, 5, 0, 10],
      ['Aashirvaad Atta 5kg', 'Staples & Grains', 'Aashirvaad', 245, 285, 'bag', 60, 20, 0, 5, 180],
      ['Tata Salt 1kg', 'Staples & Grains', 'Tata', 22, 28, 'pcs', 150, 40, 0, 0, 365],
      ['India Gate Basmati 1kg', 'Staples & Grains', 'India Gate', 120, 145, 'pcs', 35, 15, 5, 0, 300],
      ['Toor Dal 1kg', 'Staples & Grains', 'Local', 130, 155, 'kg', 0, 15, 0, 0, 200],
      ['Parle-G Biscuits 800g', 'Snacks & Biscuits', 'Parle', 72, 85, 'pcs', 90, 25, 12, 0, 120],
      ['Lays Classic 52g', 'Snacks & Biscuits', 'Lays', 15, 20, 'pcs', 200, 50, 12, 0, 90],
      ['Britannia Good Day 600g', 'Snacks & Biscuits', 'Britannia', 90, 110, 'pcs', 12, 20, 12, 5, 100],
      ['Coca-Cola 750ml', 'Beverages', 'Coca-Cola', 32, 40, 'pcs', 140, 40, 12, 0, 150],
      ['Tata Tea Gold 500g', 'Beverages', 'Tata', 240, 275, 'pcs', 45, 15, 5, 0, 300],
      ['Real Fruit Juice 1L', 'Beverages', 'Real', 95, 115, 'pcs', 18, 20, 12, 0, 60],
      ['Surf Excel 1kg', 'Household Care', 'Surf Excel', 105, 130, 'pcs', 70, 20, 18, 5, 400],
      ['Vim Dishwash Bar 300g', 'Household Care', 'Vim', 18, 25, 'pcs', 110, 30, 18, 0, 400],
      ['Colgate MaxFresh 150g', 'Personal Care', 'Colgate', 78, 95, 'pcs', 55, 20, 18, 0, 300],
      ['Dove Soap 100g', 'Personal Care', 'Dove', 42, 55, 'pcs', 4, 15, 18, 0, 365],
      ['Fortune Sunflower Oil 1L', 'Cooking Essentials', 'Fortune', 128, 150, 'pcs', 80, 25, 5, 0, 240],
      ['Maggi Noodles 560g', 'Cooking Essentials', 'Maggi', 84, 96, 'pack', 130, 30, 12, 0, 200],
      ['MDH Garam Masala 100g', 'Cooking Essentials', 'MDH', 62, 78, 'pcs', 48, 15, 5, 0, 300],
      ['Britannia Bread 400g', 'Bakery', 'Britannia', 38, 45, 'pcs', 6, 20, 5, 0, 4],
    ];
    return rows.map((r, i) => ({
      id: 'P-' + String(1001 + i),
      name: r[0],
      sku: 'SKU-' + String(1001 + i),
      barcode: '890' + String(1000000 + i * 137).padStart(10, '0'),
      categoryId: byName[r[1]],
      brand: r[2],
      purchasePrice: r[3],
      sellingPrice: r[4],
      unit: r[5],
      stock: r[6],
      minStock: r[7],
      tax: r[8],
      discount: r[9],
      expiryDate: isoFuture(r[10]),
      image: '',
      description: r[2] + ' — ' + r[0],
      status: 'active',
      createdAt: iso(100 - i),
    }));
  }

  function seedSuppliers() {
    const rows = [
      ['Krishna Distributors', 'Ramesh Krishnan', '+91 98860 11223', 'ramesh@krishnadist.in', '22 Market Yard, Bengaluru', '29AAACK1234M1Z2'],
      ['Metro Wholesale Pvt Ltd', 'Priya Nair', '+91 99012 44556', 'priya@metrowholesale.in', 'Plot 8, Peenya Industrial Area', '29AAECM5678N1Z9'],
      ['Sunrise FMCG Traders', 'Arjun Mehta', '+91 90080 77889', 'arjun@sunrisefmcg.in', 'Shop 4, KR Market', '27AABCS9012P1Z3'],
      ['Green Valley Dairy', 'Lakshmi Rao', '+91 97400 33221', 'accounts@greenvalley.in', 'Dairy Road, Hassan', '29AACCG3456Q1Z8'],
      ['Everyday Essentials Co.', 'Sameer Khan', '+91 98450 66778', 'sameer@everydayess.in', 'Industrial Layout, Mysuru', '29AADCE7890R1Z1'],
    ];
    return rows.map((r, i) => ({
      id: 'SUP-' + String(i + 1).padStart(2, '0'),
      name: r[0],
      contactPerson: r[1],
      phone: r[2],
      email: r[3],
      address: r[4],
      gst: r[5],
      status: i === 4 ? 'inactive' : 'active',
      createdAt: iso(150 - i * 5),
    }));
  }

  function seedCustomers() {
    const rows = [
      ['Anita Sharma', '9845012301', 'anita.sharma@gmail.com', 'Jayanagar, Bengaluru'],
      ['Rahul Verma', '9845012302', 'rahul.verma@gmail.com', 'Indiranagar, Bengaluru'],
      ['Deepa Iyer', '9845012303', 'deepa.iyer@gmail.com', 'Koramangala, Bengaluru'],
      ['Vikram Singh', '9845012304', 'vikram.singh@gmail.com', 'HSR Layout, Bengaluru'],
      ['Sneha Reddy', '9845012305', 'sneha.reddy@gmail.com', 'Whitefield, Bengaluru'],
      ['Mohammed Ali', '9845012306', 'mohammed.ali@gmail.com', 'Frazer Town, Bengaluru'],
      ['Kavya Menon', '9845012307', 'kavya.menon@gmail.com', 'BTM Layout, Bengaluru'],
      ['Sanjay Gupta', '9845012308', 'sanjay.gupta@gmail.com', 'Malleshwaram, Bengaluru'],
      ['Pooja Nair', '9845012309', 'pooja.nair@gmail.com', 'Marathahalli, Bengaluru'],
      ['Walk-in Customer', '', '', 'Store counter'],
    ];
    return rows.map((r, i) => ({
      id: 'CUST-' + String(1001 + i),
      name: r[0],
      phone: r[1],
      email: r[2],
      address: r[3],
      loyaltyPoints: i === 9 ? 0 : Math.floor(Math.random() * 400),
      totalPurchases: 0, // recomputed from orders after seeding
      registrationDate: iso(200 - i * 12),
      status: 'active',
    }));
  }

  function seedEmployees() {
    const rows = [
      ['Suresh Kumar', 'suresh.kumar@freshmart.in', '9880011001', 'Admin', 65000],
      ['Meera Joshi', 'meera.joshi@freshmart.in', '9880011002', 'Manager', 48000],
      ['Arun Pillai', 'arun.pillai@freshmart.in', '9880011003', 'Cashier', 24000],
      ['Divya Shetty', 'divya.shetty@freshmart.in', '9880011004', 'Cashier', 23000],
      ['Rohan Das', 'rohan.das@freshmart.in', '9880011005', 'Inventory Staff', 26000],
      ['Farhan Sheikh', 'farhan.sheikh@freshmart.in', '9880011006', 'Inventory Staff', 25000],
      ['Nisha Rao', 'nisha.rao@freshmart.in', '9880011007', 'Manager', 46000],
      ['Karthik Nair', 'karthik.nair@freshmart.in', '9880011008', 'Cashier', 22500],
      ['Ananya Bose', 'ananya.bose@freshmart.in', '9880011009', 'Cashier', 22000],
      ['Manoj Yadav', 'manoj.yadav@freshmart.in', '9880011010', 'Inventory Staff', 24500],
    ];
    return rows.map((r, i) => ({
      id: 'EMP-' + String(i + 1).padStart(2, '0'),
      name: r[0],
      email: r[1],
      phone: r[2],
      role: r[3],
      salary: r[4],
      joiningDate: iso(500 - i * 30).slice(0, 10),
      status: i === 8 ? 'inactive' : 'active',
    }));
  }

  function seedExpenses() {
    const cats = ['Electricity', 'Rent', 'Salary', 'Transport', 'Maintenance', 'Other'];
    const methods = ['Cash', 'UPI', 'Card', 'Bank Transfer'];
    const rows = [
      ['Rent', 'Monthly store rent', 85000, 0],
      ['Electricity', 'Electricity bill', 18400, 3],
      ['Salary', 'Staff salary disbursement', 320000, 2],
      ['Transport', 'Delivery van fuel', 6200, 1],
      ['Maintenance', 'Refrigeration servicing', 4500, 5],
      ['Other', 'Packaging material', 3800, 6],
      ['Electricity', 'Backup generator diesel', 5200, 8],
      ['Transport', 'Goods inward freight', 7400, 9],
      ['Maintenance', 'Billing counter repair', 2100, 11],
      ['Other', 'Store signage & banners', 9600, 14],
      ['Transport', 'Local pickup charges', 1800, 16],
      ['Electricity', 'Water charges', 2600, 18],
      ['Maintenance', 'Pest control service', 3200, 21],
      ['Other', 'Stationery & printing', 1500, 24],
      ['Transport', 'Fuel top-up', 2400, 27],
    ];
    return rows.map((r, i) => ({
      id: 'EXP-' + String(1001 + i),
      category: r[0],
      description: r[1],
      amount: r[2],
      paymentMethod: methods[i % methods.length],
      date: iso(r[3]).slice(0, 10),
      addedBy: 'Suresh Kumar',
    }));
    void cats;
  }

  function seedOrders(products, customers) {
    const payMethods = ['Cash', 'UPI', 'Card', 'Other'];
    const statuses = ['Completed', 'Completed', 'Completed', 'Processing', 'Pending', 'Cancelled', 'Refunded'];
    const orders = [];
    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor((i / 20) * 38) + (i % 3);
      const cust = customers[i % (customers.length - 1)]; // avoid always walk-in
      const itemCount = 2 + (i % 4);
      const items = [];
      let subtotal = 0;
      let taxTotal = 0;
      let discTotal = 0;
      for (let j = 0; j < itemCount; j++) {
        const p = products[(i * 3 + j * 5) % products.length];
        const qty = 1 + ((i + j) % 4);
        const lineBase = p.sellingPrice * qty;
        const lineDisc = Math.round(lineBase * (p.discount / 100));
        const taxable = lineBase - lineDisc;
        const lineTax = Math.round(taxable * (p.tax / 100));
        const lineTotal = taxable + lineTax;
        subtotal += lineBase;
        discTotal += lineDisc;
        taxTotal += lineTax;
        items.push({
          productId: p.id,
          name: p.name,
          price: p.sellingPrice,
          qty: qty,
          discount: lineDisc,
          tax: lineTax,
          total: lineTotal,
          cost: p.purchasePrice * qty,
        });
      }
      const total = subtotal - discTotal + taxTotal;
      const orderStatus = statuses[i % statuses.length];
      const paymentStatus =
        orderStatus === 'Completed' ? 'Paid' : orderStatus === 'Refunded' ? 'Refunded' : orderStatus === 'Cancelled' ? 'Cancelled' : 'Pending';
      orders.push({
        id: 'ORD-' + String(1001 + i),
        invoiceNo: 'INV-' + String(1001 + i),
        customerId: cust.id,
        customerName: cust.name,
        date: iso(daysAgo),
        items: items,
        subtotal: subtotal,
        discount: discTotal,
        tax: taxTotal,
        total: total,
        paymentMethod: payMethods[i % payMethods.length],
        paymentStatus: paymentStatus,
        orderStatus: orderStatus,
      });
    }
    return orders;
  }

  function recomputeCustomerTotals(customers, orders) {
    const map = {};
    orders.forEach((o) => {
      if (o.orderStatus === 'Completed') {
        map[o.customerId] = (map[o.customerId] || 0) + o.total;
      }
    });
    customers.forEach((c) => {
      c.totalPurchases = Math.round(map[c.id] || 0);
    });
    return customers;
  }

  /* ---------- Seed orchestration ---------- */
  function seedAll(force) {
    if (!force && getData('_seeded', null)) return;

    const categories = seedCategories();
    const products = seedProducts(categories);
    const suppliers = seedSuppliers();
    let customers = seedCustomers();
    const employees = seedEmployees();
    const expenses = seedExpenses();
    const orders = seedOrders(products, customers);
    customers = recomputeCustomerTotals(customers, orders);

    saveData('categories', categories);
    saveData('products', products);
    saveData('suppliers', suppliers);
    saveData('customers', customers);
    saveData('employees', employees);
    saveData('expenses', expenses);
    saveData('orders', orders);
    saveData('inventory', []); // movement log starts empty
    if (!getData('settings', null)) saveData('settings', DEFAULT_SETTINGS);
    saveData('_seeded', { at: new Date().toISOString(), version: 1 });
  }

  function resetAll() {
    ['categories', 'products', 'suppliers', 'customers', 'employees', 'expenses', 'orders', 'inventory', '_seeded'].forEach(clearData);
    seedAll(true);
  }

  /* ---------- Public API ---------- */
  return {
    // primitives
    saveData: saveData,
    getData: getData,
    deleteData: deleteData,
    updateData: updateData,
    clearData: clearData,
    insert: insert,
    findById: findById,
    // ids
    nextId: nextId,
    nextInvoiceNo: nextInvoiceNo,
    // settings
    getSettings: getSettings,
    saveSettings: saveSettings,
    // inventory log
    logInventory: logInventory,
    // seeding
    seedAll: seedAll,
    resetAll: resetAll,
  };
})();

// Seed on first ever load (safe: no-op if already seeded).
window.DB.seedAll(false);
