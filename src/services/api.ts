import {
  StoreState,
  MenuItem,
  PricingTier,
  FAQItem,
  Testimonial,
  OrderStatus,
  CustomerOrder,
  RitualMember,
  AdminUser,
  CustomerUser,
  DeliveryAddress,
  CartItemLine,
  CartQuoteResult,
  Coupon,
  OrderType,
  PaymentMethod,
  ProductReview,
  LoyaltyTransaction,
  AppNotification,
  AnalyticsSummary,
  BackendConnectionMode,
  PublicOrderTrack,
} from '../types/store';
import { DEFAULT_STORE_STATE } from '../data/defaultStore';
import { computeShopStatus } from '../utils/schedule';
import { getUnitPriceForSize } from '../utils/commerce';

const STORAGE_DB_KEY = 'kulhad_kaapi_fullstack_v6';
const STORAGE_ADMIN_TOKEN = 'kulhad_kaapi_admin_token_v4';
const STORAGE_CUST_TOKEN = 'kulhad_kaapi_cust_token_v4';
const STORAGE_CUST_PROFILE = 'kulhad_kaapi_cust_profile_v4';
const STORAGE_API_URL_KEY = 'kulhad_kaapi_api_url_v4';
const STORAGE_ADMIN_PWD_KEY = 'kulhad_kaapi_admin_pwd_v4';
const STORAGE_ADMIN_CREDS_KEY = 'kulhad_kaapi_admin_creds_v4';

interface LocalAdminCreds {
  username: string;
  email: string;
  name: string;
}

export function getSavedLocalAdminInfo(): LocalAdminCreds {
  try {
    const raw = localStorage.getItem(STORAGE_ADMIN_CREDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalAdminCreds>;
      return {
        username: parsed.username || 'admin',
        email: parsed.email || 'admin@kulhadkaapi.in',
        name: parsed.name || 'Chai & Kaapi Owner',
      };
    }
  } catch {
    // ignore
  }
  return {
    username: 'admin',
    email: 'admin@kulhadkaapi.in',
    name: 'Chai & Kaapi Owner',
  };
}

function getDefaultApiBase(): string {
  const saved = localStorage.getItem(STORAGE_API_URL_KEY);
  if (saved) return saved.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:4000/api';
}

export function getConfiguredApiBase(): string {
  return getDefaultApiBase();
}

export function setConfiguredApiBase(url: string) {
  const clean = url.trim().replace(/\/+$/, '');
  if (clean) localStorage.setItem(STORAGE_API_URL_KEY, clean);
  else localStorage.removeItem(STORAGE_API_URL_KEY);
}

export function getSavedAdminToken(): string | null {
  return localStorage.getItem(STORAGE_ADMIN_TOKEN);
}

export function setSavedAdminToken(token: string | null) {
  if (token) localStorage.setItem(STORAGE_ADMIN_TOKEN, token);
  else localStorage.removeItem(STORAGE_ADMIN_TOKEN);
}

export function getSavedCustomerToken(): string | null {
  return localStorage.getItem(STORAGE_CUST_TOKEN);
}

export function setSavedCustomerToken(token: string | null) {
  if (token) localStorage.setItem(STORAGE_CUST_TOKEN, token);
  else localStorage.removeItem(STORAGE_CUST_TOKEN);
}

function cloneDefault(): StoreState {
  return JSON.parse(JSON.stringify(DEFAULT_STORE_STATE)) as StoreState;
}

function mergeLocalDefaults(parsed: Partial<StoreState>): StoreState {
  const defaults = cloneDefault();
  return {
    ...defaults,
    ...parsed,
    brand: { ...defaults.brand, ...(parsed.brand || {}) },
    availability: { ...defaults.availability, ...(parsed.availability || {}) },
    commerce: { ...defaults.commerce, ...(parsed.commerce || {}) },
    display: { ...defaults.display, ...(parsed.display || {}) },
    rewards: { ...defaults.rewards, ...(parsed.rewards || {}) },
    locations: Array.isArray(parsed.locations) ? parsed.locations : defaults.locations,
    menuItems: Array.isArray(parsed.menuItems) ? parsed.menuItems : defaults.menuItems,
    coupons: Array.isArray(parsed.coupons) ? parsed.coupons : defaults.coupons,
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : defaults.ingredients,
    inventoryLogs: Array.isArray(parsed.inventoryLogs) ? parsed.inventoryLogs : defaults.inventoryLogs,
    reviews: Array.isArray(parsed.reviews) ? parsed.reviews : defaults.reviews,
    testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials : defaults.testimonials,
    pricingTiers: Array.isArray(parsed.pricingTiers) ? parsed.pricingTiers : defaults.pricingTiers,
    faqs: Array.isArray(parsed.faqs) ? parsed.faqs : defaults.faqs,
    orders: Array.isArray(parsed.orders) ? parsed.orders : defaults.orders,
    members: Array.isArray(parsed.members) ? parsed.members : defaults.members,
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : defaults.notifications,
    supportTickets: Array.isArray(parsed.supportTickets) ? parsed.supportTickets : defaults.supportTickets,
  };
}

function readLocalStore(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_DB_KEY);
    if (!raw) {
      const seed = cloneDefault();
      localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(seed));
      return seed;
    }
    return mergeLocalDefaults(JSON.parse(raw) as Partial<StoreState>);
  } catch {
    return cloneDefault();
  }
}

