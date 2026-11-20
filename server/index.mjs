import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  getDb,
  seedDatabaseIfEmpty,
  hashPassword,
  verifyPassword,
  signAuthToken,
  verifyAuthToken,
  createPaymentHmac,
  verifyPaymentHmac,
  getSetting,
  setSetting,
  mapProductRow,
  mapCouponRow,
  mapOrderRow,
  mapReviewRow,
  getPublicUserProfile,
  buildFullAdminSnapshot,
  recalcProductRating,
} from './db.mjs';
import {
  addSseClient,
  broadcastEvent,
  createNotification,
  isShopAcceptingOrders,
  calculateCartQuote,
  deductOrderInventory,
  computeAnalytics,
} from './services.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const app = express();
const PORT = Number(process.env.PORT || 4000);

// Initialize SQLite & run migrations
const db = getDb();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline singlefile & Pexels CDN images
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 450,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { error: 'Too many authentication attempts. Please try again shortly.' },
});
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// ---------- Auth Middleware ----------
function getBearerUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';
  return verifyAuthToken(token);
}

function requireUser(req, res, next) {
  const payload = getBearerUser(req);
  if (!payload || !payload.id) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  const u = db.prepare('SELECT id, email, name, role, active FROM users WHERE id = ?').get(payload.id);
  if (!u || !u.active) {
    return res.status(401).json({ error: 'Account unavailable or signed out.' });
  }
  req.user = u;
  return next();
}

function requireAdmin(req, res, next) {
  const payload = getBearerUser(req);
  if (!payload || !payload.id) {
    return res.status(401).json({ error: 'Unauthorized. Admin login required.' });
  }
  const u = db
    .prepare('SELECT id, username, email, name, role, active FROM users WHERE id = ?')
    .get(payload.id);
  if (!u || !u.active || !['owner', 'staff'].includes(u.role)) {
    return res.status(403).json({ error: 'Forbidden. Admin permissions required.' });
  }
  req.admin = {
    id: u.id,
    username: u.username || 'admin',
    email: u.email,
    name: u.name,
    role: u.role,
  };
  return next();
}

