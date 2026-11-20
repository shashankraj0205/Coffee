-- Migration 001: Kulhad & Kaapi Indian Tea & Coffee Café Relational Schema
-- Strictly Tea & Coffee Beverages Platform

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT DEFAULT '',
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'owner')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  verification_token TEXT,
  reset_token TEXT,
  reset_token_expires TEXT,
  birthday TEXT DEFAULT '',
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  membership_level TEXT NOT NULL DEFAULT 'Daily Tapri Club',
  referral_code TEXT NOT NULL UNIQUE,
  referrals_count INTEGER NOT NULL DEFAULT 0,
  referred_by TEXT DEFAULT '',
  preferred_drink TEXT DEFAULT 'Masala Chai',
  favourites_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line1 TEXT NOT NULL,
  landmark TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT 'Bengaluru',
  pincode TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hindi_name TEXT DEFAULT '',
  subtitle TEXT NOT NULL,
  serving_style TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('tea', 'coffee')),
  price INTEGER NOT NULL CHECK (price >= 0),
  original_price INTEGER NOT NULL DEFAULT 0,
  beans_earned INTEGER NOT NULL DEFAULT 30,
  origin TEXT DEFAULT 'India',
  elevation TEXT DEFAULT '',
  notes_json TEXT NOT NULL DEFAULT '[]',
  ingredients_json TEXT NOT NULL DEFAULT '[]',
  preparation_steps TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image TEXT NOT NULL,
  badge TEXT DEFAULT '',
  caffeine TEXT NOT NULL DEFAULT 'Medium' CHECK (caffeine IN ('Low', 'Medium', 'High')),
  supports_hot INTEGER NOT NULL DEFAULT 1,
  supports_cold INTEGER NOT NULL DEFAULT 0,
  default_temp TEXT NOT NULL DEFAULT 'hot' CHECK (default_temp IN ('hot', 'cold')),
  sizes_json TEXT NOT NULL DEFAULT '[]',
  recipe_json TEXT NOT NULL DEFAULT '{}',
  is_bestseller INTEGER NOT NULL DEFAULT 0,
  is_new_arrival INTEGER NOT NULL DEFAULT 0,
  rating_avg REAL NOT NULL DEFAULT 4.8,
  review_count INTEGER NOT NULL DEFAULT 0,
  popularity_score INTEGER NOT NULL DEFAULT 100,
  available INTEGER NOT NULL DEFAULT 1,
  displayed INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  stock_count INTEGER NOT NULL DEFAULT 50,
  sort_order INTEGER NOT NULL DEFAULT 1,
  profile_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_displayed ON products(displayed, sort_order);

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL,
  stock_qty REAL NOT NULL DEFAULT 0,
  low_stock_threshold REAL NOT NULL DEFAULT 100,
  cost_per_unit REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id TEXT PRIMARY KEY,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  change_qty REAL NOT NULL,
  reason TEXT NOT NULL,
  order_id TEXT,
  created_by TEXT DEFAULT 'system',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inv_logs_ing ON inventory_logs(ingredient_id, created_at);

CREATE TABLE IF NOT EXISTS carts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT NOT NULL DEFAULT 'Medium',
  temperature TEXT NOT NULL DEFAULT 'hot',
  sugar_preference TEXT NOT NULL DEFAULT 'Regular Sugar',
  milk_strength TEXT NOT NULL DEFAULT 'Standard',
  special_instructions TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value REAL NOT NULL CHECK (discount_value >= 0),
  min_order_value INTEGER NOT NULL DEFAULT 0,
  max_discount INTEGER NOT NULL DEFAULT 0,
  first_order_only INTEGER NOT NULL DEFAULT 0,
  single_use INTEGER NOT NULL DEFAULT 0,
  is_festival INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  usage_limit INTEGER NOT NULL DEFAULT 0,
  times_used INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

CREATE TABLE IF NOT EXISTS coupon_usages (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  order_id TEXT NOT NULL,
  used_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_lookup ON coupon_usages(coupon_id, user_email);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  order_type TEXT NOT NULL DEFAULT 'pickup' CHECK (order_type IN ('pickup', 'delivery', 'dine_in')),
  table_number TEXT DEFAULT '',
  scheduled_for TEXT DEFAULT '',
  delivery_address_json TEXT DEFAULT '',
  pickup_note TEXT DEFAULT '',
  subtotal REAL NOT NULL,
  discount_amount REAL NOT NULL DEFAULT 0,
  coupon_code TEXT DEFAULT '',
  loyalty_redeemed_points INTEGER NOT NULL DEFAULT 0,
  loyalty_discount REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  delivery_fee REAL NOT NULL DEFAULT 0,
  total_payable REAL NOT NULL,
  total_beans INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  status TEXT NOT NULL DEFAULT 'order_placed' CHECK (status IN (
    'order_placed', 'order_accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'
  )),
  inventory_deducted INTEGER NOT NULL DEFAULT 0,
  loyalty_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'Medium',
  temperature TEXT NOT NULL DEFAULT 'hot',
  sugar_preference TEXT NOT NULL DEFAULT 'Regular Sugar',
  milk_strength TEXT NOT NULL DEFAULT 'Standard',
  special_instructions TEXT DEFAULT '',
  unit_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  beans_earned INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL DEFAULT 'razorpay_sandbox',
  gateway_order_id TEXT UNIQUE,
  gateway_payment_id TEXT UNIQUE,
  gateway_signature TEXT,
  method TEXT NOT NULL DEFAULT 'upi',
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'captured', 'failed', 'refunded')),
  refund_id TEXT,
  refund_amount REAL DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  mode TEXT NOT NULL DEFAULT 'sandbox',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  verified_purchase INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'hidden')),
  admin_reply TEXT DEFAULT '',
  reported INTEGER NOT NULL DEFAULT 0,
  report_reason TEXT DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id, status);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT,
  points_delta INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'referral', 'birthday', 'welcome', 'admin_adjust')),
  description TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_loyalty_user ON loyalty_transactions(user_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_scope TEXT NOT NULL CHECK (recipient_scope IN ('admin', 'customer')),
  user_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  meta_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_scope ON notifications(recipient_scope, user_id, created_at);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  admin_note TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
