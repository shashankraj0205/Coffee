import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { buildFullSeedData } from './seedData.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SQLITE_PATH =
  process.env.SQLITE_DB_PATH || path.join(DATA_DIR, 'kulhad-kaapi.sqlite');

const TOKEN_SECRET =
  process.env.AUTH_TOKEN_SECRET ||
  process.env.SOLEN_ADMIN_SECRET ||
  'kulhad-kaapi-hmac-secret-2026-dev-key';

// A well-known fallback secret lets anyone forge admin tokens, so refuse it in production.
if (process.env.NODE_ENV === 'production' && TOKEN_SECRET === 'kulhad-kaapi-hmac-secret-2026-dev-key') {
  throw new Error('Set AUTH_TOKEN_SECRET before running in production.');
}

export function hashPassword(
  password,
  salt = crypto.randomBytes(16).toString('hex')
) {
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, key] = String(storedHash || '').split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(String(password), salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function signAuthToken(payload, ttlSeconds = 60 * 60 * 24 * 7) {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function createPaymentHmac(gatewayOrderId, gatewayPaymentId) {
  const secret =
    process.env.RAZORPAY_KEY_SECRET || 'rzp_test_sandbox_kulhad_secret_2026';
  return crypto
    .createHmac('sha256', secret)
    .update(`${gatewayOrderId}|${gatewayPaymentId}`)
    .digest('hex');
}

export function verifyPaymentHmac(gatewayOrderId, gatewayPaymentId, signature) {
  const expected = createPaymentHmac(gatewayOrderId, gatewayPaymentId);
  const a = Buffer.from(String(signature || ''));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  dbInstance = new Database(SQLITE_PATH);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  runMigrations(dbInstance);
  seedDatabaseIfEmpty(dbInstance);
  return dbInstance;
}

function runMigrations(db) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return;
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);`
  );
  const applied = new Set(
    db
      .prepare('SELECT id FROM schema_migrations')
      .all()
      .map((r) => r.id)
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    db.exec(sql);
    db.prepare(
      'INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)'
    ).run(file, new Date().toISOString());
  }

  // Safe column check for existing SQLite databases
  const cols = db
    .prepare("PRAGMA table_info('products')")
    .all()
    .map((c) => c.name);
  if (!cols.includes('original_price')) {
    db.exec('ALTER TABLE products ADD COLUMN original_price INTEGER NOT NULL DEFAULT 0;');
  }

  const userCols = db
    .prepare("PRAGMA table_info('users')")
    .all()
    .map((c) => c.name);
  if (!userCols.includes('username')) {
    db.exec("ALTER TABLE users ADD COLUMN username TEXT DEFAULT '';");
  }
  db.exec(
    "UPDATE users SET username = 'admin' WHERE role IN ('owner', 'staff') AND (username IS NULL OR username = '');"
  );
}

export function seedDatabaseIfEmpty(db, forceReset = false) {
  const existingProductCount = db
    .prepare('SELECT COUNT(*) as cnt FROM products')
    .get().cnt;

  if (!forceReset && existingProductCount > 0) {
    return;
  }

  const seed = buildFullSeedData();
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    if (forceReset) {
      for (const tbl of [
        'inventory_logs',
        'cart_items',
        'carts',
        'coupon_usages',
        'payments',
        'order_items',
        'orders',
        'reviews',
        'loyalty_transactions',
        'notifications',
        'support_tickets',
        'addresses',
        'products',
        'ingredients',
        'coupons',
        'store_settings',
      ]) {
        db.prepare(`DELETE FROM ${tbl}`).run();
      }
      db.prepare(`DELETE FROM users WHERE role = 'customer'`).run();
    }

    // Store settings
    const upsertSetting = db.prepare(`
      INSERT INTO store_settings (key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
    `);
    for (const key of [
      'brand',
      'availability',
      'commerce',
      'display',
      'rewards',
      'locations',
      'testimonials',
      'pricingTiers',
      'faqs',
    ]) {
      upsertSetting.run(key, JSON.stringify(seed[key]), now);
    }

    // Seed Owner Admin if not present
    const adminEmail =
      process.env.DEFAULT_ADMIN_EMAIL || 'admin@kulhadkaapi.in';
    const adminPass = process.env.DEFAULT_ADMIN_PASSWORD || 'chai2026';
    const existingAdmin = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(adminEmail);
    if (!existingAdmin) {
      db.prepare(`
        INSERT INTO users (id, username, name, email, phone, password_hash, role, email_verified, loyalty_points, membership_level, referral_code, created_at)
        VALUES (?, 'admin', ?, ?, ?, ?, 'owner', 1, 0, 'Owner', 'kulhad-owner', ?)
      `).run(
        'usr-admin-1',
        'Chai & Kaapi Owner',
        adminEmail,
        '+91 80 4123 8900',
        hashPassword(adminPass),
        now
      );
    }

    // Seed Demo Customers
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (
        id, name, email, phone, password_hash, role, email_verified, birthday,
        loyalty_points, membership_level, referral_code, referrals_count, preferred_drink, favourites_json, created_at
      ) VALUES (?, ?, ?, ?, ?, 'customer', 1, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertUser.run(
      'mem-1',
      'Ananya Sharma',
      'ananya@studio.in',
      '+91 98450 11223',
      hashPassword('chai1234'),
      '1996-08-14',
      920,
      'Chai & Kaapi Pass (₹399/mo)',
      'ananya-chai',
      5,
      'Tandoori Chai',
      JSON.stringify(['masala-chai', 'tandoori-chai', 'south-indian-filter-coffee']),
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 16).toISOString()
    );
    insertUser.run(
      'mem-2',
      'Rohan Kulkarni',
      'rohan@archcraft.in',
      '+91 98201 44556',
      hashPassword('chai1234'),
      '1992-11-04',
      1640,
      'Maharaja Kulhad Club (₹799/mo)',
      'rohan-kaapi',
      9,
      'South Indian Filter Coffee',
      JSON.stringify(['south-indian-filter-coffee', 'cutting-chai']),
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 29).toISOString()
    );
    insertUser.run(
      'mem-3',
      'Meera Iyer',
      'meera@kaapi.co.in',
      '+91 99001 77889',
      hashPassword('chai1234'),
      '1994-03-22',
      480,
      'Daily Tapri Club (Free)',
      'meera-kahwa',
      3,
      'Kashmiri Kahwa',
      JSON.stringify(['kashmiri-kahwa', 'cold-coffee']),
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
    );

    // Seed Address
    db.prepare(`
      INSERT OR IGNORE INTO addresses (id, user_id, label, recipient_name, phone, line1, landmark, city, pincode, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      'addr-1',
      'mem-1',
      'Home',
      'Ananya Sharma',
      '+91 98450 11223',
      '24, 12th Main Road, HAL 2nd Stage, Indiranagar',
      'Near 100 Feet Road Metro',
      'Bengaluru',
      '560038',
      now
    );

    // Seed Ingredients
    const insertIng = db.prepare(`
      INSERT OR REPLACE INTO ingredients (id, name, unit, stock_qty, low_stock_threshold, cost_per_unit, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const ing of seed.ingredients) {
      insertIng.run(
        ing.id,
        ing.name,
        ing.unit,
        ing.stock_qty,
        ing.low_stock_threshold,
        ing.cost_per_unit,
        now
      );
    }

    // Seed Initial Inventory Logs
    db.prepare(`
      INSERT OR IGNORE INTO inventory_logs (id, ingredient_id, change_qty, reason, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'ilog-1',
      'ing-tea-leaves',
      2000,
      'Upper Assam morning estate delivery',
      adminEmail,
      new Date(Date.now() - 1000 * 60 * 180).toISOString()
    );
    db.prepare(`
      INSERT OR IGNORE INTO inventory_logs (id, ingredient_id, change_qty, reason, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'ilog-2',
      'ing-kulhad',
      120,
      'Jaipur potter terracotta kiln restock',
      adminEmail,
      new Date(Date.now() - 1000 * 60 * 120).toISOString()
    );

    // Seed 22 Tea & Coffee Products
    const insertProd = db.prepare(`
      INSERT OR REPLACE INTO products (
        id, name, hindi_name, subtitle, serving_style, category, price, beans_earned,
        origin, elevation, notes_json, ingredients_json, preparation_steps, description,
        image, badge, caffeine, supports_hot, supports_cold, default_temp, sizes_json,
        recipe_json, is_bestseller, is_new_arrival, rating_avg, review_count,
        popularity_score, available, displayed, featured, stock_count, sort_order, profile_json, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);
    for (const p of seed.products) {
      insertProd.run(
        p.id,
        p.name,
        p.hindiName || '',
        p.subtitle,
        p.servingStyle || '',
        p.category,
        p.price,
        p.beansEarned,
        p.origin,
        p.elevation,
        JSON.stringify(p.notes || []),
        JSON.stringify(p.ingredients || []),
        p.preparationSteps || '',
        p.description,
        p.image,
        p.badge || '',
        p.caffeine || 'Medium',
        p.supportsHot ? 1 : 0,
        p.supportsCold ? 1 : 0,
        p.defaultTemp || 'hot',
        JSON.stringify(p.sizes || []),
        JSON.stringify(p.recipe || {}),
        p.isBestseller ? 1 : 0,
        p.isNewArrival ? 1 : 0,
        p.ratingAvg || 4.8,
        p.reviewCount || 1,
        p.popularityScore || 80,
        p.available ? 1 : 0,
        p.displayed ? 1 : 0,
        p.featured ? 1 : 0,
        p.stockCount,
        p.sortOrder,
        JSON.stringify(p.profile || {}),
        now
      );
    }

    // Seed Coupons
    const insertCoupon = db.prepare(`
      INSERT OR REPLACE INTO coupons (
        id, code, title, description, discount_type, discount_value, min_order_value,
        max_discount, first_order_only, single_use, is_festival, expires_at,
        usage_limit, times_used, active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of seed.coupons) {
      insertCoupon.run(
        c.id,
        c.code,
        c.title,
        c.description,
        c.discountType,
        c.discountValue,
        c.minOrderValue,
        c.maxDiscount,
        c.firstOrderOnly ? 1 : 0,
        c.singleUse ? 1 : 0,
        c.isFestival ? 1 : 0,
        c.expiresAt,
        c.usageLimit,
        c.timesUsed,
        c.active ? 1 : 0,
        now
      );
    }

    // Seed Realistic Orders for Analytics, Kitchen Display & Verified Reviews
    const insertOrder = db.prepare(`
      INSERT OR IGNORE INTO orders (
        id, order_number, user_id, customer_name, customer_email, customer_phone,
        order_type, table_number, scheduled_for, delivery_address_json, pickup_note,
        subtotal, discount_amount, coupon_code, loyalty_redeemed_points, loyalty_discount,
        tax_amount, delivery_fee, total_payable, total_beans, payment_method,
        payment_status, status, inventory_deducted, loyalty_awarded, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
    `);
    const insertOrderItem = db.prepare(`
      INSERT OR IGNORE INTO order_items (
        id, order_id, product_id, name, category, size, temperature,
        sugar_preference, milk_strength, special_instructions, unit_price, quantity, beans_earned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const t1 = new Date(Date.now() - 1000 * 60 * 14).toISOString();
    insertOrder.run(
      'ord-1001',
      'CKP-1042',
      'mem-1',
      'Ananya Sharma',
      'ananya@studio.in',
      '+91 98450 11223',
      'pickup',
      '',
      '',
      '',
      'Kam cheeni on Tandoori Chai, extra frothy kaapi',
      175,
      0,
      '',
      0,
      0,
      8.75,
      0,
      183.75,
      85,
      'razorpay_upi',
      'paid',
      'preparing',
      t1,
      t1
    );
    insertOrderItem.run(
      'oi-1001-a',
      'ord-1001',
      'tandoori-chai',
      'Tandoori Chai',
      'tea',
      'Medium',
      'hot',
      'Less Sugar (Kam Cheeni)',
      'Kadak (Extra Strong)',
      '',
      95,
      1,
      45
    );
    insertOrderItem.run(
      'oi-1001-b',
      'ord-1001',
      'south-indian-filter-coffee',
      'South Indian Filter Coffee',
      'coffee',
      'Medium',
      'hot',
      'Regular Sugar',
      'Standard',
      '',
      80,
      1,
      40
    );

    const t2 = new Date(Date.now() - 1000 * 60 * 110).toISOString();
    insertOrder.run(
      'ord-1002',
      'CKP-1041',
      'mem-2',
      'Rohan Kulkarni',
      'rohan@archcraft.in',
      '+91 98201 44556',
      'delivery',
      '',
      '',
      JSON.stringify({
        id: 'addr-1',
        label: 'Studio',
        recipientName: 'Rohan Kulkarni',
        phone: '+91 98201 44556',
        line1: '24, 12th Main Road, HAL 2nd Stage, Indiranagar',
        city: 'Bengaluru',
        pincode: '560038',
      }),
      'Serve masala chai in kulhad please',
      315,
      50,
      'KAAPI50',
      0,
      0,
      13.25,
      0,
      278.25,
      130,
      'razorpay_card',
      'paid',
      'delivered',
      t2,
      t2
    );
    insertOrderItem.run(
      'oi-1002-a',
      'ord-1002',
      'masala-chai',
      'Masala Chai',
      'tea',
      'Large',
      'hot',
      'Organic Jaggery (Gud)',
      'Standard',
      '',
      85,
      2,
      30
    );
    insertOrderItem.run(
      'oi-1002-b',
      'ord-1002',
      'cold-coffee',
      'Cold Coffee',
      'coffee',
      'Medium',
      'cold',
      'Regular Sugar',
      'Standard',
      '',
      145,
      1,
      70
    );

    const t3 = new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString();
    insertOrder.run(
      'ord-1003',
      'CKP-1040',
      'mem-3',
      'Meera Iyer',
      'meera@kaapi.co.in',
      '+91 99001 77889',
      'dine_in',
      'T4',
      '',
      '',
      'Table 4 near sandstone arch',
      260,
      0,
      '',
      50,
      25,
      11.75,
      0,
      246.75,
      130,
      'cod',
      'paid',
      'delivered',
      t3,
      t3
    );
    insertOrderItem.run(
      'oi-1003-a',
      'ord-1003',
      'kashmiri-kahwa',
      'Kashmiri Kahwa',
      'tea',
      'Medium',
      'hot',
      'Less Sugar (Kam Cheeni)',
      'No Milk / Black',
      '',
      120,
      1,
      60
    );
    insertOrderItem.run(
      'oi-1003-b',
      'ord-1003',
      'cappuccino',
      'Cappuccino',
      'coffee',
      'Medium',
      'hot',
      'No Sugar (Bina Cheeni)',
      'Standard',
      '',
      140,
      1,
      70
    );

    // Seed Verified Reviews
    const insertRev = db.prepare(`
      INSERT OR IGNORE INTO reviews (id, product_id, user_id, user_name, rating, comment, verified_purchase, status, admin_reply, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, 'approved', ?, ?)
    `);
    insertRev.run(
      'rev-1',
      'masala-chai',
      'mem-1',
      'Ananya Sharma',
      5,
      'Perfectly balanced ginger and cardamom — authentic kadak masala chai without being overly sweet!',
      'Dhanyavaad Ananya! Freshly pounded Idukki cardamom makes all the difference.',
      new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
    );
    insertRev.run(
      'rev-2',
      'south-indian-filter-coffee',
      'mem-2',
      'Rohan Kulkarni',
      5,
      'Thick froth, strong 80:20 Chikmagalur decoction, served piping hot in brass davara.',
      '',
      new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    );
    insertRev.run(
      'rev-3',
      'tandoori-chai',
      'mem-1',
      'Ananya Sharma',
      5,
      'Unbelievable smoky clay aroma! Watching it foam out of the red-hot kulhad never gets old.',
      '',
      new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
    );

    // Seed Loyalty Transactions
    db.prepare(`
      INSERT OR IGNORE INTO loyalty_transactions (id, user_id, order_id, points_delta, type, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ltx-1',
      'mem-1',
      'ord-1001',
      85,
      'earn',
      'Earned on Order #CKP-1042',
      t1
    );

    // Seed Notifications & Support Ticket
    db.prepare(`
      INSERT OR IGNORE INTO notifications (id, recipient_scope, user_id, type, title, message, read, created_at)
      VALUES (?, 'admin', NULL, 'new_order', ?, ?, 0, ?)
    `).run(
      'notif-1',
      'New Pickup Order #CKP-1042',
      'Ananya Sharma ordered Tandoori Chai & South Indian Filter Coffee (₹183.75).',
      t1
    );
    db.prepare(`
      INSERT OR IGNORE INTO support_tickets (id, name, email, phone, subject, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
    `).run(
      'sup-1',
      'Vikram Rao',
      'vikram@techindia.io',
      '+91 98800 55443',
      'Office Chai & Filter Kaapi Morning Subscription',
      'Namaste! Can we schedule 15 kulhad chais and 10 filter coffees every Friday at 10 AM?',
      new Date(Date.now() - 1000 * 60 * 50).toISOString()
    );
  });

  tx();
}

// ---------- Data Mappers ----------

export function getSetting(db, key, fallback = null) {
  const row = db
    .prepare('SELECT value_json FROM store_settings WHERE key = ?')
    .get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value_json);
  } catch {
    return fallback;
  }
}

export function setSetting(db, key, value) {
  db.prepare(`
    INSERT INTO store_settings (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value), new Date().toISOString());
}

export function mapProductRow(r) {
  return {
    id: r.id,
    name: r.name,
    hindiName: r.hindi_name || undefined,
    subtitle: r.subtitle,
    servingStyle: r.serving_style || undefined,
    category: r.category,
    price: Number(r.price),
    originalPrice: r.original_price > 0 ? Number(r.original_price) : undefined,
    beansEarned: Number(r.beans_earned),
    origin: r.origin,
    elevation: r.elevation,
    notes: JSON.parse(r.notes_json || '[]'),
    ingredients: JSON.parse(r.ingredients_json || '[]'),
    preparationSteps: r.preparation_steps || '',
    description: r.description,
    image: r.image,
    badge: r.badge || undefined,
    caffeine: r.caffeine,
    supportsHot: Boolean(r.supports_hot),
    supportsCold: Boolean(r.supports_cold),
    defaultTemp: r.default_temp || 'hot',
    sizes: JSON.parse(r.sizes_json || '[]'),
    recipe: JSON.parse(r.recipe_json || '{}'),
    isBestseller: Boolean(r.is_bestseller),
    isNewArrival: Boolean(r.is_new_arrival),
    ratingAvg: Number(r.rating_avg || 4.8),
    reviewCount: Number(r.review_count || 0),
    popularityScore: Number(r.popularity_score || 80),
    available: Boolean(r.available),
    displayed: Boolean(r.displayed),
    featured: Boolean(r.featured),
    stockCount: Number(r.stock_count),
    sortOrder: Number(r.sort_order),
    profile: JSON.parse(r.profile_json || '{}'),
  };
}

export function mapCouponRow(c) {
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    description: c.description,
    discountType: c.discount_type,
    discountValue: Number(c.discount_value),
    minOrderValue: Number(c.min_order_value),
    maxDiscount: Number(c.max_discount),
    firstOrderOnly: Boolean(c.first_order_only),
    singleUse: Boolean(c.single_use),
    isFestival: Boolean(c.is_festival),
    expiresAt: c.expires_at || undefined,
    usageLimit: Number(c.usage_limit),
    timesUsed: Number(c.times_used),
    active: Boolean(c.active),
  };
}

export function mapIngredientRow(i) {
  return {
    id: i.id,
    name: i.name,
    unit: i.unit,
    stockQty: Number(i.stock_qty),
    lowStockThreshold: Number(i.low_stock_threshold),
    costPerUnit: Number(i.cost_per_unit),
    updatedAt: i.updated_at,
  };
}

export function mapReviewRow(r) {
  return {
    id: r.id,
    productId: r.product_id,
    productName: r.product_name || undefined,
    userId: r.user_id || undefined,
    userName: r.user_name,
    rating: Number(r.rating),
    comment: r.comment,
    verifiedPurchase: Boolean(r.verified_purchase),
    status: r.status,
    adminReply: r.admin_reply || '',
    reported: Boolean(r.reported),
    reportReason: r.report_reason || '',
    createdAt: r.created_at,
  };
}

export function mapOrderRow(db, o) {
  const items = db
    .prepare('SELECT * FROM order_items WHERE order_id = ?')
    .all(o.id)
    .map((it) => ({
      itemId: it.product_id,
      name: it.name,
      category: it.category,
      size: it.size,
      temperature: it.temperature,
      sugarPreference: it.sugar_preference,
      milkStrength: it.milk_strength,
      specialInstructions: it.special_instructions || '',
      price: Number(it.unit_price),
      quantity: Number(it.quantity),
      beansEarned: Number(it.beans_earned),
    }));

  const payRow = db
    .prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(o.id);

  return {
    id: o.id,
    orderNumber: o.order_number,
    userId: o.user_id || undefined,
    customerName: o.customer_name,
    customerEmail: o.customer_email || '',
    customerPhone: o.customer_phone || '',
    orderType: o.order_type,
    tableNumber: o.table_number || undefined,
    scheduledFor: o.scheduled_for || undefined,
    deliveryAddress: o.delivery_address_json
      ? JSON.parse(o.delivery_address_json)
      : null,
    pickupNote: o.pickup_note || '',
    items,
    subtotal: Number(o.subtotal),
    discountAmount: Number(o.discount_amount),
    couponCode: o.coupon_code || undefined,
    loyaltyRedeemedPoints: Number(o.loyalty_redeemed_points),
    loyaltyDiscount: Number(o.loyalty_discount),
    taxAmount: Number(o.tax_amount),
    deliveryFee: Number(o.delivery_fee),
    totalPayable: Number(o.total_payable),
    totalBeans: Number(o.total_beans),
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    status: o.status,
    payment: payRow
      ? {
          id: payRow.id,
          orderId: payRow.order_id,
          gateway: payRow.gateway,
          gatewayOrderId: payRow.gateway_order_id || undefined,
          gatewayPaymentId: payRow.gateway_payment_id || undefined,
          method: payRow.method,
          amount: Number(payRow.amount),
          currency: payRow.currency,
          status: payRow.status,
          refundId: payRow.refund_id || undefined,
          refundAmount: Number(payRow.refund_amount || 0),
          mode: payRow.mode,
          createdAt: payRow.created_at,
        }
      : null,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}

export function getPublicUserProfile(db, userId) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!u) return null;
  const addresses = db
    .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC')
    .all(userId)
    .map((a) => ({
      id: a.id,
      label: a.label,
      recipientName: a.recipient_name,
      phone: a.phone,
      line1: a.line1,
      landmark: a.landmark || '',
      city: a.city,
      pincode: a.pincode,
      isDefault: Boolean(a.is_default),
    }));

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || '',
    role: u.role,
    emailVerified: Boolean(u.email_verified),
    verificationCodePreview:
      !u.email_verified && u.verification_token ? u.verification_token : undefined,
    birthday: u.birthday || '',
    loyaltyPoints: Number(u.loyalty_points),
    membershipLevel: u.membership_level,
    referralCode: u.referral_code,
    referralsCount: Number(u.referrals_count),
    preferredDrink: u.preferred_drink,
    favourites: JSON.parse(u.favourites_json || '[]'),
    addresses,
    createdAt: u.created_at,
  };
}

export function buildFullAdminSnapshot(db) {
  const seed = buildFullSeedData();
  const products = db
    .prepare('SELECT * FROM products ORDER BY sort_order ASC')
    .all()
    .map(mapProductRow);
  const coupons = db
    .prepare('SELECT * FROM coupons ORDER BY created_at DESC')
    .all()
    .map(mapCouponRow);
  const ingredients = db
    .prepare('SELECT * FROM ingredients ORDER BY name ASC')
    .all()
    .map(mapIngredientRow);
  const inventoryLogs = db
    .prepare(`
      SELECT l.*, i.name as ingredient_name
      FROM inventory_logs l
      LEFT JOIN ingredients i ON i.id = l.ingredient_id
      ORDER BY l.created_at DESC
      LIMIT 60
    `)
    .all()
    .map((l) => ({
      id: l.id,
      ingredientId: l.ingredient_id,
      ingredientName: l.ingredient_name || l.ingredient_id,
      changeQty: Number(l.change_qty),
      reason: l.reason,
      orderId: l.order_id || undefined,
      createdBy: l.created_by,
      createdAt: l.created_at,
    }));
  const reviews = db
    .prepare(`
      SELECT r.*, p.name as product_name
      FROM reviews r
      LEFT JOIN products p ON p.id = r.product_id
      ORDER BY r.created_at DESC
    `)
    .all()
    .map(mapReviewRow);
  const orders = db
    .prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 120')
    .all()
    .map((o) => mapOrderRow(db, o));
  const members = db
    .prepare(`
      SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as orders_count
      FROM users u
      WHERE u.role = 'customer'
      ORDER BY u.created_at DESC
    `)
    .all()
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      plan: u.membership_level,
      preferredDrink: u.preferred_drink,
      beansBalance: Number(u.loyalty_points),
      referralCode: u.referral_code,
      referralsCount: Number(u.referrals_count),
      emailVerified: Boolean(u.email_verified),
      active: Boolean(u.active),
      ordersCount: Number(u.orders_count || 0),
      joinedAt: u.created_at,
    }));
  const notifications = db
    .prepare(`
      SELECT * FROM notifications WHERE recipient_scope = 'admin'
      ORDER BY created_at DESC LIMIT 40
    `)
    .all()
    .map((n) => ({
      id: n.id,
      recipientScope: n.recipient_scope,
      userId: n.user_id || undefined,
      type: n.type,
      title: n.title,
      message: n.message,
      read: Boolean(n.read),
      createdAt: n.created_at,
    }));
  const supportTickets = db
    .prepare('SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 50')
    .all()
    .map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone || '',
      subject: s.subject,
      message: s.message,
      status: s.status,
      adminNote: s.admin_note || '',
      createdAt: s.created_at,
    }));

  const commerce = {
    ...seed.commerce,
    ...(getSetting(db, 'commerce', {}) || {}),
    razorpayKeyIdConfigured: Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ),
    razorpayMode:
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
        ? 'live'
        : 'sandbox',
  };

  return {
    brand: { ...seed.brand, ...(getSetting(db, 'brand', {}) || {}) },
    availability: {
      ...seed.availability,
      ...(getSetting(db, 'availability', {}) || {}),
    },
    commerce,
    display: { ...seed.display, ...(getSetting(db, 'display', {}) || {}) },
    rewards: { ...seed.rewards, ...(getSetting(db, 'rewards', {}) || {}) },
    locations: getSetting(db, 'locations', seed.locations),
    menuItems: products,
    coupons,
    ingredients,
    inventoryLogs,
    reviews,
    testimonials: getSetting(db, 'testimonials', seed.testimonials),
    pricingTiers: getSetting(db, 'pricingTiers', seed.pricingTiers),
    faqs: getSetting(db, 'faqs', seed.faqs),
    orders,
    members,
    notifications,
    supportTickets,
    updatedAt: new Date().toISOString(),
  };
}

export function recalcProductRating(db, productId) {
  const agg = db
    .prepare(
      `SELECT COUNT(*) as cnt, AVG(rating) as avg_rating FROM reviews WHERE product_id = ? AND status = 'approved'`
    )
    .get(productId);
  const avg = agg.cnt > 0 ? Number(Number(agg.avg_rating).toFixed(1)) : 4.8;
  db.prepare(
    'UPDATE products SET rating_avg = ?, review_count = ? WHERE id = ?'
  ).run(avg, agg.cnt, productId);
}