// ---------- Health & Real-Time SSE ----------
app.get('/api/health', (_req, res) => {
  const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const customerCount = db
    .prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'customer'`)
    .get().c;

  res.json({
    ok: true,
    service: 'kulhad-kaapi-fullstack-backend',
    database: 'sqlite-relational',
    razorpayMode:
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
        ? 'live'
        : 'sandbox',
    uptimeSec: Math.round(process.uptime()),
    counts: { menuItems: prodCount, orders: orderCount, customers: customerCount },
  });
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  addSseClient(res);
});

// ---------- Public Storefront & Catalog ----------
app.get('/api/storefront', (_req, res) => {
  const snap = buildFullAdminSnapshot(db);
  const publicCoupons = snap.coupons.filter((c) => c.active);
  const publicReviews = snap.reviews.filter((r) => r.status === 'approved');

  res.json({
    brand: snap.brand,
    availability: snap.availability,
    commerce: snap.commerce,
    display: snap.display,
    rewards: snap.rewards,
    locations: snap.locations,
    menuItems: snap.menuItems,
    coupons: publicCoupons,
    reviews: publicReviews,
    testimonials: snap.testimonials,
    pricingTiers: snap.pricingTiers,
    faqs: snap.faqs,
    updatedAt: snap.updatedAt,
    stats: {
      totalOrders: snap.orders.length,
      totalMembers: snap.members.length,
    },
  });
});

// Advanced Search & Filtering API
app.get('/api/products/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || 'all');
  const temp = String(req.query.temp || 'all');
  const maxPrice = Number(req.query.maxPrice || 9999);
  const sort = String(req.query.sort || 'popular');

  let items = db
    .prepare('SELECT * FROM products WHERE displayed = 1 ORDER BY sort_order ASC')
    .all()
    .map(mapProductRow);

  if (category === 'tea' || category === 'coffee') {
    items = items.filter((p) => p.category === category);
  }
  if (temp === 'hot') items = items.filter((p) => p.supportsHot);
  if (temp === 'cold') items = items.filter((p) => p.supportsCold);
  if (maxPrice > 0) items = items.filter((p) => p.price <= maxPrice);

  if (q) {
    items = items.filter((p) => {
      const hay = [
        p.name,
        p.hindiName || '',
        p.subtitle,
        p.category,
        p.origin,
        p.description,
        ...(p.notes || []),
        ...(p.ingredients || []),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  if (sort === 'price_asc') items.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') items.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') items.sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0));
  else items.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));

  res.json({ items, total: items.length });
});

// ---------- Customer Authentication & Accounts ----------
app.post('/api/auth/register', (req, res) => {
  const {
    name = '',
    email = '',
    phone = '',
    password = '',
    preferredDrink = 'Masala Chai',
    referralCode = '',
    birthday = '',
  } = req.body || {};

  const cleanEmail = String(email).trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE LOWER(email) = ?')
    .get(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const rewards = getSetting(db, 'rewards', { welcomeBonusBeans: 100, referralBonusBeans: 125 });
  const userId = `usr-${crypto.randomUUID().slice(0, 8)}`;
  const slug = (String(name) || cleanEmail.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10);
  const myRefCode = `${slug || 'chai'}-${Math.floor(100 + Math.random() * 899)}`;
  const verificationCode = String(Math.floor(100000 + Math.random() * 899999));
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (
        id, name, email, phone, password_hash, role, email_verified, verification_token,
        birthday, loyalty_points, membership_level, referral_code, referred_by, preferred_drink, created_at
      ) VALUES (?, ?, ?, ?, ?, 'customer', 0, ?, ?, ?, 'Daily Tapri Club (Free)', ?, ?, ?, ?)
    `).run(
      userId,
      String(name).trim() || cleanEmail.split('@')[0],
      cleanEmail,
      String(phone).trim(),
      hashPassword(password),
      verificationCode,
      String(birthday).trim(),
      Number(rewards.welcomeBonusBeans || 100),
      myRefCode,
      String(referralCode).trim(),
      String(preferredDrink),
      now
    );

    db.prepare(`
      INSERT INTO loyalty_transactions (id, user_id, points_delta, type, description, created_at)
      VALUES (?, ?, ?, 'welcome', ?, ?)
    `).run(
      `ltx-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      Number(rewards.welcomeBonusBeans || 100),
      'Welcome Chai Coins bonus on account signup',
      now
    );

    if (referralCode) {
      const referrer = db
        .prepare('SELECT id, name FROM users WHERE LOWER(referral_code) = ?')
        .get(String(referralCode).trim().toLowerCase());
      if (referrer) {
        const bonus = Number(rewards.referralBonusBeans || 125);
        db.prepare(
          'UPDATE users SET loyalty_points = loyalty_points + ?, referrals_count = referrals_count + 1 WHERE id = ?'
        ).run(bonus, referrer.id);
        db.prepare(`
          INSERT INTO loyalty_transactions (id, user_id, points_delta, type, description, created_at)
          VALUES (?, ?, ?, 'referral', ?, ?)
        `).run(
          `ltx-${crypto.randomUUID().slice(0, 8)}`,
          referrer.id,
          bonus,
          `Referral bonus: ${name || cleanEmail} joined using your link`,
          now
        );
      }
    }
  });
  tx();

  const profile = getPublicUserProfile(db, userId);
  const token = signAuthToken({ id: userId, email: cleanEmail, role: 'customer' });
  createNotification(db, {
    recipientScope: 'customer',
    userId,
    type: 'welcome',
    title: 'नमस्ते! Welcome to Kulhad & Kaapi',
    message: `You received +${rewards.welcomeBonusBeans || 100} Chai Coins. Verify your email with code ${verificationCode}.`,
  });

  return res.status(201).json({ token, user: profile });
});

app.post('/api/auth/customer/login', (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const cleanEmail = String(email).trim().toLowerCase();
  const u = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail);
  if (!u || !verifyPassword(String(password), u.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (!u.active) {
    return res.status(403).json({ error: 'Your account has been paused by the café admin.' });
  }
  const token = signAuthToken({ id: u.id, email: u.email, role: u.role });
  const profile = getPublicUserProfile(db, u.id);
  return res.json({ token, user: profile });
});

app.post('/api/auth/verify-email', requireUser, (req, res) => {
  const { code = '' } = req.body || {};
  const u = db.prepare('SELECT verification_token FROM users WHERE id = ?').get(req.user.id);
  if (!u || String(code).trim() !== String(u.verification_token || '')) {
    return res.status(400).json({ error: 'Invalid verification code.' });
  }
  db.prepare(
    'UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?'
  ).run(req.user.id);
  return res.json({ ok: true, user: getPublicUserProfile(db, req.user.id) });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
  const u = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
  if (!u) {
    return res.json({
      ok: true,
      message: 'If this email exists, a reset code has been generated.',
    });
  }
  const resetCode = String(Math.floor(100000 + Math.random() * 899999));
  const expires = new Date(Date.now() + 1000 * 60 * 20).toISOString();
  db.prepare(
    'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?'
  ).run(resetCode, expires, u.id);
  return res.json({
    ok: true,
    message: 'Reset code generated (configure SMTP in .env for email delivery).',
    devResetCode: process.env.SMTP_HOST ? undefined : resetCode,
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email = '', code = '', newPassword = '' } = req.body || {};
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const u = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail);
  if (
    !u ||
    !u.reset_token ||
    String(code).trim() !== String(u.reset_token) ||
    new Date(u.reset_token_expires) < new Date()
  ) {
    return res.status(400).json({ error: 'Invalid or expired password reset code.' });
  }
  db.prepare(
    'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?'
  ).run(hashPassword(newPassword), u.id);
  return res.json({ ok: true });
});

// Customer Profile, Addresses, Favourites, Saved Cart, Loyalty History & Notifications
app.get('/api/customer/me', requireUser, (req, res) => {
  const profile = getPublicUserProfile(db, req.user.id);
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? OR LOWER(customer_email) = ? ORDER BY created_at DESC LIMIT 40')
    .all(req.user.id, req.user.email.toLowerCase())
    .map((o) => mapOrderRow(db, o));
  const loyaltyHistory = db
    .prepare('SELECT * FROM loyalty_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 40')
    .all(req.user.id)
    .map((l) => ({
      id: l.id,
      userId: l.user_id,
      orderId: l.order_id || undefined,
      pointsDelta: Number(l.points_delta),
      type: l.type,
      description: l.description,
      createdAt: l.created_at,
    }));
  const notifications = db
    .prepare(`SELECT * FROM notifications WHERE recipient_scope = 'customer' AND user_id = ? ORDER BY created_at DESC LIMIT 30`)
    .all(req.user.id)
    .map((n) => ({
      id: n.id,
      recipientScope: n.recipient_scope,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: Boolean(n.read),
      createdAt: n.created_at,
    }));
  const cartItems = db
    .prepare('SELECT * FROM cart_items WHERE user_id = ?')
    .all(req.user.id)
    .map((c) => ({
      lineKey: c.id,
      itemId: c.product_id,
      quantity: Number(c.quantity),
      size: c.size,
      temperature: c.temperature,
      sugarPreference: c.sugar_preference,
      milkStrength: c.milk_strength,
      specialInstructions: c.special_instructions || '',
    }));

  res.json({ user: profile, orders, loyaltyHistory, notifications, cartItems });
});

app.put('/api/customer/profile', requireUser, (req, res) => {
  const { name, phone, birthday, preferredDrink } = req.body || {};
  db.prepare(
    `UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), birthday = COALESCE(?, birthday), preferred_drink = COALESCE(?, preferred_drink) WHERE id = ?`
  ).run(
    name !== undefined ? String(name).trim() : null,
    phone !== undefined ? String(phone).trim() : null,
    birthday !== undefined ? String(birthday).trim() : null,
    preferredDrink !== undefined ? String(preferredDrink).trim() : null,
    req.user.id
  );
  res.json({ user: getPublicUserProfile(db, req.user.id) });
});

app.post('/api/customer/favourites/:productId', requireUser, (req, res) => {
  const u = db.prepare('SELECT favourites_json FROM users WHERE id = ?').get(req.user.id);
  const favs = new Set(JSON.parse(u?.favourites_json || '[]'));
  const pid = req.params.productId;
  if (favs.has(pid)) favs.delete(pid);
  else favs.add(pid);
  db.prepare('UPDATE users SET favourites_json = ? WHERE id = ?').run(
    JSON.stringify(Array.from(favs)),
    req.user.id
  );
  res.json({ favourites: Array.from(favs) });
});

app.post('/api/customer/addresses', requireUser, (req, res) => {
  const {
    label = 'Home',
    recipientName = req.user.name,
    phone = '',
    line1 = '',
    landmark = '',
    city = 'Bengaluru',
    pincode = '',
    isDefault = false,
  } = req.body || {};
  if (!line1.trim() || !pincode.trim()) {
    return res.status(400).json({ error: 'Address line and pincode are required.' });
  }
  const id = `addr-${crypto.randomUUID().slice(0, 8)}`;
  if (isDefault) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }
  db.prepare(`
    INSERT INTO addresses (id, user_id, label, recipient_name, phone, line1, landmark, city, pincode, is_default, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.user.id,
    String(label),
    String(recipientName),
    String(phone),
    String(line1).trim(),
    String(landmark).trim(),
    String(city).trim(),
    String(pincode).trim(),
    isDefault ? 1 : 0,
    new Date().toISOString()
  );
  res.status(201).json({ user: getPublicUserProfile(db, req.user.id) });
});

app.delete('/api/customer/addresses/:id', requireUser, (req, res) => {
  db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.user.id
  );
  res.json({ user: getPublicUserProfile(db, req.user.id) });
});

