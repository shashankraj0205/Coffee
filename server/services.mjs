import crypto from 'node:crypto';
import { getSetting, mapCouponRow, mapProductRow } from './db.mjs';

// ---------- Real-Time SSE Clients ----------
const sseClients = new Set();

export function addSseClient(res) {
  sseClients.add(res);
  res.on('close', () => sseClients.delete(res));
}

export function broadcastEvent(eventName, payload) {
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(data);
    } catch {
      sseClients.delete(res);
    }
  }
}

// ---------- Notifications ----------
export function createNotification(
  db,
  { recipientScope, userId = null, type, title, message, meta = {} }
) {
  const id = `ntf-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO notifications (id, recipient_scope, user_id, type, title, message, read, meta_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(id, recipientScope, userId, type, title, message, JSON.stringify(meta), now);

  broadcastEvent('notification', {
    id,
    recipientScope,
    userId,
    type,
    title,
    message,
    createdAt: now,
  });
}

// ---------- Server-Side Schedule & Cart Pricing Validation ----------
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toMinutes(time24 = '00:00') {
  const [h, m] = String(time24).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function isShopAcceptingOrders(availability, isScheduled = false) {
  if (!availability) return false;
  if (isScheduled && availability.acceptingOrders) return true;
  if (availability.mode === 'closed' || !availability.acceptingOrders) return false;
  if (availability.mode === 'open' || availability.mode === 'busy') return true;

  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  const todayEntry = (availability.weeklySchedule || []).find((d) =>
    String(d.day).toLowerCase().startsWith(todayName.toLowerCase())
  );
  if (todayEntry?.isClosed) return false;
  const openMins = toMinutes(todayEntry?.open || availability.openingTime);
  const closeMins = toMinutes(todayEntry?.close || availability.closingTime);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= openMins && nowMins < closeMins;
}

export function calculateUnitPrice(product, sizeName = 'Medium') {
  const sizes = product.sizes || [];
  const found = sizes.find((s) => s.name === sizeName);
  return Math.max(20, Math.round(Number(product.price) + Number(found?.priceDelta || 0)));
}

export function calculateCartQuote(
  db,
  {
    items = [],
    orderType = 'pickup',
    couponCode = '',
    redeemPoints = 0,
    userId = null,
    customerEmail = '',
  }
) {
  const commerce = getSetting(db, 'commerce', {
    taxRatePercent: 5,
    deliveryCharge: 35,
    freeDeliveryAbove: 299,
    loyaltyPointsPer100: 25,
    pointRedemptionValueInr: 0.5,
    maxRedeemPercentOfSubtotal: 30,
    minPointsToRedeem: 50,
  });

  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Your cart is empty.' };
  }

  const resolvedItems = [];
  let subtotal = 0;
  let totalBeans = 0;

  for (const line of items) {
    const prodRow = db
      .prepare('SELECT * FROM products WHERE id = ?')
      .get(line.itemId || line.productId);
    if (!prodRow) {
      return { error: `Beverage not found: ${line.itemId || line.productId}` };
    }
    const product = mapProductRow(prodRow);
    if (!product.available || product.stockCount <= 0) {
      return { error: `${product.name} is currently unavailable.` };
    }
    const qty = Math.max(1, Math.min(20, Number(line.quantity) || 1));
    if (qty > product.stockCount) {
      return {
        error: `Only ${product.stockCount} cups of ${product.name} left today.`,
      };
    }

    const size = ['Small', 'Medium', 'Large'].includes(line.size)
      ? line.size
      : 'Medium';
    const temp =
      line.temperature === 'cold' && product.supportsCold
        ? 'cold'
        : product.supportsHot
          ? 'hot'
          : 'cold';
    const unitPrice = calculateUnitPrice(product, size);
    const beansPerCup = Math.max(
      10,
      Math.round((unitPrice / 100) * (commerce.loyaltyPointsPer100 || 25) * 2)
    );

    resolvedItems.push({
      product,
      itemId: product.id,
      name: product.name,
      category: product.category,
      size,
      temperature: temp,
      sugarPreference: String(line.sugarPreference || 'Regular Sugar').slice(0, 60),
      milkStrength: String(line.milkStrength || 'Standard').slice(0, 60),
      specialInstructions: String(line.specialInstructions || '').slice(0, 140),
      unitPrice,
      quantity: qty,
      beansEarned: product.beansEarned || beansPerCup,
    });

    subtotal += unitPrice * qty;
    totalBeans += (product.beansEarned || beansPerCup) * qty;
  }

  // Coupon validation
  let discountAmount = 0;
  let couponApplied = null;
  let couponError = undefined;
  const cleanCode = String(couponCode || '').trim().toUpperCase();

  if (cleanCode) {
    const cRow = db
      .prepare('SELECT * FROM coupons WHERE UPPER(code) = ?')
      .get(cleanCode);
    if (!cRow || !cRow.active) {
      couponError = `Coupon "${cleanCode}" is invalid or inactive.`;
    } else {
      const coupon = mapCouponRow(cRow);
      const now = new Date();
      if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
        couponError = `Coupon "${cleanCode}" has expired.`;
      } else if (coupon.usageLimit > 0 && coupon.timesUsed >= coupon.usageLimit) {
        couponError = `Coupon "${cleanCode}" has reached its usage limit.`;
      } else if (subtotal < coupon.minOrderValue) {
        couponError = `Minimum order of ₹${coupon.minOrderValue} required for ${cleanCode}.`;
      } else {
        const lookupEmail = String(customerEmail || '').trim().toLowerCase();
        let blocked = false;
        if (coupon.firstOrderOnly && (userId || lookupEmail)) {
          const prevCount = db
            .prepare(
              `SELECT COUNT(*) as cnt FROM orders WHERE status != 'cancelled' AND (user_id = ? OR LOWER(customer_email) = ?)`
            )
            .get(userId || '__none__', lookupEmail || '__none__').cnt;
          if (prevCount > 0) {
            couponError = `${cleanCode} is valid on first order only.`;
            blocked = true;
          }
        }
        if (!blocked && coupon.singleUse && lookupEmail) {
          const used = db
            .prepare(
              'SELECT COUNT(*) as cnt FROM coupon_usages WHERE coupon_id = ? AND LOWER(user_email) = ?'
            )
            .get(coupon.id, lookupEmail).cnt;
          if (used > 0) {
            couponError = `You have already used ${cleanCode}.`;
            blocked = true;
          }
        }
        if (!blocked) {
          let calc =
            coupon.discountType === 'percentage'
              ? (subtotal * coupon.discountValue) / 100
              : coupon.discountValue;
          if (coupon.maxDiscount > 0) {
            calc = Math.min(calc, coupon.maxDiscount);
          }
          discountAmount = Number(Math.min(subtotal, calc).toFixed(2));
          couponApplied = coupon;
        }
      }
    }
  }

  // Loyalty Point Redemption validation (server-side!)
  let loyaltyRedeemedPoints = 0;
  let loyaltyDiscount = 0;
  const requestedPoints = Math.max(0, Math.floor(Number(redeemPoints) || 0));
  if (requestedPoints > 0 && userId) {
    const userRow = db
      .prepare('SELECT loyalty_points FROM users WHERE id = ?')
      .get(userId);
    const availablePts = Number(userRow?.loyalty_points || 0);
    const minPts = Number(commerce.minPointsToRedeem || 50);
    const valPerPt = Number(commerce.pointRedemptionValueInr || 0.5);
    const maxInr =
      ((subtotal - discountAmount) * Number(commerce.maxRedeemPercentOfSubtotal || 30)) /
      100;
    const maxPtsByOrder = Math.floor(maxInr / Math.max(0.05, valPerPt));

    if (availablePts >= minPts && requestedPoints >= minPts) {
      loyaltyRedeemedPoints = Math.min(requestedPoints, availablePts, maxPtsByOrder);
      loyaltyDiscount = Number((loyaltyRedeemedPoints * valPerPt).toFixed(2));
    }
  }

  const taxableBase = Math.max(0, subtotal - discountAmount - loyaltyDiscount);
  const taxRatePercent = Number(commerce.taxRatePercent ?? 5);
  const taxAmount = Number(((taxableBase * taxRatePercent) / 100).toFixed(2));

  let deliveryFee = 0;
  if (orderType === 'delivery') {
    deliveryFee =
      subtotal >= Number(commerce.freeDeliveryAbove || 299)
        ? 0
        : Number(commerce.deliveryCharge || 35);
  }

  const totalPayable = Number(
    Math.max(0, taxableBase + taxAmount + deliveryFee).toFixed(2)
  );

  return {
    resolvedItems,
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount,
    couponApplied,
    couponError,
    loyaltyRedeemedPoints,
    loyaltyDiscount,
    taxRatePercent,
    taxAmount,
    deliveryFee,
    totalPayable,
    totalBeans,
  };
}

// ---------- Automated Ingredient Inventory Deduction ----------
export function deductOrderInventory(db, orderId, orderItems, actor = 'system') {
  const orderRow = db
    .prepare('SELECT inventory_deducted, order_number FROM orders WHERE id = ?')
    .get(orderId);
  if (!orderRow || orderRow.inventory_deducted) return;

  const sizeFactor = { Small: 0.75, Medium: 1, Large: 1.35 };
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    for (const item of orderItems) {
      const prodRow = db
        .prepare('SELECT recipe_json FROM products WHERE id = ?')
        .get(item.product_id || item.itemId);
      if (!prodRow) continue;
      const recipe = JSON.parse(prodRow.recipe_json || '{}');
      const mult = (sizeFactor[item.size] || 1) * Number(item.quantity || 1);

      for (const [ingId, baseQty] of Object.entries(recipe)) {
        const consume = Number((Number(baseQty) * mult).toFixed(2));
        if (consume <= 0) continue;
        const ing = db
          .prepare('SELECT * FROM ingredients WHERE id = ?')
          .get(ingId);
        if (!ing) continue;

        const nextStock = Math.max(0, Number((ing.stock_qty - consume).toFixed(2)));
        db.prepare(
          'UPDATE ingredients SET stock_qty = ?, updated_at = ? WHERE id = ?'
        ).run(nextStock, now, ingId);

        db.prepare(`
          INSERT INTO inventory_logs (id, ingredient_id, change_qty, reason, order_id, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          `ilog-${crypto.randomUUID().slice(0, 8)}`,
          ingId,
          -consume,
          `Auto consumption for Order #${orderRow.order_number} (${item.quantity}× ${item.name})`,
          orderId,
          actor,
          now
        );

        if (nextStock <= ing.low_stock_threshold) {
          createNotification(db, {
            recipientScope: 'admin',
            type: nextStock === 0 ? 'out_of_stock' : 'low_stock',
            title:
              nextStock === 0
                ? `Out of Stock: ${ing.name}`
                : `Low Inventory Alert: ${ing.name}`,
            message: `${ing.name} is at ${nextStock} ${ing.unit} (threshold ${ing.low_stock_threshold} ${ing.unit}).`,
            meta: { ingredientId: ingId, stockQty: nextStock },
          });
        }
      }
    }

    db.prepare('UPDATE orders SET inventory_deducted = 1 WHERE id = ?').run(orderId);
  });

  tx();
}