function writeLocalStore(next: StoreState): StoreState {
  const stamped: StoreState = { ...next, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(stamped));
  try {
    const channel = new BroadcastChannel('kulhad_kaapi_sync');
    channel.postMessage({ type: 'STORE_UPDATED', updatedAt: stamped.updatedAt });
    channel.close();
  } catch {
    // ignore
  }
  return stamped;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 1500
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function computeLocalQuote(
  store: StoreState,
  payload: {
    items: CartItemLine[];
    orderType: OrderType;
    couponCode?: string;
    redeemPoints?: number;
    customerEmail?: string;
    availablePoints?: number;
  }
): CartQuoteResult {
  let subtotal = 0;
  let totalBeans = 0;
  for (const line of payload.items) {
    const item = store.menuItems.find((m) => m.id === line.itemId);
    if (!item || !item.available || item.stockCount <= 0) continue;
    const unit = getUnitPriceForSize(item, line.size);
    subtotal += unit * line.quantity;
    totalBeans += item.beansEarned * line.quantity;
  }

  let discountAmount = 0;
  let couponApplied: Coupon | null = null;
  let couponError: string | undefined;
  const code = (payload.couponCode || '').trim().toUpperCase();
  if (code) {
    const c = store.coupons.find((cp) => cp.code.toUpperCase() === code && cp.active);
    if (!c) {
      couponError = `Coupon "${code}" is invalid or inactive.`;
    } else if (subtotal < c.minOrderValue) {
      couponError = `Minimum order ₹${c.minOrderValue} required for ${code}.`;
    } else {
      let d =
        c.discountType === 'percentage'
          ? (subtotal * c.discountValue) / 100
          : c.discountValue;
      if (c.maxDiscount > 0) d = Math.min(d, c.maxDiscount);
      discountAmount = Number(Math.min(subtotal, d).toFixed(2));
      couponApplied = c;
    }
  }

  let loyaltyRedeemedPoints = 0;
  let loyaltyDiscount = 0;
  const reqPts = Math.max(0, Math.floor(Number(payload.redeemPoints) || 0));
  const availPts = Number(payload.availablePoints || 0);
  if (reqPts >= store.commerce.minPointsToRedeem && availPts >= reqPts) {
    const maxInr =
      ((subtotal - discountAmount) * store.commerce.maxRedeemPercentOfSubtotal) / 100;
    const maxPts = Math.floor(
      maxInr / Math.max(0.05, store.commerce.pointRedemptionValueInr)
    );
    loyaltyRedeemedPoints = Math.min(reqPts, availPts, maxPts);
    loyaltyDiscount = Number(
      (loyaltyRedeemedPoints * store.commerce.pointRedemptionValueInr).toFixed(2)
    );
  }

  const taxableBase = Math.max(0, subtotal - discountAmount - loyaltyDiscount);
  const taxAmount = Number(
    ((taxableBase * store.commerce.taxRatePercent) / 100).toFixed(2)
  );
  const deliveryFee =
    payload.orderType === 'delivery'
      ? subtotal >= store.commerce.freeDeliveryAbove
        ? 0
        : store.commerce.deliveryCharge
      : 0;
  const totalPayable = Number(
    Math.max(0, taxableBase + taxAmount + deliveryFee).toFixed(2)
  );

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount,
    couponApplied,
    couponError,
    loyaltyRedeemedPoints,
    loyaltyDiscount,
    taxRatePercent: store.commerce.taxRatePercent,
    taxAmount,
    deliveryFee,
    totalPayable,
    totalBeans,
  };
}

export function computeLocalAnalytics(
  store: StoreState,
  period: string = 'weekly'
): AnalyticsSummary {
  const valid = store.orders.filter((o) => o.status !== 'cancelled');
  const todayStr = new Date().toISOString().slice(0, 10);
  const totalSales = Number(
    valid.reduce((s, o) => s + o.totalPayable, 0).toFixed(2)
  );
  const todayRevenue = Number(
    valid
      .filter((o) => o.createdAt.startsWith(todayStr))
      .reduce((s, o) => s + o.totalPayable, 0)
      .toFixed(2)
  );
  const pendingOrders = store.orders.filter((o) =>
    !['delivered', 'cancelled'].includes(o.status)
  ).length;
  const completedOrders = store.orders.filter((o) => o.status === 'delivered').length;
  const cancelledOrders = store.orders.filter((o) => o.status === 'cancelled').length;

  let teaSalesRevenue = 0;
  let coffeeSalesRevenue = 0;
  let teaCupsSold = 0;
  let coffeeCupsSold = 0;
  const prodMap = new Map<
    string,
    { id: string; name: string; category: string; cups: number; revenue: number }
  >();
  for (const m of store.menuItems) {
    prodMap.set(m.id, {
      id: m.id,
      name: m.name,
      category: m.category,
      cups: 0,
      revenue: 0,
    });
  }
  for (const o of valid) {
    for (const it of o.items) {
      const rev = it.price * it.quantity;
      if (it.category === 'tea') {
        teaSalesRevenue += rev;
        teaCupsSold += it.quantity;
      } else {
        coffeeSalesRevenue += rev;
        coffeeCupsSold += it.quantity;
      }
      const cur = prodMap.get(it.itemId) || {
        id: it.itemId,
        name: it.name,
        category: it.category,
        cups: 0,
        revenue: 0,
      };
      cur.cups += it.quantity;
      cur.revenue += rev;
      prodMap.set(it.itemId, cur);
    }
  }
  const sortedProds = Array.from(prodMap.values()).sort(
    (a, b) => b.cups - a.cups || b.revenue - a.revenue
  );

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  const revenueSeries =
    period === 'yearly'
      ? ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((m, idx) => ({
          label: m,
          revenue: Math.round(totalSales * (0.12 + idx * 0.04)),
          orders: Math.max(1, Math.round(valid.length * (0.2 + idx * 0.1))),
        }))
      : Array.from({ length: 7 }).map((_, idx) => {
          const dt = new Date(now.getTime() - (6 - idx) * 86400000);
          const key = dt.toISOString().slice(0, 10);
          const matched = valid.filter((o) => o.createdAt.startsWith(key));
          return {
            label: days[dt.getDay()],
            revenue: Math.round(matched.reduce((s, o) => s + o.totalPayable, 0)),
            orders: matched.length,
          };
        });

  const peakHours = [
    { hour: '7-10 AM', min: 7, max: 10 },
    { hour: '10-1 PM', min: 10, max: 13 },
    { hour: '1-4 PM', min: 13, max: 16 },
    { hour: '4-7 PM', min: 16, max: 19 },
    { hour: '7-11 PM', min: 19, max: 24 },
  ].map((b) => ({
    hour: b.hour,
    orders: valid.filter((o) => {
      const h = new Date(o.createdAt).getHours();
      return h >= b.min && h < b.max;
    }).length,
  }));

  const payMap = new Map<string, { method: string; count: number; amount: number }>();
  const cpnMap = new Map<string, { code: string; uses: number; discountTotal: number }>();
  for (const o of valid) {
    const p = payMap.get(o.paymentMethod) || {
      method: o.paymentMethod,
      count: 0,
      amount: 0,
    };
    p.count += 1;
    p.amount = Number((p.amount + o.totalPayable).toFixed(2));
    payMap.set(o.paymentMethod, p);

    if (o.couponCode) {
      const c = cpnMap.get(o.couponCode) || {
        code: o.couponCode,
        uses: 0,
        discountTotal: 0,
      };
      c.uses += 1;
      c.discountTotal += o.discountAmount;
      cpnMap.set(o.couponCode, c);
    }
  }

  return {
    totalSales,
    todayRevenue,
    totalOrders: store.orders.length,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    activeCustomers: store.members.length,
    avgOrderValue: valid.length ? Number((totalSales / valid.length).toFixed(2)) : 0,
    retentionRatePercent: 42,
    teaSalesRevenue,
    coffeeSalesRevenue,
    teaCupsSold,
    coffeeCupsSold,
    bestSelling: sortedProds.slice(0, 6),
    leastSelling: [...sortedProds].reverse().slice(0, 5),
    revenueSeries,
    peakHours,
    paymentBreakdown: Array.from(payMap.values()),
    couponStats: Array.from(cpnMap.values()),
  };
}