// Sync logged-in user cart with server DB
app.put('/api/cart', requireUser, (req, res) => {
  const { items = [] } = req.body || {};
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO carts (user_id, updated_at) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET updated_at = excluded.updated_at'
    ).run(req.user.id, now);
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    const ins = db.prepare(`
      INSERT INTO cart_items (id, user_id, product_id, quantity, size, temperature, sugar_preference, milk_strength, special_instructions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const it of items) {
      const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(it.itemId);
      if (!exists) continue;
      ins.run(
        it.lineKey || `ci-${crypto.randomUUID().slice(0, 8)}`,
        req.user.id,
        it.itemId,
        Math.max(1, Number(it.quantity) || 1),
        it.size || 'Medium',
        it.temperature || 'hot',
        it.sugarPreference || 'Regular Sugar',
        it.milkStrength || 'Standard',
        it.specialInstructions || ''
      );
    }
  });
  tx();
  res.json({ ok: true });
});

app.post('/api/customer/notifications/read', requireUser, (req, res) => {
  db.prepare(
    `UPDATE notifications SET read = 1 WHERE recipient_scope = 'customer' AND user_id = ?`
  ).run(req.user.id);
  res.json({ ok: true });
});

// Quick Ritual Club / Free Cup Registration (existing working feature preserved!)
app.post('/api/members', (req, res) => {
  const {
    name = 'Chai Lover',
    email = '',
    plan = 'Daily Tapri Club (Free)',
    preferredDrink = 'Masala Chai',
  } = req.body || {};
  const cleanEmail = String(email).trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  const existing = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail);
  if (existing) {
    db.prepare('UPDATE users SET membership_level = ?, preferred_drink = ? WHERE id = ?').run(
      String(plan),
      String(preferredDrink),
      existing.id
    );
    return res.json({
      member: {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        plan: String(plan),
        preferredDrink: String(preferredDrink),
        beansBalance: Number(existing.loyalty_points),
        referralCode: existing.referral_code,
        referralsCount: Number(existing.referrals_count),
        joinedAt: existing.created_at,
      },
      existing: true,
    });
  }

  const rewards = getSetting(db, 'rewards', { welcomeBonusBeans: 100 });
  const id = `mem-${crypto.randomUUID().slice(0, 8)}`;
  const slug = (String(name) || cleanEmail.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12);
  const referralCode = `${slug || 'chai'}-${Math.floor(100 + Math.random() * 899)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, email_verified, loyalty_points, membership_level, referral_code, preferred_drink, created_at)
    VALUES (?, ?, ?, ?, 'customer', 1, ?, ?, ?, ?, ?)
  `).run(
    id,
    String(name).trim() || cleanEmail.split('@')[0],
    cleanEmail,
    hashPassword(crypto.randomBytes(12).toString('hex')),
    Number(rewards.welcomeBonusBeans || 100),
    String(plan),
    referralCode,
    String(preferredDrink),
    now
  );

  return res.status(201).json({
    member: {
      id,
      name: String(name).trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      plan: String(plan),
      preferredDrink: String(preferredDrink),
      beansBalance: Number(rewards.welcomeBonusBeans || 100),
      referralCode,
      referralsCount: 0,
      joinedAt: now,
    },
    existing: false,
  });
});

// ---------- Cart Pricing Quote (Server-Validated) ----------
app.post('/api/cart/quote', (req, res) => {
  const tokenUser = getBearerUser(req);
  const quote = calculateCartQuote(db, {
    ...(req.body || {}),
    userId: tokenUser?.id || null,
  });
  if (quote.error) {
    return res.status(400).json({ error: quote.error });
  }
  const { resolvedItems: _unused, ...cleanQuote } = quote;
  return res.json(cleanQuote);
});

// ---------- Orders & Payment Gateway (Razorpay Sandbox/Live + COD) ----------
app.post('/api/orders', (req, res) => {
  const availability = getSetting(db, 'availability', {});
  const commerce = getSetting(db, 'commerce', {});
  const tokenUser = getBearerUser(req);

  const {
    customerName = 'Guest Sipper',
    customerEmail = '',
    customerPhone = '',
    orderType = 'pickup',
    tableNumber = '',
    scheduledFor = '',
    deliveryAddress = null,
    pickupNote = '',
    couponCode = '',
    redeemPoints = 0,
    paymentMethod = 'cod',
    idempotencyKey = '',
    items = [],
  } = req.body || {};

  if (!isShopAcceptingOrders(availability, Boolean(scheduledFor))) {
    return res.status(400).json({
      error:
        availability.closedNotice ||
        'Ordering is currently paused. Please schedule for opening hours.',
    });
  }

  if (orderType === 'delivery' && !deliveryAddress?.line1) {
    return res.status(400).json({ error: 'Delivery address is required for home delivery.' });
  }

  // Prevent duplicate orders using idempotencyKey
  if (idempotencyKey) {
    const dupPay = db
      .prepare('SELECT order_id FROM payments WHERE idempotency_key = ?')
      .get(String(idempotencyKey));
    if (dupPay) {
      const existingOrderRow = db
        .prepare('SELECT * FROM orders WHERE id = ?')
        .get(dupPay.order_id);
      if (existingOrderRow) {
        return res.status(200).json({
          order: mapOrderRow(db, existingOrderRow),
          duplicatePrevented: true,
        });
      }
    }
  }

  const quote = calculateCartQuote(db, {
    items,
    orderType,
    couponCode,
    redeemPoints,
    userId: tokenUser?.id || null,
    customerEmail: customerEmail || tokenUser?.email || '',
  });
  if (quote.error) {
    return res.status(400).json({ error: quote.error });
  }

  const orderId = `ord-${crypto.randomUUID().slice(0, 8)}`;
  // order_number is UNIQUE; re-roll on collision instead of failing the order.
  // shortcut: loops forever once all ~8800 numbers are taken, widen the range before then.
  let orderNumber;
  do {
    orderNumber = `CKP-${Math.floor(1050 + Math.random() * 8800)}`;
  } while (db.prepare('SELECT 1 FROM orders WHERE order_number = ?').get(orderNumber));
  const now = new Date().toISOString();
  const isRazorpay = String(paymentMethod).startsWith('razorpay');
  const gatewayMode =
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
      ? 'live'
      : 'sandbox';
  const gatewayOrderId = isRazorpay
    ? `order_${gatewayMode === 'live' ? 'rzp' : 'test'}_${crypto.randomUUID().slice(0, 10)}`
    : null;

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO orders (
        id, order_number, user_id, customer_name, customer_email, customer_phone,
        order_type, table_number, scheduled_for, delivery_address_json, pickup_note,
        subtotal, discount_amount, coupon_code, loyalty_redeemed_points, loyalty_discount,
        tax_amount, delivery_fee, total_payable, total_beans, payment_method,
        payment_status, status, inventory_deducted, loyalty_awarded, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'order_placed', 0, 0, ?, ?)
    `).run(
      orderId,
      orderNumber,
      tokenUser?.id || null,
      String(customerName).trim() || 'Guest Sipper',
      String(customerEmail || tokenUser?.email || '').trim().toLowerCase(),
      String(customerPhone).trim(),
      ['pickup', 'delivery', 'dine_in'].includes(orderType) ? orderType : 'pickup',
      String(tableNumber).trim(),
      String(scheduledFor).trim(),
      deliveryAddress ? JSON.stringify(deliveryAddress) : '',
      String(pickupNote).trim(),
      quote.subtotal,
      quote.discountAmount,
      quote.couponApplied?.code || '',
      quote.loyaltyRedeemedPoints,
      quote.loyaltyDiscount,
      quote.taxAmount,
      quote.deliveryFee,
      quote.totalPayable,
      quote.totalBeans,
      paymentMethod,
      'pending',
      now,
      now
    );

    const insItem = db.prepare(`
      INSERT INTO order_items (
        id, order_id, product_id, name, category, size, temperature,
        sugar_preference, milk_strength, special_instructions, unit_price, quantity, beans_earned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of quote.resolvedItems) {
      insItem.run(
        `oi-${crypto.randomUUID().slice(0, 8)}`,
        orderId,
        item.itemId,
        item.name,
        item.category,
        item.size,
        item.temperature,
        item.sugarPreference,
        item.milkStrength,
        item.specialInstructions,
        item.unitPrice,
        item.quantity,
        item.beansEarned
      );

      // Decrement beverage stock
      const nextStock = Math.max(0, item.product.stockCount - item.quantity);
      db.prepare(
        'UPDATE products SET stock_count = ?, available = ?, popularity_score = popularity_score + ? WHERE id = ?'
      ).run(nextStock, nextStock > 0 ? 1 : 0, item.quantity, item.itemId);
    }

    // Track Coupon Usage
    if (quote.couponApplied) {
      db.prepare('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?').run(
        quote.couponApplied.id
      );
      db.prepare(`
        INSERT INTO coupon_usages (id, coupon_id, user_email, order_id, used_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        `cu-${crypto.randomUUID().slice(0, 8)}`,
        quote.couponApplied.id,
        String(customerEmail || tokenUser?.email || customerName).toLowerCase(),
        orderId,
        now
      );
    }

    // Deduct redeemed loyalty points immediately
    if (quote.loyaltyRedeemedPoints > 0 && tokenUser?.id) {
      db.prepare(
        'UPDATE users SET loyalty_points = MAX(0, loyalty_points - ?) WHERE id = ?'
      ).run(quote.loyaltyRedeemedPoints, tokenUser.id);
      db.prepare(`
        INSERT INTO loyalty_transactions (id, user_id, order_id, points_delta, type, description, created_at)
        VALUES (?, ?, ?, ?, 'redeem', ?, ?)
      `).run(
        `ltx-${crypto.randomUUID().slice(0, 8)}`,
        tokenUser.id,
        orderId,
        -quote.loyaltyRedeemedPoints,
        `Redeemed ₹${quote.loyaltyDiscount} on Order #${orderNumber}`,
        now
      );
    }

    // Create Payment record
    db.prepare(`
      INSERT INTO payments (
        id, order_id, gateway, gateway_order_id, method, amount, currency, status, idempotency_key, mode, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'INR', 'created', ?, ?, ?, ?)
    `).run(
      `pay-${crypto.randomUUID().slice(0, 8)}`,
      orderId,
      isRazorpay ? `razorpay_${gatewayMode}` : 'cod',
      gatewayOrderId,
      paymentMethod,
      quote.totalPayable,
      idempotencyKey || `idem-${orderId}`,
      gatewayMode,
      now,
      now
    );

    // Clear saved cart for logged-in user
    if (tokenUser?.id) {
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(tokenUser.id);
    }
  });
  tx();

  // Deduct ingredient inventory immediately if configured for order_placed
  if ((commerce.autoDeductInventoryOn || 'order_placed') === 'order_placed') {
    deductOrderInventory(
      db,
      orderId,
      quote.resolvedItems.map((i) => ({ ...i, product_id: i.itemId })),
      'order_placed'
    );
  }

  const createdRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const fullOrder = mapOrderRow(db, createdRow);

  createNotification(db, {
    recipientScope: 'admin',
    type: 'new_order',
    title: `New ${orderType.toUpperCase()} Order #${orderNumber}`,
    message: `${fullOrder.customerName} ordered ${fullOrder.items.length} beverage(s) · ₹${fullOrder.totalPayable}`,
    meta: { orderId, orderNumber },
  });
  if (tokenUser?.id) {
    createNotification(db, {
      recipientScope: 'customer',
      userId: tokenUser.id,
      type: 'order_placed',
      title: `Order #${orderNumber} Placed`,
      message: `We received your ${orderType} order (₹${fullOrder.totalPayable}).`,
      meta: { orderNumber },
    });
  }
  broadcastEvent('order_created', { orderNumber, status: fullOrder.status });

  const updatedProducts = db
    .prepare('SELECT * FROM products ORDER BY sort_order ASC')
    .all()
    .map(mapProductRow);

  return res.status(201).json({
    order: fullOrder,
    paymentSession: isRazorpay
      ? {
          gateway: 'razorpay',
          mode: gatewayMode,
          gatewayOrderId,
          amountPaise: Math.round(quote.totalPayable * 100),
          currency: 'INR',
          keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_sandbox_demo',
          sandboxNotice:
            gatewayMode === 'sandbox'
              ? 'Sandbox Test Mode: Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env to enable live Razorpay transactions.'
              : undefined,
        }
      : null,
    menuItems: updatedProducts,
  });
});