// ---------- Business Analytics Engine ----------
export function computeAnalytics(db, period = 'weekly') {
  const orders = db
    .prepare('SELECT * FROM orders ORDER BY created_at DESC')
    .all();
  const orderItems = db
    .prepare(`
      SELECT oi.*, o.status as order_status, o.created_at as order_created_at
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
    `)
    .all();
  const customersCount = db
    .prepare(`SELECT COUNT(*) as cnt FROM users WHERE role = 'customer' AND active = 1`)
    .get().cnt;

  const validOrders = orders.filter((o) => o.status !== 'cancelled');
  const todayStr = new Date().toISOString().slice(0, 10);
  const totalSales = Number(
    validOrders.reduce((s, o) => s + Number(o.total_payable), 0).toFixed(2)
  );
  const todayRevenue = Number(
    validOrders
      .filter((o) => String(o.created_at).startsWith(todayStr))
      .reduce((s, o) => s + Number(o.total_payable), 0)
      .toFixed(2)
  );
  const pendingOrders = orders.filter((o) =>
    ['order_placed', 'order_accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(
      o.status
    )
  ).length;
  const completedOrders = orders.filter((o) => o.status === 'delivered').length;
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;
  const avgOrderValue =
    validOrders.length > 0
      ? Number((totalSales / validOrders.length).toFixed(2))
      : 0;

  // Customer retention (customers with 2+ orders / total ordering customers)
  const ordersByEmail = new Map();
  for (const o of validOrders) {
    const key = (o.customer_email || o.customer_name || o.id).toLowerCase();
    ordersByEmail.set(key, (ordersByEmail.get(key) || 0) + 1);
  }
  const repeatCustomers = Array.from(ordersByEmail.values()).filter((c) => c >= 2).length;
  const retentionRatePercent =
    ordersByEmail.size > 0
      ? Math.round((repeatCustomers / ordersByEmail.size) * 100)
      : 0;

  // Tea vs Coffee + Popularity
  let teaSalesRevenue = 0;
  let coffeeSalesRevenue = 0;
  let teaCupsSold = 0;
  let coffeeCupsSold = 0;
  const prodStats = new Map();

  for (const oi of orderItems) {
    if (oi.order_status === 'cancelled') continue;
    const rev = Number(oi.unit_price) * Number(oi.quantity);
    if (oi.category === 'tea') {
      teaSalesRevenue += rev;
      teaCupsSold += Number(oi.quantity);
    } else {
      coffeeSalesRevenue += rev;
      coffeeCupsSold += Number(oi.quantity);
    }
    const curr = prodStats.get(oi.product_id) || {
      id: oi.product_id,
      name: oi.name,
      category: oi.category,
      cups: 0,
      revenue: 0,
    };
    curr.cups += Number(oi.quantity);
    curr.revenue += rev;
    prodStats.set(oi.product_id, curr);
  }

  // Include 0-sale products for least-selling insights
  const allProds = db.prepare('SELECT id, name, category FROM products').all();
  for (const p of allProds) {
    if (!prodStats.has(p.id)) {
      prodStats.set(p.id, {
        id: p.id,
        name: p.name,
        category: p.category,
        cups: 0,
        revenue: 0,
      });
    }
  }

  const sortedProds = Array.from(prodStats.values()).sort(
    (a, b) => b.cups - a.cups || b.revenue - a.revenue
  );
  const bestSelling = sortedProds.slice(0, 6);
  const leastSelling = [...sortedProds].reverse().slice(0, 5);

  // Revenue time series
  const now = new Date();
  const revenueSeries = [];
  if (period === 'daily') {
    for (let h = 7; h <= 22; h += 3) {
      const label = `${h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'}`;
      const matched = validOrders.filter((o) => {
        const d = new Date(o.created_at);
        return (
          o.created_at.startsWith(todayStr) &&
          d.getHours() >= h &&
          d.getHours() < h + 3
        );
      });
      revenueSeries.push({
        label,
        revenue: Math.round(matched.reduce((s, o) => s + Number(o.total_payable), 0)),
        orders: matched.length,
      });
    }
  } else if (period === 'monthly') {
    for (let w = 3; w >= 0; w--) {
      const start = new Date(now.getTime() - (w + 1) * 7 * 86400000);
      const end = new Date(now.getTime() - w * 7 * 86400000);
      const matched = validOrders.filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= start.getTime() && t < end.getTime();
      });
      revenueSeries.push({
        label: `Wk ${4 - w}`,
        revenue: Math.round(matched.reduce((s, o) => s + Number(o.total_payable), 0)),
        orders: matched.length,
      });
    }
  } else if (period === 'yearly') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let m = 5; m >= 0; m--) {
      const target = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const ym = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
      const matched = validOrders.filter((o) => String(o.created_at).startsWith(ym));
      revenueSeries.push({
        label: months[target.getMonth()],
        revenue: Math.round(matched.reduce((s, o) => s + Number(o.total_payable), 0)),
        orders: matched.length,
      });
    }
  } else {
    // weekly (last 7 days)
    for (let dOffset = 6; dOffset >= 0; dOffset--) {
      const dt = new Date(now.getTime() - dOffset * 86400000);
      const key = dt.toISOString().slice(0, 10);
      const matched = validOrders.filter((o) => String(o.created_at).startsWith(key));
      revenueSeries.push({
        label: DAY_NAMES[dt.getDay()],
        revenue: Math.round(matched.reduce((s, o) => s + Number(o.total_payable), 0)),
        orders: matched.length,
      });
    }
  }

  // Peak Hours
  const hourBuckets = [
    { label: '7-10 AM', min: 7, max: 10 },
    { label: '10-1 PM', min: 10, max: 13 },
    { label: '1-4 PM', min: 13, max: 16 },
    { label: '4-7 PM', min: 16, max: 19 },
    { label: '7-11 PM', min: 19, max: 24 },
  ];
  const peakHours = hourBuckets.map((b) => ({
    hour: b.label,
    orders: validOrders.filter((o) => {
      const h = new Date(o.created_at).getHours();
      return h >= b.min && h < b.max;
    }).length,
  }));

  // Payment Method Breakdown
  const payMap = new Map();
  for (const o of validOrders) {
    const m = o.payment_method || 'cod';
    const cur = payMap.get(m) || { method: m, count: 0, amount: 0 };
    cur.count += 1;
    cur.amount = Number((cur.amount + Number(o.total_payable)).toFixed(2));
    payMap.set(m, cur);
  }

  // Coupon stats
  const cpnMap = new Map();
  for (const o of validOrders) {
    if (!o.coupon_code) continue;
    const cur = cpnMap.get(o.coupon_code) || {
      code: o.coupon_code,
      uses: 0,
      discountTotal: 0,
    };
    cur.uses += 1;
    cur.discountTotal = Number(
      (cur.discountTotal + Number(o.discount_amount)).toFixed(2)
    );
    cpnMap.set(o.coupon_code, cur);
  }

  return {
    totalSales,
    todayRevenue,
    totalOrders: orders.length,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    activeCustomers: customersCount,
    avgOrderValue,
    retentionRatePercent,
    teaSalesRevenue: Number(teaSalesRevenue.toFixed(2)),
    coffeeSalesRevenue: Number(coffeeSalesRevenue.toFixed(2)),
    teaCupsSold,
    coffeeCupsSold,
    bestSelling,
    leastSelling,
    revenueSeries,
    peakHours,
    paymentBreakdown: Array.from(payMap.values()),
    couponStats: Array.from(cpnMap.values()),
  };
}