class KulhadApiClient {
  public mode: BackendConnectionMode = 'local-db';

  async detectBackend(): Promise<BackendConnectionMode> {
    const originCandidate =
      typeof window !== 'undefined' && window.location.protocol.startsWith('http')
        ? `${window.location.origin}/api`
        : null;
    const candidates = Array.from(
      new Set([getDefaultApiBase(), originCandidate, 'http://localhost:4000/api'].filter(Boolean) as string[])
    );

    for (const base of candidates) {
      try {
        const res = await fetchWithTimeout(`${base}/health`, {}, 1100);
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data?.service === 'kulhad-kaapi-fullstack-backend') {
            setConfiguredApiBase(base);
            this.mode = 'live-api';
            return 'live-api';
          }
        }
      } catch {
        // try next
      }
    }
    this.mode = 'local-db';
    return 'local-db';
  }

  private adminHeaders(): Record<string, string> {
    const token = getSavedAdminToken();
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  private customerHeaders(): Record<string, string> {
    const token = getSavedCustomerToken();
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  async getStorefront(): Promise<{
    store: StoreState;
    mode: BackendConnectionMode;
    memberCount: number;
  }> {
    const mode = await this.detectBackend();
    if (mode === 'live-api') {
      try {
        if (getSavedAdminToken()) {
          const admRes = await fetchWithTimeout(
            `${getDefaultApiBase()}/admin/state`,
            { headers: this.adminHeaders() },
            2500
          );
          if (admRes.ok) {
            const d = await admRes.json();
            const merged = mergeLocalDefaults(d.store);
            return { store: merged, mode: 'live-api', memberCount: merged.members.length };
          }
        }
        const res = await fetchWithTimeout(`${getDefaultApiBase()}/storefront`, {}, 2500);
        if (res.ok) {
          const pub = await res.json();
          const local = readLocalStore();
          const merged = mergeLocalDefaults({ ...local, ...pub });
          return {
            store: merged,
            mode: 'live-api',
            memberCount: Number(pub.stats?.totalMembers ?? merged.members.length),
          };
        }
      } catch {
        this.mode = 'local-db';
      }
    }
    const local = readLocalStore();
    return { store: local, mode: 'local-db', memberCount: local.members.length };
  }

  // ---------- Customer Auth & Profile ----------
  async registerCustomer(payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    preferredDrink?: string;
    referralCode?: string;
    birthday?: string;
  }): Promise<{ token: string; user: CustomerUser }> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Registration failed.');
      setSavedCustomerToken(d.token);
      return d;
    }

    const current = readLocalStore();
    const email = payload.email.trim().toLowerCase();
    if (current.members.some((m) => m.email.toLowerCase() === email)) {
      throw new Error('An account with this email already exists.');
    }
    const user: CustomerUser = {
      id: `usr-${Math.random().toString(36).slice(2, 9)}`,
      name: payload.name.trim() || email.split('@')[0],
      email,
      phone: payload.phone.trim(),
      role: 'customer',
      emailVerified: false,
      verificationCodePreview: '482910',
      birthday: payload.birthday || '',
      loyaltyPoints: current.rewards.welcomeBonusBeans || 100,
      membershipLevel: 'Daily Tapri Club (Free)',
      referralCode: `${email.split('@')[0].slice(0, 8)}-${Math.floor(100 + Math.random() * 899)}`,
      referralsCount: 0,
      preferredDrink: payload.preferredDrink || 'Masala Chai',
      favourites: [],
      addresses: [],
      createdAt: new Date().toISOString(),
    };
    const token = `local-cust-${btoa(`${email}:${Date.now()}`)}`;
    setSavedCustomerToken(token);
    localStorage.setItem(STORAGE_CUST_PROFILE, JSON.stringify(user));
    writeLocalStore({
      ...current,
      members: [
        {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          plan: user.membershipLevel,
          preferredDrink: user.preferredDrink,
          beansBalance: user.loyaltyPoints,
          referralCode: user.referralCode,
          referralsCount: 0,
          emailVerified: false,
          active: true,
          joinedAt: user.createdAt,
        },
        ...current.members,
      ],
    });
    return { token, user };
  }

  async loginCustomer(email: string, password: string): Promise<{ token: string; user: CustomerUser }> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/auth/customer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Invalid email or password.');
      setSavedCustomerToken(d.token);
      return d;
    }

    const clean = email.trim().toLowerCase();
    const saved = localStorage.getItem(STORAGE_CUST_PROFILE);
    if (saved) {
      const parsed = JSON.parse(saved) as CustomerUser;
      if (parsed.email.toLowerCase() === clean && password.length >= 4) {
        const token = `local-cust-${btoa(`${clean}:${Date.now()}`)}`;
        setSavedCustomerToken(token);
        return { token, user: parsed };
      }
    }
    const store = readLocalStore();
    const member = store.members.find((m) => m.email.toLowerCase() === clean);
    if (member && password.length >= 4) {
      const user: CustomerUser = {
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone || '',
        role: 'customer',
        emailVerified: true,
        birthday: '',
        loyaltyPoints: member.beansBalance,
        membershipLevel: member.plan,
        referralCode: member.referralCode,
        referralsCount: member.referralsCount,
        preferredDrink: member.preferredDrink,
        favourites: ['masala-chai', 'south-indian-filter-coffee'],
        addresses: [
          {
            id: 'addr-1',
            label: 'Home',
            recipientName: member.name,
            phone: member.phone || '+91 98450 11223',
            line1: '24, 12th Main Road, Indiranagar',
            city: 'Bengaluru',
            pincode: '560038',
            isDefault: true,
          },
        ],
        createdAt: member.joinedAt,
      };
      const token = `local-cust-${btoa(`${clean}:${Date.now()}`)}`;
      setSavedCustomerToken(token);
      localStorage.setItem(STORAGE_CUST_PROFILE, JSON.stringify(user));
      return { token, user };
    }
    throw new Error('Invalid email or password. Try demo: ananya@studio.in / chai1234');
  }

  logoutCustomer() {
    setSavedCustomerToken(null);
  }

  async getCustomerHub(): Promise<{
    user: CustomerUser;
    orders: CustomerOrder[];
    loyaltyHistory: LoyaltyTransaction[];
    notifications: AppNotification[];
    cartItems: CartItemLine[];
  } | null> {
    if (!getSavedCustomerToken()) return null;
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/customer/me`, {
        headers: this.customerHeaders(),
      });
      if (!res.ok) {
        setSavedCustomerToken(null);
        return null;
      }
      return res.json();
    }
    const raw = localStorage.getItem(STORAGE_CUST_PROFILE);
    if (!raw) return null;
    const user = JSON.parse(raw) as CustomerUser;
    const store = readLocalStore();
    const orders = store.orders.filter(
      (o) =>
        o.userId === user.id ||
        o.customerEmail.toLowerCase() === user.email.toLowerCase()
    );
    return {
      user,
      orders,
      loyaltyHistory: [
        {
          id: 'ltx-loc',
          userId: user.id,
          pointsDelta: user.loyaltyPoints,
          type: 'earn',
          description: 'Current Chai Coins Balance',
          createdAt: user.createdAt,
        },
      ],
      notifications: [],
      cartItems: [],
    };
  }

  async verifyCustomerEmail(code: string): Promise<CustomerUser> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/auth/verify-email`, {
        method: 'POST',
        headers: this.customerHeaders(),
        body: JSON.stringify({ code }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Verification failed.');
      return d.user;
    }
    const raw = localStorage.getItem(STORAGE_CUST_PROFILE);
    if (!raw) throw new Error('Not signed in.');
    const user = JSON.parse(raw) as CustomerUser;
    if (code.trim() !== (user.verificationCodePreview || '482910')) {
      throw new Error('Invalid verification code.');
    }
    const next = { ...user, emailVerified: true, verificationCodePreview: undefined };
    localStorage.setItem(STORAGE_CUST_PROFILE, JSON.stringify(next));
    return next;
  }

  async forgotPassword(email: string): Promise<{ message: string; devResetCode?: string }> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return res.json();
    }
    return {
      message: 'Reset code generated for local preview.',
      devResetCode: '739204',
    };
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Reset failed');
      return;
    }
    if (newPassword.length < 6) throw new Error('Password must be 6+ characters.');
  }

  async updateCustomerProfile(patch: Partial<CustomerUser>): Promise<CustomerUser> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/customer/profile`, {
        method: 'PUT',
        headers: this.customerHeaders(),
        body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to update profile');
      return d.user;
    }
    const raw = localStorage.getItem(STORAGE_CUST_PROFILE);
    const cur = raw ? (JSON.parse(raw) as CustomerUser) : null;
    if (!cur) throw new Error('Not signed in');
    const next = { ...cur, ...patch };
    localStorage.setItem(STORAGE_CUST_PROFILE, JSON.stringify(next));
    return next;
  }

  async toggleFavourite(productId: string): Promise<string[]> {
    if (this.mode === 'live-api' && getSavedCustomerToken()) {
      const res = await fetch(`${getDefaultApiBase()}/customer/favourites/${productId}`, {
        method: 'POST',
        headers: this.customerHeaders(),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      return d.favourites;
    }
    const raw = localStorage.getItem(STORAGE_CUST_PROFILE);
    if (!raw) return [];
    const cur = JSON.parse(raw) as CustomerUser;
    const set = new Set(cur.favourites || []);
    if (set.has(productId)) set.delete(productId);
    else set.add(productId);
    const favs = Array.from(set);
    localStorage.setItem(STORAGE_CUST_PROFILE, JSON.stringify({ ...cur, favourites: favs }));
    return favs;
  }

  async addCustomerAddress(addr: Omit<DeliveryAddress, 'id'>): Promise<CustomerUser> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/customer/addresses`, {
        method: 'POST',
        headers: this.customerHeaders(),
        body: JSON.stringify(addr),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not save address');
      return d.user;
    }
    const raw = localStorage.getItem(STORAGE_CUST_PROFILE);
    if (!raw) throw new Error('Please sign in first.');
    const cur = JSON.parse(raw) as CustomerUser;
    const nextAddr: DeliveryAddress = {
      ...addr,
      id: `addr-${Math.random().toString(36).slice(2, 8)}`,
    };
    const next = { ...cur, addresses: [nextAddr, ...(cur.addresses || [])] };
    localStorage.setItem(STORAGE_CUST_PROFILE, JSON.stringify(next));
    return next;
  }

  async deleteCustomerAddress(id: string): Promise<CustomerUser> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/customer/addresses/${id}`, {
        method: 'DELETE',
        headers: this.customerHeaders(),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not delete address');
      return d.user;
    }
    const raw = localStorage.getItem(STORAGE_CUST_PROFILE);
    if (!raw) throw new Error('Not signed in');
    const cur = JSON.parse(raw) as CustomerUser;
    const next = {
      ...cur,
      addresses: (cur.addresses || []).filter((a) => a.id !== id),
    };
    localStorage.setItem(STORAGE_CUST_PROFILE, JSON.stringify(next));
    return next;
  }

  async syncCartToServer(items: CartItemLine[]): Promise<void> {
    if (this.mode === 'live-api' && getSavedCustomerToken()) {
      await fetch(`${getDefaultApiBase()}/cart`, {
        method: 'PUT',
        headers: this.customerHeaders(),
        body: JSON.stringify({ items }),
      }).catch(() => {});
    }
  }

  // ---------- Server-Validated Cart Quote & Ordering ----------
  async getCartQuote(payload: {
    items: CartItemLine[];
    orderType: OrderType;
    couponCode?: string;
    redeemPoints?: number;
    customerEmail?: string;
    availablePoints?: number;
  }): Promise<CartQuoteResult> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/cart/quote`, {
        method: 'POST',
        headers: this.customerHeaders(),
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Unable to compute quote');
      return d;
    }
    return computeLocalQuote(readLocalStore(), payload);
  }

  async placeOrder(payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    orderType: OrderType;
    tableNumber?: string;
    scheduledFor?: string;
    deliveryAddress?: DeliveryAddress | null;
    pickupNote: string;
    couponCode?: string;
    redeemPoints?: number;
    paymentMethod: PaymentMethod;
    idempotencyKey?: string;
    items: CartItemLine[];
    availablePoints?: number;
  }): Promise<{
    order: CustomerOrder;
    paymentSession: {
      gateway: string;
      mode: 'sandbox' | 'live';
      gatewayOrderId: string;
      amountPaise: number;
      currency: string;
      keyId: string;
      sandboxNotice?: string;
    } | null;
    menuItems: MenuItem[];
    fullStore?: StoreState;
  }> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/orders`, {
        method: 'POST',
        headers: this.customerHeaders(),
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Unable to place order');
      return d;
    }

    const current = readLocalStore();
    const statusNow = computeShopStatus(current.availability);
    if (!statusNow.canOrder && !payload.scheduledFor) {
      throw new Error(statusNow.detailText || 'Ordering is currently paused.');
    }

    const quote = computeLocalQuote(current, payload);
    const updatedMenu = current.menuItems.map((m) => ({ ...m }));
    const resolvedItems = payload.items
      .map((line) => {
        const item = updatedMenu.find((m) => m.id === line.itemId);
        if (!item || !item.available || item.stockCount <= 0) {
          throw new Error(`${item?.name || 'Item'} is currently sold out.`);
        }
        const qty = Math.min(Math.max(1, line.quantity), item.stockCount);
        item.stockCount = Math.max(0, item.stockCount - qty);
        if (item.stockCount === 0) item.available = false;
        return {
          itemId: item.id,
          name: item.name,
          category: item.category,
          size: line.size,
          temperature: line.temperature,
          sugarPreference: line.sugarPreference,
          milkStrength: line.milkStrength,
          specialInstructions: line.specialInstructions,
          price: getUnitPriceForSize(item, line.size),
          quantity: qty,
          beansEarned: item.beansEarned,
        };
      });

    const isRazorpay = payload.paymentMethod.startsWith('razorpay');
    const orderId = `ord-${Math.random().toString(36).slice(2, 10)}`;
    const orderNumber = `CKP-${Math.floor(1050 + Math.random() * 8800)}`;
    const order: CustomerOrder = {
      id: orderId,
      orderNumber,
      customerName: payload.customerName.trim() || 'Guest Sipper',
      customerEmail: payload.customerEmail.trim(),
      customerPhone: payload.customerPhone.trim(),
      orderType: payload.orderType,
      tableNumber: payload.tableNumber,
      scheduledFor: payload.scheduledFor,
      deliveryAddress: payload.deliveryAddress || null,
      pickupNote: payload.pickupNote.trim(),
      items: resolvedItems,
      subtotal: quote.subtotal,
      discountAmount: quote.discountAmount,
      couponCode: quote.couponApplied?.code,
      loyaltyRedeemedPoints: quote.loyaltyRedeemedPoints,
      loyaltyDiscount: quote.loyaltyDiscount,
      taxAmount: quote.taxAmount,
      deliveryFee: quote.deliveryFee,
      totalPayable: quote.totalPayable,
      totalBeans: quote.totalBeans,
      paymentMethod: payload.paymentMethod,
      paymentStatus: 'pending',
      status: 'order_placed',
      createdAt: new Date().toISOString(),
    };

    // Deduct local ingredients cleanly too
    const nextIngredients = current.ingredients.map((ing) => ({ ...ing }));
    for (const ri of resolvedItems) {
      const prod = current.menuItems.find((p) => p.id === ri.itemId);
      if (!prod?.recipe) continue;
      for (const [ingId, baseQty] of Object.entries(prod.recipe)) {
        const target = nextIngredients.find((x) => x.id === ingId);
        if (target) {
          target.stockQty = Math.max(0, Number((target.stockQty - baseQty * ri.quantity).toFixed(1)));
        }
      }
    }

    const nextStore = writeLocalStore({
      ...current,
      menuItems: updatedMenu,
      ingredients: nextIngredients,
      orders: [order, ...current.orders],
      notifications: [
        {
          id: `ntf-${Date.now()}`,
          recipientScope: 'admin',
          type: 'new_order',
          title: `New ${payload.orderType.toUpperCase()} Order #${orderNumber}`,
          message: `${order.customerName} placed an order for ₹${order.totalPayable}.`,
          read: false,
          createdAt: order.createdAt,
        },
        ...current.notifications,
      ],
    });

    return {
      order,
      paymentSession: isRazorpay
        ? {
            gateway: 'razorpay',
            mode: 'sandbox',
            gatewayOrderId: `order_test_${orderId}`,
            amountPaise: Math.round(order.totalPayable * 100),
            currency: 'INR',
            keyId: 'rzp_test_sandbox_demo',
            sandboxNotice:
              'Sandbox Test Mode: Configure RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in .env to enable live Razorpay transactions.',
          }
        : null,
      menuItems: updatedMenu,
      fullStore: nextStore,
    };
  }

  async verifyPayment(payload: {
    orderId: string;
    gatewayOrderId?: string;
    simulateSuccess?: boolean;
    simulateFailure?: boolean;
  }): Promise<{ ok: boolean; order: CustomerOrder }> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Payment verification failed');
      return d;
    }

    const current = readLocalStore();
    if (payload.simulateFailure) {
      writeLocalStore({
        ...current,
        orders: current.orders.map((o) =>
          o.id === payload.orderId ? { ...o, paymentStatus: 'failed' } : o
        ),
      });
      throw new Error('Payment declined in Sandbox test mode. Try again or pick COD.');
    }
    const updatedOrders = current.orders.map((o) =>
      o.id === payload.orderId
        ? { ...o, paymentStatus: 'paid' as const, status: 'order_accepted' as const }
        : o
    );
    writeLocalStore({ ...current, orders: updatedOrders });
    return {
      ok: true,
      order: updatedOrders.find((o) => o.id === payload.orderId)!,
    };
  }

  async trackOrder(orderNumber: string): Promise<PublicOrderTrack | null> {
    if (this.mode === 'live-api') {
      try {
        const res = await fetch(
          `${getDefaultApiBase()}/orders/${encodeURIComponent(orderNumber)}`
        );
        if (!res.ok) return null;
        const d = await res.json();
        return d.order || null;
      } catch {
        return null;
      }
    }
    const current = readLocalStore();
    const o = current.orders.find(
      (x) => x.orderNumber.toUpperCase() === orderNumber.toUpperCase()
    );
    if (!o) return null;
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      orderType: o.orderType,
      tableNumber: o.tableNumber,
      scheduledFor: o.scheduledFor,
      items: o.items,
      subtotal: o.subtotal,
      discountAmount: o.discountAmount,
      loyaltyDiscount: o.loyaltyDiscount,
      taxAmount: o.taxAmount,
      deliveryFee: o.deliveryFee,
      totalPayable: o.totalPayable,
      totalBeans: o.totalBeans,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      pickupNote: o.pickupNote,
      status: o.status,
      createdAt: o.createdAt,
    };
  }

  // ---------- Reviews & Support ----------
  async submitReview(payload: {
    productId: string;
    rating: number;
    comment: string;
  }): Promise<ProductReview> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/reviews`, {
        method: 'POST',
        headers: this.customerHeaders(),
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not submit review');
      return d.review;
    }

    const rawUser = localStorage.getItem(STORAGE_CUST_PROFILE);
    if (!rawUser) throw new Error('Please sign in to post a verified review.');
    const user = JSON.parse(rawUser) as CustomerUser;
    const current = readLocalStore();
    const bought = current.orders.some(
      (o) =>
        o.status !== 'cancelled' &&
        (o.userId === user.id ||
          o.customerEmail.toLowerCase() === user.email.toLowerCase()) &&
        o.items.some((i) => i.itemId === payload.productId)
    );
    if (!bought) {
      throw new Error('Only verified purchasers of this beverage can submit a review.');
    }
    const prod = current.menuItems.find((m) => m.id === payload.productId);
    const rev: ProductReview = {
      id: `rev-${Date.now()}`,
      productId: payload.productId,
      productName: prod?.name,
      userId: user.id,
      userName: user.name,
      rating: payload.rating,
      comment: payload.comment.trim(),
      verifiedPurchase: true,
      status: 'approved',
      createdAt: new Date().toISOString(),
    };
    const nextReviews = [rev, ...current.reviews];
    writeLocalStore({ ...current, reviews: nextReviews });
    return rev;
  }

  async reportReview(reviewId: string, reason: string): Promise<void> {
    if (this.mode === 'live-api') {
      await fetch(`${getDefaultApiBase()}/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      return;
    }
    const current = readLocalStore();
    writeLocalStore({
      ...current,
      reviews: current.reviews.map((r) =>
        r.id === reviewId ? { ...r, reported: true, reportReason: reason } : r
      ),
    });
  }

  async submitSupportTicket(payload: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }): Promise<void> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/support`, {
        method: 'POST',
        headers: this.customerHeaders(),
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not submit inquiry');
      return;
    }
    const current = readLocalStore();
    writeLocalStore({
      ...current,
      supportTickets: [
        {
          id: `sup-${Date.now()}`,
          ...payload,
          status: 'open',
          createdAt: new Date().toISOString(),
        },
        ...current.supportTickets,
      ],
    });
  }

  async registerMember(payload: {
    name: string;
    email: string;
    plan: string;
    preferredDrink: string;
  }): Promise<{ member: RitualMember; store: StoreState }> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not register');
      const refreshed = await this.getStorefront();
      return { member: d.member, store: refreshed.store };
    }
    const current = readLocalStore();
    const cleanEmail = payload.email.trim().toLowerCase();
    const existing = current.members.find((m) => m.email.toLowerCase() === cleanEmail);
    if (existing) return { member: existing, store: current };
    const member: RitualMember = {
      id: `mem-${Math.random().toString(36).slice(2, 9)}`,
      name: payload.name.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      plan: payload.plan,
      preferredDrink: payload.preferredDrink,
      beansBalance: current.rewards.welcomeBonusBeans || 100,
      referralCode: `${cleanEmail.split('@')[0].slice(0, 8)}-${Math.floor(100 + Math.random() * 899)}`,
      referralsCount: 0,
      active: true,
      joinedAt: new Date().toISOString(),
    };
    const nextStore = writeLocalStore({
      ...current,
      members: [member, ...current.members],
    });
    return { member, store: nextStore };
  }

  // ---------- Admin Operations ----------
  async loginAdmin(
    identifier: string,
    password: string
  ): Promise<{ token: string; user: AdminUser }> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: identifier,
          email: identifier,
          password,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Authentication failed');
      setSavedAdminToken(d.token);
      return d;
    }
    const storedPwd = localStorage.getItem(STORAGE_ADMIN_PWD_KEY) || 'chai2026';
    const savedCreds = getSavedLocalAdminInfo();
    const clean = identifier.trim().toLowerCase();
    const matchesUserOrEmail =
      clean === savedCreds.username.toLowerCase() ||
      clean === savedCreds.email.toLowerCase();
    if (!matchesUserOrEmail || password !== storedPwd) {
      throw new Error('Invalid admin username/email or password.');
    }
    const token = `local-admin-${btoa(`${savedCreds.username}:${Date.now()}`)}`;
    setSavedAdminToken(token);
    return {
      token,
      user: {
        username: savedCreds.username,
        email: savedCreds.email,
        name: savedCreds.name,
        role: 'owner',
      },
    };
  }

  async verifyAdminSession(): Promise<AdminUser | null> {
    const token = getSavedAdminToken();
    if (!token) return null;
    if (this.mode === 'live-api') {
      try {
        const res = await fetch(`${getDefaultApiBase()}/auth/me`, {
          headers: this.adminHeaders(),
        });
        if (!res.ok) {
          setSavedAdminToken(null);
          return null;
        }
        return (await res.json()).user;
      } catch {
        return null;
      }
    }
    if (token.startsWith('local-admin-')) {
      const savedCreds = getSavedLocalAdminInfo();
      return {
        username: savedCreds.username,
        email: savedCreds.email,
        name: savedCreds.name,
        role: 'owner',
      };
    }
    return null;
  }

  logoutAdmin() {
    setSavedAdminToken(null);
  }

  async updateAdminCredentials(payload: {
    currentPassword: string;
    username: string;
    email: string;
    name: string;
    newPassword?: string;
  }): Promise<AdminUser> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/auth/credentials`, {
        method: 'PUT',
        headers: this.adminHeaders(),
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Unable to update admin credentials.');
      if (d.token) setSavedAdminToken(d.token);
      return d.user;
    }

    const storedPwd = localStorage.getItem(STORAGE_ADMIN_PWD_KEY) || 'chai2026';
    if (payload.currentPassword !== storedPwd) {
      throw new Error('Current password is incorrect.');
    }
    const cleanUser = payload.username.trim().toLowerCase();
    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanName = payload.name.trim() || 'Chai & Kaapi Owner';
    if (cleanUser.length < 3 || /\s/.test(cleanUser)) {
      throw new Error('Username must be 3+ characters without spaces.');
    }
    if (!cleanEmail.includes('@')) {
      throw new Error('Please enter a valid admin email.');
    }
    if (payload.newPassword && payload.newPassword.trim().length > 0) {
      if (payload.newPassword.length < 6) {
        throw new Error('New password must be 6+ characters.');
      }
      localStorage.setItem(STORAGE_ADMIN_PWD_KEY, payload.newPassword);
    }

    const nextCreds: LocalAdminCreds = {
      username: cleanUser,
      email: cleanEmail,
      name: cleanName,
    };
    localStorage.setItem(STORAGE_ADMIN_CREDS_KEY, JSON.stringify(nextCreds));
    const token = `local-admin-${btoa(`${cleanUser}:${Date.now()}`)}`;
    setSavedAdminToken(token);
    return {
      username: cleanUser,
      email: cleanEmail,
      name: cleanName,
      role: 'owner',
    };
  }

  async changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/auth/password`, {
        method: 'PUT',
        headers: this.adminHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Unable to change password.');
      return;
    }
    const storedPwd = localStorage.getItem(STORAGE_ADMIN_PWD_KEY) || 'chai2026';
    if (currentPassword !== storedPwd) throw new Error('Current password is incorrect.');
    if (newPassword.length < 6) throw new Error('New password must be 6+ characters.');
    localStorage.setItem(STORAGE_ADMIN_PWD_KEY, newPassword);
  }

  async getAdminState(): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/state`, {
        headers: this.adminHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load admin state');
      return mergeLocalDefaults((await res.json()).store);
    }
    return readLocalStore();
  }

  async getAnalytics(period = 'weekly'): Promise<AnalyticsSummary> {
    if (this.mode === 'live-api') {
      const res = await fetch(
        `${getDefaultApiBase()}/admin/analytics?period=${encodeURIComponent(period)}`,
        { headers: this.adminHeaders() }
      );
      if (res.ok) return (await res.json()).analytics;
    }
    return computeLocalAnalytics(readLocalStore(), period);
  }

  async updateSettings(
    partial: Partial<
      Pick<StoreState, 'brand' | 'availability' | 'commerce' | 'display' | 'rewards' | 'locations'>
    >
  ): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/settings`, {
        method: 'PUT',
        headers: this.adminHeaders(),
        body: JSON.stringify(partial),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to save settings');
      return mergeLocalDefaults(d.store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      brand: partial.brand ? { ...cur.brand, ...partial.brand } : cur.brand,
      availability: partial.availability
        ? { ...cur.availability, ...partial.availability }
        : cur.availability,
      commerce: partial.commerce ? { ...cur.commerce, ...partial.commerce } : cur.commerce,
      display: partial.display ? { ...cur.display, ...partial.display } : cur.display,
      rewards: partial.rewards ? { ...cur.rewards, ...partial.rewards } : cur.rewards,
      locations: partial.locations ?? cur.locations,
    });
  }

  async createMenuItem(item: Partial<MenuItem>): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/menu`, {
        method: 'POST',
        headers: this.adminHeaders(),
        body: JSON.stringify(item),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Create failed');
      return mergeLocalDefaults(d.store);
    }
    const cur = readLocalStore();
    const maxOrder = cur.menuItems.reduce((m, i) => Math.max(m, i.sortOrder), 0);
    const created: MenuItem = {
      id: `${(item.name || 'chai').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)}-${Math.random().toString(36).slice(2, 5)}`,
      name: item.name || 'New Chai',
      hindiName: item.hindiName,
      subtitle: item.subtitle || 'Freshly Brewed Indian Beverage',
      servingStyle: item.servingStyle || 'Handmade Clay Kulhad',
      category: item.category === 'coffee' ? 'coffee' : 'tea',
      price: Math.max(0, Number(item.price ?? 70)),
      originalPrice:
        item.originalPrice && Number(item.originalPrice) > 0
          ? Number(item.originalPrice)
          : undefined,
      beansEarned: Math.max(0, Number(item.beansEarned ?? 35)),
      origin: item.origin || 'India',
      elevation: item.elevation || 'Fresh Batch',
      notes: item.notes?.length ? item.notes : ['Authentic Aroma'],
      ingredients: item.ingredients || ['Indian Tea / Coffee'],
      preparationSteps: item.preparationSteps || 'Freshly brewed to order.',
      description: item.description || '',
      image: item.image || '/images/indian-hero-chai-kaapi.jpg',
      badge: item.badge,
      caffeine: item.caffeine || 'Medium',
      supportsHot: item.supportsHot !== false,
      supportsCold: Boolean(item.supportsCold),
      defaultTemp: item.defaultTemp || 'hot',
      sizes: item.sizes || [
        { name: 'Small', volumeLabel: '120 ml', priceDelta: -10 },
        { name: 'Medium', volumeLabel: '180 ml', priceDelta: 0 },
        { name: 'Large', volumeLabel: '260 ml', priceDelta: 25 },
      ],
      isBestseller: Boolean(item.isBestseller),
      isNewArrival: Boolean(item.isNewArrival),
      ratingAvg: 4.8,
      reviewCount: 0,
      popularityScore: 80,
      available: item.available !== false,
      displayed: item.displayed !== false,
      featured: Boolean(item.featured),
      stockCount: Number(item.stockCount ?? 40),
      sortOrder: maxOrder + 1,
      profile: item.profile || { label1: 'Richness', val1: 88, label2: 'Aroma', val2: 86, label3: 'Strength', val3: 85 },
    };
    return writeLocalStore({ ...cur, menuItems: [...cur.menuItems, created] });
  }

  async updateMenuItem(id: string, patch: Partial<MenuItem>): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/menu/${id}`, {
        method: 'PUT',
        headers: this.adminHeaders(),
        body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Update failed');
      return mergeLocalDefaults(d.store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      menuItems: cur.menuItems.map((i) => (i.id === id ? { ...i, ...patch, id } : i)),
    });
  }

  async deleteMenuItem(id: string): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/menu/${id}`, {
        method: 'DELETE',
        headers: this.adminHeaders(),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Delete failed');
      return mergeLocalDefaults(d.store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      menuItems: cur.menuItems.filter((i) => i.id !== id),
    });
  }

  async reorderMenuItems(orderedIds: string[]): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/menu/reorder/list`, {
        method: 'PUT',
        headers: this.adminHeaders(),
        body: JSON.stringify({ orderedIds }),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    const mapped = cur.menuItems
      .map((item) => {
        const idx = orderedIds.indexOf(item.id);
        return idx === -1 ? item : { ...item, sortOrder: idx + 1 };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return writeLocalStore({ ...cur, menuItems: mapped });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: this.adminHeaders(),
        body: JSON.stringify({ status }),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      orders: cur.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              paymentStatus:
                status === 'delivered' && o.paymentMethod === 'cod'
                  ? 'paid'
                  : o.paymentStatus,
            }
          : o
      ),
    });
  }

  async refundOrder(orderId: string): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: this.adminHeaders(),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      orders: cur.orders.map((o) =>
        o.id === orderId
          ? { ...o, status: 'cancelled', paymentStatus: 'refunded' }
          : o
      ),
    });
  }

  async deleteOrder(orderId: string): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: this.adminHeaders(),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      orders: cur.orders.filter((o) => o.id !== orderId),
    });
  }

  async adjustIngredient(
    ingredientId: string,
    delta: number,
    reason: string,
    lowStockThreshold?: number
  ): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(
        `${getDefaultApiBase()}/admin/inventory/${ingredientId}/adjust`,
        {
          method: 'PATCH',
          headers: this.adminHeaders(),
          body: JSON.stringify({ delta, reason, lowStockThreshold }),
        }
      );
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    const ing = cur.ingredients.find((i) => i.id === ingredientId);
    const now = new Date().toISOString();
    return writeLocalStore({
      ...cur,
      ingredients: cur.ingredients.map((i) =>
        i.id === ingredientId
          ? {
              ...i,
              stockQty: Math.max(0, Number((i.stockQty + delta).toFixed(2))),
              lowStockThreshold: lowStockThreshold ?? i.lowStockThreshold,
              updatedAt: now,
            }
          : i
      ),
      inventoryLogs: [
        {
          id: `ilog-${Date.now()}`,
          ingredientId,
          ingredientName: ing?.name || ingredientId,
          changeQty: delta,
          reason,
          createdBy: 'admin@kulhadkaapi.in',
          createdAt: now,
        },
        ...cur.inventoryLogs,
      ],
    });
  }

  async createCoupon(coupon: Partial<Coupon>): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/coupons`, {
        method: 'POST',
        headers: this.adminHeaders(),
        body: JSON.stringify(coupon),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not create coupon');
      return mergeLocalDefaults(d.store);
    }
    const cur = readLocalStore();
    const created: Coupon = {
      id: `cpn-${Date.now()}`,
      code: (coupon.code || 'CHAI10').toUpperCase(),
      title: coupon.title || 'Special Offer',
      description: coupon.description || '',
      discountType: coupon.discountType === 'fixed' ? 'fixed' : 'percentage',
      discountValue: Number(coupon.discountValue || 15),
      minOrderValue: Number(coupon.minOrderValue || 100),
      maxDiscount: Number(coupon.maxDiscount || 60),
      firstOrderOnly: Boolean(coupon.firstOrderOnly),
      singleUse: Boolean(coupon.singleUse),
      isFestival: Boolean(coupon.isFestival),
      expiresAt: coupon.expiresAt || '2027-12-31',
      usageLimit: Number(coupon.usageLimit || 500),
      timesUsed: 0,
      active: true,
    };
    return writeLocalStore({ ...cur, coupons: [created, ...cur.coupons] });
  }

  async toggleCoupon(id: string, active: boolean): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/coupons/${id}`, {
        method: 'PATCH',
        headers: this.adminHeaders(),
        body: JSON.stringify({ active }),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      coupons: cur.coupons.map((c) => (c.id === id ? { ...c, active } : c)),
    });
  }

  async deleteCoupon(id: string): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: this.adminHeaders(),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      coupons: cur.coupons.filter((c) => c.id !== id),
    });
  }

  async moderateReview(
    id: string,
    patch: { status?: 'approved' | 'pending' | 'hidden'; adminReply?: string; reported?: boolean }
  ): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: this.adminHeaders(),
        body: JSON.stringify(patch),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      reviews: cur.reviews.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  }

  async deleteReview(id: string): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: this.adminHeaders(),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      reviews: cur.reviews.filter((r) => r.id !== id),
    });
  }

  async adjustMemberBeans(memberId: string, delta: number): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/members/${memberId}/beans`, {
        method: 'PATCH',
        headers: this.adminHeaders(),
        body: JSON.stringify({ delta }),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      members: cur.members.map((m) =>
        m.id === memberId ? { ...m, beansBalance: Math.max(0, m.beansBalance + delta) } : m
      ),
    });
  }

  async deleteMember(memberId: string): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/members/${memberId}`, {
        method: 'DELETE',
        headers: this.adminHeaders(),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      members: cur.members.filter((m) => m.id !== memberId),
    });
  }

  async updateSupportTicket(
    id: string,
    status: 'open' | 'in_progress' | 'resolved',
    adminNote: string
  ): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/support/${id}`, {
        method: 'PATCH',
        headers: this.adminHeaders(),
        body: JSON.stringify({ status, adminNote }),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      supportTickets: cur.supportTickets.map((t) =>
        t.id === id ? { ...t, status, adminNote } : t
      ),
    });
  }

  async markAdminNotificationsRead(): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/notifications/read`, {
        method: 'POST',
        headers: this.adminHeaders(),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({
      ...cur,
      notifications: cur.notifications.map((n) => ({ ...n, read: true })),
    });
  }

  async savePricingTiers(pricingTiers: PricingTier[]): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/pricing`, {
        method: 'PUT',
        headers: this.adminHeaders(),
        body: JSON.stringify({ pricingTiers }),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({ ...cur, pricingTiers });
  }

  async saveFaqs(faqs: FAQItem[]): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/faqs`, {
        method: 'PUT',
        headers: this.adminHeaders(),
        body: JSON.stringify({ faqs }),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({ ...cur, faqs });
  }

  async saveTestimonials(testimonials: Testimonial[]): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/testimonials`, {
        method: 'PUT',
        headers: this.adminHeaders(),
        body: JSON.stringify({ testimonials }),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    const cur = readLocalStore();
    return writeLocalStore({ ...cur, testimonials });
  }

  async importStoreJson(store: StoreState): Promise<StoreState> {
    return writeLocalStore(mergeLocalDefaults(store));
  }

  async resetToDefaults(): Promise<StoreState> {
    if (this.mode === 'live-api') {
      const res = await fetch(`${getDefaultApiBase()}/admin/reset`, {
        method: 'POST',
        headers: this.adminHeaders(),
      });
      return mergeLocalDefaults((await res.json()).store);
    }
    return writeLocalStore(cloneDefault());
  }
}

export const apiClient = new KulhadApiClient();