// Verify Razorpay Payment Signature (Server-Side HMAC Verification + Duplicate Prevention)
app.post('/api/payments/verify', (req, res) => {
  const {
    orderId,
    gatewayOrderId,
    gatewayPaymentId,
    gatewaySignature,
    simulateSuccess = false,
    simulateFailure = false,
  } = req.body || {};

  const payRow = db
    .prepare('SELECT * FROM payments WHERE order_id = ? OR gateway_order_id = ?')
    .get(orderId || '', gatewayOrderId || '');
  if (!payRow) {
    return res.status(404).json({ error: 'Payment session not found.' });
  }
  if (payRow.status === 'captured') {
    const ord = db.prepare('SELECT * FROM orders WHERE id = ?').get(payRow.order_id);
    return res.json({ ok: true, alreadyVerified: true, order: mapOrderRow(db, ord) });
  }

  const now = new Date().toISOString();
  if (simulateFailure) {
    db.prepare('UPDATE payments SET status = ?, updated_at = ? WHERE id = ?').run(
      'failed',
      now,
      payRow.id
    );
    db.prepare('UPDATE orders SET payment_status = ?, updated_at = ? WHERE id = ?').run(
      'failed',
      now,
      payRow.order_id
    );
    createNotification(db, {
      recipientScope: 'admin',
      type: 'payment_failed',
      title: `Payment Failed`,
      message: `Online payment failed for Order ID ${payRow.order_id} (₹${payRow.amount}).`,
    });
    return res.status(400).json({ error: 'Payment declined in gateway test mode. Please retry or switch to Cash on Delivery.' });
  }

  let finalPayId = gatewayPaymentId;
  let finalSig = gatewaySignature;

  // In Sandbox mode, generate genuine server-verified HMAC signature when test confirmation is triggered
  if (payRow.mode === 'sandbox' && simulateSuccess && !finalSig) {
    finalPayId = `pay_test_${crypto.randomUUID().slice(0, 10)}`;
    finalSig = createPaymentHmac(payRow.gateway_order_id, finalPayId);
  }

  if (!verifyPaymentHmac(payRow.gateway_order_id, finalPayId, finalSig)) {
    return res.status(400).json({ error: 'Payment signature verification failed.' });
  }

  db.prepare(`
    UPDATE payments SET gateway_payment_id = ?, gateway_signature = ?, status = 'captured', updated_at = ?
    WHERE id = ?
  `).run(finalPayId, finalSig, now, payRow.id);
  db.prepare(`
    UPDATE orders SET payment_status = 'paid', status = 'order_accepted', updated_at = ?
    WHERE id = ?
  `).run(now, payRow.order_id);

  const ordRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(payRow.order_id);
  const fullOrder = mapOrderRow(db, ordRow);
  if (ordRow.user_id) {
    createNotification(db, {
      recipientScope: 'customer',
      userId: ordRow.user_id,
      type: 'payment_confirmed',
      title: `Payment Verified · #${ordRow.order_number}`,
      message: `₹${ordRow.total_payable} confirmed (${payRow.mode.toUpperCase()}). Your chai & coffee order is accepted!`,
    });
  }
  broadcastEvent('order_updated', {
    orderNumber: fullOrder.orderNumber,
    status: fullOrder.status,
    paymentStatus: fullOrder.paymentStatus,
  });

  return res.json({ ok: true, order: fullOrder });
});

// Razorpay Webhook Endpoint (HMAC-SHA256 verified against RAZORPAY_WEBHOOK_SECRET)
app.post('/api/payments/webhook', (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_sandbox_secret';
  const signature = String(req.headers['x-razorpay-signature'] || '');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body || {}))
    .digest('hex');

  if (signature && signature !== expected) {
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }
  const event = req.body?.event;
  const gwOrderId = req.body?.payload?.payment?.entity?.order_id;
  if (event === 'payment.captured' && gwOrderId) {
    const pay = db
      .prepare('SELECT * FROM payments WHERE gateway_order_id = ?')
      .get(gwOrderId);
    if (pay && pay.status !== 'captured') {
      const now = new Date().toISOString();
      db.prepare(`UPDATE payments SET status = 'captured', updated_at = ? WHERE id = ?`).run(
        now,
        pay.id
      );
      db.prepare(`UPDATE orders SET payment_status = 'paid', updated_at = ? WHERE id = ?`).run(
        now,
        pay.order_id
      );
    }
  }
  return res.json({ received: true });
});

// Public Live Order Tracking
app.get('/api/orders/:orderNumber', (req, res) => {
  const target = String(req.params.orderNumber || '').trim().toUpperCase();
  const row = db
    .prepare('SELECT * FROM orders WHERE UPPER(order_number) = ?')
    .get(target);
  if (!row) return res.status(404).json({ error: 'Order not found.' });
  const mapped = mapOrderRow(db, row);
  return res.json({
    order: {
      id: mapped.id,
      orderNumber: mapped.orderNumber,
      customerName: mapped.customerName,
      orderType: mapped.orderType,
      tableNumber: mapped.tableNumber,
      scheduledFor: mapped.scheduledFor,
      items: mapped.items,
      subtotal: mapped.subtotal,
      discountAmount: mapped.discountAmount,
      loyaltyDiscount: mapped.loyaltyDiscount,
      taxAmount: mapped.taxAmount,
      deliveryFee: mapped.deliveryFee,
      totalPayable: mapped.totalPayable,
      totalBeans: mapped.totalBeans,
      paymentMethod: mapped.paymentMethod,
      paymentStatus: mapped.paymentStatus,
      pickupNote: mapped.pickupNote,
      status: mapped.status,
      createdAt: mapped.createdAt,
    },
  });
});

// ---------- Verified Product Reviews ----------
app.get('/api/reviews/:productId', (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC`
    )
    .all(req.params.productId)
    .map(mapReviewRow);
  res.json({ reviews: rows });
});

app.post('/api/reviews', requireUser, (req, res) => {
  const { productId, rating, comment = '' } = req.body || {};
  const numRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
  if (!productId || !String(comment).trim()) {
    return res.status(400).json({ error: 'Please select a rating and write a short review.' });
  }

  // Enforce verified purchase requirement!
  const bought = db
    .prepare(`
      SELECT COUNT(*) as cnt
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = ? AND o.status != 'cancelled'
        AND (o.user_id = ? OR LOWER(o.customer_email) = ?)
    `)
    .get(productId, req.user.id, req.user.email.toLowerCase()).cnt;

  if (bought === 0) {
    return res.status(403).json({
      error: 'Only verified purchasers of this beverage can submit a review.',
    });
  }

  const id = `rev-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO reviews (id, product_id, user_id, user_name, rating, comment, verified_purchase, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 'approved', ?)
  `).run(
    id,
    productId,
    req.user.id,
    req.user.name,
    numRating,
    String(comment).trim().slice(0, 500),
    now
  );

  recalcProductRating(db, productId);
  const created = mapReviewRow(db.prepare('SELECT * FROM reviews WHERE id = ?').get(id));
  return res.status(201).json({ review: created });
});

app.post('/api/reviews/:id/report', (req, res) => {
  const reason = String(req.body?.reason || 'Inappropriate content').slice(0, 200);
  db.prepare('UPDATE reviews SET reported = 1, report_reason = ? WHERE id = ?').run(
    reason,
    req.params.id
  );
  createNotification(db, {
    recipientScope: 'admin',
    type: 'review_reported',
    title: 'Review Flagged for Moderation',
    message: `Review ${req.params.id} was reported: ${reason}`,
  });
  res.json({ ok: true });
});

// ---------- Customer Support Tickets ----------
app.post('/api/support', (req, res) => {
  const tokenUser = getBearerUser(req);
  const { name = '', email = '', phone = '', subject = '', message = '' } = req.body || {};
  if (!name.trim() || !email.trim() || !message.trim()) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  const id = `sup-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO support_tickets (id, user_id, name, email, phone, subject, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)
  `).run(
    id,
    tokenUser?.id || null,
    String(name).trim(),
    String(email).trim(),
    String(phone).trim(),
    String(subject).trim() || 'General Café Inquiry',
    String(message).trim().slice(0, 1000),
    now
  );
  createNotification(db, {
    recipientScope: 'admin',
    type: 'support_ticket',
    title: `Support Message from ${name}`,
    message: String(subject || message).slice(0, 140),
  });
  res.status(201).json({ ok: true, id });
});

// ================= ADMIN AUTH & ROLE-PROTECTED ROUTES =================
app.post('/api/auth/login', (req, res) => {
  const { email = '', username = '', password = '' } = req.body || {};
  const identifier = String(username || email).trim().toLowerCase();
  if (!identifier) {
    return res.status(400).json({ error: 'Please enter your admin username or email.' });
  }
  const u = db
    .prepare(
      `SELECT * FROM users WHERE (LOWER(email) = ? OR LOWER(username) = ?) AND role IN ('owner', 'staff')`
    )
    .get(identifier, identifier);
  if (!u || !verifyPassword(String(password), u.password_hash)) {
    return res.status(401).json({ error: 'Invalid admin username/email or password.' });
  }
  const user = {
    id: u.id,
    username: u.username || 'admin',
    email: u.email,
    name: u.name,
    role: u.role,
  };
  const token = signAuthToken(user);
  return res.json({ token, user });
});

app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({ user: req.admin });
});

// Update Admin Username, Email, Display Name, and/or Password
app.put('/api/auth/credentials', requireAdmin, (req, res) => {
  const {
    currentPassword = '',
    username,
    email,
    name,
    newPassword = '',
  } = req.body || {};

  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.admin.id);
  if (!u || !verifyPassword(String(currentPassword), u.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const nextUsername =
    username !== undefined
      ? String(username).trim().toLowerCase()
      : u.username || 'admin';
  const nextEmail =
    email !== undefined ? String(email).trim().toLowerCase() : u.email;
  const nextName = name !== undefined ? String(name).trim() || u.name : u.name;

  if (!nextUsername || nextUsername.length < 3) {
    return res
      .status(400)
      .json({ error: 'Username must be at least 3 characters.' });
  }
  if (/\s/.test(nextUsername)) {
    return res.status(400).json({ error: 'Username cannot contain spaces.' });
  }
  if (!nextEmail || !nextEmail.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid admin email.' });
  }

  // Check collisions with other users
  const dup = db
    .prepare(
      "SELECT id FROM users WHERE id != ? AND (LOWER(email) = ? OR (username != '' AND LOWER(username) = ?))"
    )
    .get(req.admin.id, nextEmail, nextUsername);
  if (dup) {
    return res
      .status(409)
      .json({ error: 'That username or email is already taken.' });
  }

  let nextHash = u.password_hash;
  if (String(newPassword).trim().length > 0) {
    if (String(newPassword).length < 6) {
      return res
        .status(400)
        .json({ error: 'New password must be at least 6 characters.' });
    }
    nextHash = hashPassword(String(newPassword));
  }

  db.prepare(
    'UPDATE users SET username = ?, email = ?, name = ?, password_hash = ? WHERE id = ?'
  ).run(nextUsername, nextEmail, nextName, nextHash, req.admin.id);

  const updatedUser = {
    id: req.admin.id,
    username: nextUsername,
    email: nextEmail,
    name: nextName,
    role: u.role,
  };
  const token = signAuthToken(updatedUser);
  return res.json({ ok: true, token, user: updatedUser });
});

app.put('/api/auth/password', requireAdmin, (req, res) => {
  const { currentPassword = '', newPassword = '' } = req.body || {};
  const u = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.admin.id);
  if (!u || !verifyPassword(String(currentPassword), u.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    hashPassword(newPassword),
    req.admin.id
  );
  res.json({ ok: true });
});

app.get('/api/admin/state', requireAdmin, (_req, res) => {
  res.json({ store: buildFullAdminSnapshot(db) });
});

app.get('/api/admin/analytics', requireAdmin, (req, res) => {
  const period = String(req.query.period || 'weekly');
  res.json({ analytics: computeAnalytics(db, period) });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const { brand, availability, commerce, display, rewards, locations } = req.body || {};
  if (brand) setSetting(db, 'brand', { ...(getSetting(db, 'brand', {}) || {}), ...brand });
  if (availability) {
    setSetting(db, 'availability', {
      ...(getSetting(db, 'availability', {}) || {}),
      ...availability,
    });
  }
  if (commerce) {
    setSetting(db, 'commerce', {
      ...(getSetting(db, 'commerce', {}) || {}),
      ...commerce,
    });
  }
  if (display) setSetting(db, 'display', { ...(getSetting(db, 'display', {}) || {}), ...display });
  if (rewards) setSetting(db, 'rewards', { ...(getSetting(db, 'rewards', {}) || {}), ...rewards });
  if (Array.isArray(locations)) {
    setSetting(db, 'locations', locations);
  }
  const snap = buildFullAdminSnapshot(db);
  broadcastEvent('settings_updated', { updatedAt: snap.updatedAt });
  res.json({ store: snap });
});

// Admin Menu CRUD (Strictly Tea & Coffee)
app.post('/api/admin/menu', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Beverage name is required.' });
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM products').get().m || 0;
  const id =
    b.id ||
    `${String(b.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 22)}-${crypto.randomUUID().slice(0, 4)}`;
  const cat = b.category === 'coffee' ? 'coffee' : 'tea';
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO products (
      id, name, hindi_name, subtitle, serving_style, category, price, original_price, beans_earned,
      origin, elevation, notes_json, ingredients_json, preparation_steps, description,
      image, badge, caffeine, supports_hot, supports_cold, default_temp, sizes_json,
      recipe_json, is_bestseller, is_new_arrival, rating_avg, review_count,
      popularity_score, available, displayed, featured, stock_count, sort_order, profile_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 4.8, 0, 80, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    String(b.name).trim(),
    String(b.hindiName || '').trim(),
    String(b.subtitle || 'Freshly Brewed Indian Beverage'),
    String(b.servingStyle || (cat === 'tea' ? 'Handmade Clay Kulhad' : 'Warm Ceramic Mug')),
    cat,
    Math.max(0, Number(b.price) || 70),
    Math.max(0, Number(b.originalPrice) || 0),
    Math.max(0, Number(b.beansEarned) || 35),
    String(b.origin || 'India'),
    String(b.elevation || 'Fresh Batch'),
    JSON.stringify(Array.isArray(b.notes) ? b.notes : ['Authentic Flavour']),
    JSON.stringify(Array.isArray(b.ingredients) ? b.ingredients : ['Indian Tea / Coffee', 'Filtered Water']),
    String(b.preparationSteps || 'Prepared fresh to order.'),
    String(b.description || ''),
    String(b.image || '/images/indian-hero-chai-kaapi.jpg'),
    String(b.badge || ''),
    ['Low', 'Medium', 'High'].includes(b.caffeine) ? b.caffeine : 'Medium',
    b.supportsHot !== false ? 1 : 0,
    b.supportsCold ? 1 : 0,
    b.defaultTemp === 'cold' ? 'cold' : 'hot',
    JSON.stringify(
      Array.isArray(b.sizes) && b.sizes.length
        ? b.sizes
        : [
            { name: 'Small', volumeLabel: '120 ml', priceDelta: -10 },
            { name: 'Medium', volumeLabel: '180 ml', priceDelta: 0 },
            { name: 'Large', volumeLabel: '260 ml', priceDelta: 25 },
          ]
    ),
    JSON.stringify(
      b.recipe ||
        (cat === 'tea'
          ? { 'ing-tea-leaves': 6, 'ing-milk': 120, 'ing-sugar': 10 }
          : { 'ing-coffee-beans': 15, 'ing-milk': 130, 'ing-sugar': 10 })
    ),
    b.isBestseller ? 1 : 0,
    b.isNewArrival ? 1 : 0,
    b.available !== false ? 1 : 0,
    b.displayed !== false ? 1 : 0,
    b.featured ? 1 : 0,
    Math.max(0, Number(b.stockCount ?? 40)),
    maxOrder + 1,
    JSON.stringify(b.profile || { label1: 'Richness', val1: 88, label2: 'Aroma', val2: 86, label3: 'Strength', val3: 84 }),
    now
  );

  const created = mapProductRow(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
  res.status(201).json({ item: created, store: buildFullAdminSnapshot(db) });
});

app.put('/api/admin/menu/:id', requireAdmin, (req, res) => {
  const curRow = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!curRow) return res.status(404).json({ error: 'Beverage not found.' });
  const cur = mapProductRow(curRow);
  const b = req.body || {};
  const next = { ...cur, ...b, id: cur.id };

  db.prepare(`
    UPDATE products SET
      name = ?, hindi_name = ?, subtitle = ?, serving_style = ?, category = ?,
      price = ?, original_price = ?, beans_earned = ?, origin = ?, elevation = ?, notes_json = ?,
      ingredients_json = ?, preparation_steps = ?, description = ?, image = ?,
      badge = ?, caffeine = ?, supports_hot = ?, supports_cold = ?, default_temp = ?,
      sizes_json = ?, recipe_json = ?, is_bestseller = ?, is_new_arrival = ?, available = ?,
      displayed = ?, featured = ?, stock_count = ?, profile_json = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.name,
    next.hindiName || '',
    next.subtitle,
    next.servingStyle || '',
    next.category === 'coffee' ? 'coffee' : 'tea',
    Math.max(0, Number(next.price) || 0),
    Math.max(0, Number(next.originalPrice) || 0),
    Math.max(0, Number(next.beansEarned) || 0),
    next.origin,
    next.elevation,
    JSON.stringify(next.notes || []),
    JSON.stringify(next.ingredients || []),
    next.preparationSteps || '',
    next.description || '',
    next.image,
    next.badge || '',
    next.caffeine,
    next.supportsHot !== false ? 1 : 0,
    next.supportsCold ? 1 : 0,
    next.defaultTemp === 'cold' ? 'cold' : 'hot',
    JSON.stringify(next.sizes || []),
    JSON.stringify(next.recipe || {}),
    next.isBestseller ? 1 : 0,
    next.isNewArrival ? 1 : 0,
    next.available ? 1 : 0,
    next.displayed ? 1 : 0,
    next.featured ? 1 : 0,
    Math.max(0, Number(next.stockCount) || 0),
    JSON.stringify(next.profile || {}),
    new Date().toISOString(),
    cur.id
  );
  res.json({ item: next, store: buildFullAdminSnapshot(db) });
});

app.delete('/api/admin/menu/:id', requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Beverage not found.' });
  res.json({ ok: true, store: buildFullAdminSnapshot(db) });
});

app.put('/api/admin/menu/reorder/list', requireAdmin, (req, res) => {
  const { orderedIds = [] } = req.body || {};
  const stmt = db.prepare('UPDATE products SET sort_order = ? WHERE id = ?');
  const tx = db.transaction(() => {
    orderedIds.forEach((id, idx) => stmt.run(idx + 1, id));
  });
  tx();
  res.json({ store: buildFullAdminSnapshot(db) });
});

// Admin Order Management (7-stage status + Auto Loyalty Award + Refunds)
app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!orderRow) return res.status(404).json({ error: 'Order not found.' });

  const valid = [
    'order_placed',
    'order_accepted',
    'preparing',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ];
  const nextStatus = valid.includes(req.body?.status)
    ? req.body.status
    : orderRow.status;
  const nextPayStatus = ['pending', 'paid', 'failed', 'refunded'].includes(
    req.body?.paymentStatus
  )
    ? req.body.paymentStatus
    : nextStatus === 'delivered' && orderRow.payment_method === 'cod'
      ? 'paid'
      : orderRow.payment_status;
  const now = new Date().toISOString();

  db.prepare(
    'UPDATE orders SET status = ?, payment_status = ?, updated_at = ? WHERE id = ?'
  ).run(nextStatus, nextPayStatus, now, orderRow.id);

  // Auto-award Loyalty Points when completed/delivered (preventing duplicates)
  if (nextStatus === 'delivered' && !orderRow.loyalty_awarded && orderRow.user_id) {
    db.prepare(
      'UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?'
    ).run(orderRow.total_beans, orderRow.user_id);
    db.prepare('UPDATE orders SET loyalty_awarded = 1 WHERE id = ?').run(orderRow.id);
    db.prepare(`
      INSERT INTO loyalty_transactions (id, user_id, order_id, points_delta, type, description, created_at)
      VALUES (?, ?, ?, ?, 'earn', ?, ?)
    `).run(
      `ltx-${crypto.randomUUID().slice(0, 8)}`,
      orderRow.user_id,
      orderRow.id,
      orderRow.total_beans,
      `Earned Chai Coins on completed Order #${orderRow.order_number}`,
      now
    );
  }

  // Trigger customer notification
  if (orderRow.user_id && nextStatus !== orderRow.status) {
    createNotification(db, {
      recipientScope: 'customer',
      userId: orderRow.user_id,
      type: `order_${nextStatus}`,
      title: `Order #${orderRow.order_number} · ${nextStatus.replace(/_/g, ' ').toUpperCase()}`,
      message: `Your chai & coffee order status is now ${nextStatus.replace(/_/g, ' ')}.`,
      meta: { orderNumber: orderRow.order_number, status: nextStatus },
    });
  }

  if (nextStatus === 'cancelled') {
    createNotification(db, {
      recipientScope: 'admin',
      type: 'order_cancelled',
      title: `Order #${orderRow.order_number} Cancelled`,
      message: `Order for ${orderRow.customer_name} (₹${orderRow.total_payable}) was cancelled.`,
    });
  }

  broadcastEvent('order_updated', {
    orderNumber: orderRow.order_number,
    status: nextStatus,
    paymentStatus: nextPayStatus,
  });

  const updated = mapOrderRow(
    db,
    db.prepare('SELECT * FROM orders WHERE id = ?').get(orderRow.id)
  );
  res.json({ order: updated, store: buildFullAdminSnapshot(db) });
});

app.post('/api/admin/orders/:id/refund', requireAdmin, (req, res) => {
  const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!orderRow) return res.status(404).json({ error: 'Order not found.' });
  const now = new Date().toISOString();
  const refundId = `rfnd_${crypto.randomUUID().slice(0, 8)}`;

  db.prepare(
    `UPDATE orders SET payment_status = 'refunded', status = 'cancelled', updated_at = ? WHERE id = ?`
  ).run(now, orderRow.id);
  db.prepare(
    `UPDATE payments SET status = 'refunded', refund_id = ?, refund_amount = amount, updated_at = ? WHERE order_id = ?`
  ).run(refundId, now, orderRow.id);

  if (orderRow.user_id) {
    createNotification(db, {
      recipientScope: 'customer',
      userId: orderRow.user_id,
      type: 'refund',
      title: `Refund Processed · #${orderRow.order_number}`,
      message: `₹${orderRow.total_payable} refund (${refundId}) initiated for your cancelled order.`,
    });
  }
  res.json({ ok: true, refundId, store: buildFullAdminSnapshot(db) });
});

app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ ok: true, store: buildFullAdminSnapshot(db) });
});

// Admin Inventory Management
app.post('/api/admin/inventory', requireAdmin, (req, res) => {
  const { name, unit = 'g', stockQty = 500, lowStockThreshold = 100, costPerUnit = 1 } =
    req.body || {};
  if (!name) return res.status(400).json({ error: 'Ingredient name is required.' });
  const id = `ing-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)}-${crypto.randomUUID().slice(0, 3)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO ingredients (id, name, unit, stock_qty, low_stock_threshold, cost_per_unit, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, String(name).trim(), unit, Number(stockQty), Number(lowStockThreshold), Number(costPerUnit), now);
  res.status(201).json({ store: buildFullAdminSnapshot(db) });
});

app.patch('/api/admin/inventory/:id/adjust', requireAdmin, (req, res) => {
  const { delta = 0, reason = 'Manual stock adjustment', lowStockThreshold } = req.body || {};
  const ing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(req.params.id);
  if (!ing) return res.status(404).json({ error: 'Ingredient not found.' });
  const now = new Date().toISOString();
  const nextQty = Math.max(0, Number((ing.stock_qty + Number(delta)).toFixed(2)));
  const nextThresh =
    lowStockThreshold !== undefined ? Number(lowStockThreshold) : ing.low_stock_threshold;

  db.prepare(
    'UPDATE ingredients SET stock_qty = ?, low_stock_threshold = ?, updated_at = ? WHERE id = ?'
  ).run(nextQty, nextThresh, now, ing.id);

  if (Number(delta) !== 0) {
    db.prepare(`
      INSERT INTO inventory_logs (id, ingredient_id, change_qty, reason, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `ilog-${crypto.randomUUID().slice(0, 8)}`,
      ing.id,
      Number(delta),
      String(reason),
      req.admin.email,
      now
    );
  }
  res.json({ store: buildFullAdminSnapshot(db) });
});

// Admin Coupons CRUD
app.post('/api/admin/coupons', requireAdmin, (req, res) => {
  const b = req.body || {};
  const code = String(b.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'Coupon code is required.' });
  const id = `cpn-${crypto.randomUUID().slice(0, 8)}`;
  db.prepare(`
    INSERT INTO coupons (
      id, code, title, description, discount_type, discount_value, min_order_value,
      max_discount, first_order_only, single_use, is_festival, expires_at, usage_limit, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    code,
    String(b.title || code),
    String(b.description || ''),
    b.discountType === 'fixed' ? 'fixed' : 'percentage',
    Math.max(1, Number(b.discountValue) || 10),
    Math.max(0, Number(b.minOrderValue) || 0),
    Math.max(0, Number(b.maxDiscount) || 0),
    b.firstOrderOnly ? 1 : 0,
    b.singleUse ? 1 : 0,
    b.isFestival ? 1 : 0,
    b.expiresAt || '2027-12-31',
    Math.max(0, Number(b.usageLimit) || 500),
    b.active !== false ? 1 : 0,
    new Date().toISOString()
  );
  res.status(201).json({ store: buildFullAdminSnapshot(db) });
});

app.patch('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  const c = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Coupon not found.' });
  const b = req.body || {};
  db.prepare(
    'UPDATE coupons SET active = ?, discount_value = ?, min_order_value = ?, max_discount = ? WHERE id = ?'
  ).run(
    b.active !== undefined ? (b.active ? 1 : 0) : c.active,
    b.discountValue !== undefined ? Number(b.discountValue) : c.discount_value,
    b.minOrderValue !== undefined ? Number(b.minOrderValue) : c.min_order_value,
    b.maxDiscount !== undefined ? Number(b.maxDiscount) : c.max_discount,
    c.id
  );
  res.json({ store: buildFullAdminSnapshot(db) });
});

app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  res.json({ store: buildFullAdminSnapshot(db) });
});

// Admin Review Moderation & Replies
app.patch('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  const rev = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!rev) return res.status(404).json({ error: 'Review not found.' });
  const nextStatus = ['approved', 'pending', 'hidden'].includes(req.body?.status)
    ? req.body.status
    : rev.status;
  const reply =
    req.body?.adminReply !== undefined ? String(req.body.adminReply) : rev.admin_reply;
  const reported =
    req.body?.reported !== undefined ? (req.body.reported ? 1 : 0) : rev.reported;

  db.prepare(
    'UPDATE reviews SET status = ?, admin_reply = ?, reported = ? WHERE id = ?'
  ).run(nextStatus, reply, reported, rev.id);
  recalcProductRating(db, rev.product_id);
  res.json({ store: buildFullAdminSnapshot(db) });
});

app.delete('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  const rev = db.prepare('SELECT product_id FROM reviews WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  if (rev) recalcProductRating(db, rev.product_id);
  res.json({ store: buildFullAdminSnapshot(db) });
});

// Admin Customer Management, Pricing, FAQs, Testimonials, Support, Notifications
app.patch('/api/admin/members/:id/beans', requireAdmin, (req, res) => {
  const delta = Number(req.body?.delta || 0);
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Customer not found.' });
  const next = Math.max(0, Number(u.loyalty_points) + delta);
  db.prepare('UPDATE users SET loyalty_points = ? WHERE id = ?').run(next, u.id);
  db.prepare(`
    INSERT INTO loyalty_transactions (id, user_id, points_delta, type, description, created_at)
    VALUES (?, ?, ?, 'admin_adjust', ?, ?)
  `).run(
    `ltx-${crypto.randomUUID().slice(0, 8)}`,
    u.id,
    delta,
    `Admin adjustment by ${req.admin.email}`,
    new Date().toISOString()
  );
  res.json({ store: buildFullAdminSnapshot(db) });
});

app.patch('/api/admin/members/:id/active', requireAdmin, (req, res) => {
  const active = req.body?.active ? 1 : 0;
  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active, req.params.id);
  res.json({ store: buildFullAdminSnapshot(db) });
});

app.delete('/api/admin/members/:id', requireAdmin, (req, res) => {
  db.prepare(`DELETE FROM users WHERE id = ? AND role = 'customer'`).run(req.params.id);
  res.json({ store: buildFullAdminSnapshot(db) });
});

app.patch('/api/admin/support/:id', requireAdmin, (req, res) => {
  const { status = 'resolved', adminNote = '' } = req.body || {};
  db.prepare('UPDATE support_tickets SET status = ?, admin_note = ? WHERE id = ?').run(
    status,
    String(adminNote),
    req.params.id
  );
  res.json({ store: buildFullAdminSnapshot(db) });
});

app.post('/api/admin/notifications/read', requireAdmin, (_req, res) => {
  db.prepare(`UPDATE notifications SET read = 1 WHERE recipient_scope = 'admin'`).run();
  res.json({ store: buildFullAdminSnapshot(db) });
});

app.put('/api/admin/pricing', requireAdmin, (req, res) => {
  if (Array.isArray(req.body?.pricingTiers)) {
    setSetting(db, 'pricingTiers', req.body.pricingTiers);
  }
  res.json({ store: buildFullAdminSnapshot(db) });
});

app.put('/api/admin/faqs', requireAdmin, (req, res) => {
  if (Array.isArray(req.body?.faqs)) {
    setSetting(db, 'faqs', req.body.faqs);
  }
  res.json({ store: buildFullAdminSnapshot(db) });
});

app.put('/api/admin/testimonials', requireAdmin, (req, res) => {
  if (Array.isArray(req.body?.testimonials)) {
    setSetting(db, 'testimonials', req.body.testimonials);
  }
  res.json({ store: buildFullAdminSnapshot(db) });
});

app.post('/api/admin/reset', requireAdmin, (_req, res) => {
  seedDatabaseIfEmpty(db, true);
  res.json({ store: buildFullAdminSnapshot(db) });
});

// Serve built production frontend
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Kulhad & Kaapi Full-Stack Platform listening on http://localhost:${PORT}`);
});
