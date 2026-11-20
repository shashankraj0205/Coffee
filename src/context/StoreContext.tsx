import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  StoreState,
  MenuItem,
  PricingTier,
  FAQItem,
  Testimonial,
  OrderStatus,
  OrderType,
  PaymentMethod,
  AdminUser,
  CustomerUser,
  DeliveryAddress,
  CartItemLine,
  CartQuoteResult,
  Coupon,
  ProductReview,
  LoyaltyTransaction,
  AppNotification,
  AnalyticsSummary,
  BackendConnectionMode,
  CustomerOrder,
  RitualMember,
  PublicOrderTrack,
  LanguageCode,
  ThemeMode,
} from '../types/store';
import { DEFAULT_STORE_STATE } from '../data/defaultStore';
import {
  apiClient,
  getConfiguredApiBase,
  setConfiguredApiBase,
} from '../services/api';
import { computeShopStatus, ComputedShopStatus } from '../utils/schedule';

interface StoreContextValue {
  store: StoreState;
  publicMemberCount: number;
  loading: boolean;
  backendMode: BackendConnectionMode;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  tableNumberFromQr: string;
  setTableNumberFromQr: (table: string) => void;
  recentlyViewedIds: string[];
  recordRecentlyViewed: (productId: string) => void;
  shopStatus: ComputedShopStatus;
  adminUser: AdminUser | null;
  customerUser: CustomerUser | null;
  customerOrders: CustomerOrder[];
  customerLoyaltyHistory: LoyaltyTransaction[];
  customerNotifications: AppNotification[];
  activeTrackedOrder: PublicOrderTrack | null;
  setActiveTrackedOrderNumber: (orderNumber: string | null) => void;
  // Customer Auth & Account
  registerCustomer: (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    preferredDrink?: string;
    referralCode?: string;
    birthday?: string;
  }) => Promise<CustomerUser>;
  loginCustomer: (email: string, password: string) => Promise<CustomerUser>;
  logoutCustomer: () => void;
  refreshCustomerHub: () => Promise<CartItemLine[]>;
  verifyCustomerEmail: (code: string) => Promise<void>;
  updateCustomerProfile: (patch: Partial<CustomerUser>) => Promise<void>;
  toggleFavourite: (productId: string) => Promise<void>;
  addCustomerAddress: (addr: Omit<DeliveryAddress, 'id'>) => Promise<void>;
  deleteCustomerAddress: (id: string) => Promise<void>;
  // Cart, Ordering & Payments
  getCartQuote: (payload: {
    items: CartItemLine[];
    orderType: OrderType;
    couponCode?: string;
    redeemPoints?: number;
    customerEmail?: string;
  }) => Promise<CartQuoteResult>;
  placeOrder: (payload: {
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
  }) => Promise<{
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
  }>;
  verifyPayment: (payload: {
    orderId: string;
    gatewayOrderId?: string;
    simulateSuccess?: boolean;
    simulateFailure?: boolean;
  }) => Promise<CustomerOrder>;
  // Reviews & Support
  submitReview: (payload: {
    productId: string;
    rating: number;
    comment: string;
  }) => Promise<ProductReview>;
  reportReview: (reviewId: string, reason: string) => Promise<void>;
  submitSupportTicket: (payload: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }) => Promise<void>;
  // Quick Ritual Member Join
  registerMember: (payload: {
    name: string;
    email: string;
    plan: string;
    preferredDrink: string;
  }) => Promise<RitualMember>;
  // Admin Auth & Management
  loginAdmin: (identifier: string, password: string) => Promise<void>;
  logoutAdmin: () => void;
  updateAdminCredentials: (payload: {
    currentPassword: string;
    username: string;
    email: string;
    name: string;
    newPassword?: string;
  }) => Promise<AdminUser>;
  changeAdminPassword: (currentPwd: string, newPwd: string) => Promise<void>;
  refreshStore: () => Promise<void>;
  reconnectBackend: (customApiUrl?: string) => Promise<BackendConnectionMode>;
  getAnalytics: (period?: string) => Promise<AnalyticsSummary>;
  updateSettings: (
    partial: Partial<
      Pick<
        StoreState,
        'brand' | 'availability' | 'commerce' | 'display' | 'rewards' | 'locations'
      >
    >
  ) => Promise<void>;
  createMenuItem: (item: Partial<MenuItem>) => Promise<void>;
  updateMenuItem: (id: string, patch: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  reorderMenuItems: (orderedIds: string[]) => Promise<void>;
  savePricingTiers: (tiers: PricingTier[]) => Promise<void>;
  saveFaqs: (faqs: FAQItem[]) => Promise<void>;
  saveTestimonials: (testimonials: Testimonial[]) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  refundOrder: (orderId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  adjustIngredient: (
    ingredientId: string,
    delta: number,
    reason: string,
    lowStockThreshold?: number
  ) => Promise<void>;
  createCoupon: (coupon: Partial<Coupon>) => Promise<void>;
  toggleCoupon: (id: string, active: boolean) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  moderateReview: (
    id: string,
    patch: { status?: 'approved' | 'pending' | 'hidden'; adminReply?: string; reported?: boolean }
  ) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  adjustMemberBeans: (memberId: string, delta: number) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  updateSupportTicket: (
    id: string,
    status: 'open' | 'in_progress' | 'resolved',
    adminNote: string
  ) => Promise<void>;
  markAdminNotificationsRead: () => Promise<void>;
  importStoreJson: (nextStore: StoreState) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);
const ACTIVE_ORDER_KEY = 'kulhad_last_order_number_v2';
const RECENT_VIEWED_KEY = 'kulhad_recent_viewed_v1';
const LANG_KEY = 'kulhad_lang_v1';
const THEME_KEY = 'kulhad_theme_v1';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [store, setStore] = useState<StoreState>(DEFAULT_STORE_STATE);
  const [publicMemberCount, setPublicMemberCount] = useState<number>(
    DEFAULT_STORE_STATE.members.length
  );
  const [loading, setLoading] = useState(true);
  const [backendMode, setBackendMode] = useState<BackendConnectionMode>('local-db');
  const [language, setLanguageState] = useState<LanguageCode>(
    () => (localStorage.getItem(LANG_KEY) as LanguageCode) || 'en'
  );
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [tableNumberFromQr, setTableNumberFromQr] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('table') || '';
  });
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_VIEWED_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [customerLoyaltyHistory, setCustomerLoyaltyHistory] = useState<
    LoyaltyTransaction[]
  >([]);
  const [customerNotifications, setCustomerNotifications] = useState<
    AppNotification[]
  >([]);

  const [clockTick, setClockTick] = useState(() => Date.now());
  const [trackedOrderNumber, setTrackedOrderNumber] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_ORDER_KEY)
  );
  const [activeTrackedOrder, setActiveTrackedOrder] =
    useState<PublicOrderTrack | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setClockTick(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem(LANG_KEY, lang);
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
  }, []);

  const recordRecentlyViewed = useCallback((productId: string) => {
    setRecentlyViewedIds((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, 6);
      localStorage.setItem(RECENT_VIEWED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const refreshStore = useCallback(async () => {
    const result = await apiClient.getStorefront();
    setStore(result.store);
    setBackendMode(result.mode);
    setPublicMemberCount(result.memberCount);
  }, []);

  const refreshCustomerHub = useCallback(async (): Promise<CartItemLine[]> => {
    const hub = await apiClient.getCustomerHub();
    if (!hub) {
      setCustomerUser(null);
      setCustomerOrders([]);
      setCustomerLoyaltyHistory([]);
      setCustomerNotifications([]);
      return [];
    }
    setCustomerUser(hub.user);
    setCustomerOrders(hub.orders);
    setCustomerLoyaltyHistory(hub.loyaltyHistory);
    setCustomerNotifications(hub.notifications);
    return hub.cartItems || [];
  }, []);

  // Boot: Load Storefront + Verify Admin + Verify Customer
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await apiClient.getStorefront();
        if (!mounted) return;
        setStore(result.store);
        setBackendMode(result.mode);
        setPublicMemberCount(result.memberCount);

        const [verifiedAdmin] = await Promise.all([
          apiClient.verifyAdminSession(),
          refreshCustomerHub(),
        ]);

        if (mounted && verifiedAdmin) {
          setAdminUser(verifiedAdmin);
          if (result.mode === 'live-api') {
            const fullAdminStore = await apiClient.getAdminState();
            if (mounted) {
              setStore(fullAdminStore);
              setPublicMemberCount(fullAdminStore.members.length);
            }
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('kulhad_kaapi_sync');
      channel.onmessage = () => {
        refreshStore().catch(() => {});
      };
    } catch {
      // ignore
    }

    return () => {
      mounted = false;
      channel?.close();
    };
  }, [refreshStore, refreshCustomerHub]);

  // Live Real-Time SSE Subscription when connected to Live Express Backend
  useEffect(() => {
    if (backendMode !== 'live-api') return;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${getConfiguredApiBase()}/events`);
      const handleRefresh = () => {
        refreshStore().catch(() => {});
        refreshCustomerHub().catch(() => {});
      };
      es.addEventListener('order_updated', handleRefresh);
      es.addEventListener('order_created', handleRefresh);
      es.addEventListener('notification', handleRefresh);
      es.addEventListener('settings_updated', handleRefresh);
    } catch {
      // ignore if SSE blocked
    }
    return () => es?.close();
  }, [backendMode, refreshStore, refreshCustomerHub]);

  // Live Order Tracking
  useEffect(() => {
    if (!trackedOrderNumber) {
      setActiveTrackedOrder(null);
      return;
    }
    const inMemory = store.orders.find(
      (o) => o.orderNumber.toUpperCase() === trackedOrderNumber.toUpperCase()
    );
    if (inMemory) {
      setActiveTrackedOrder({
        id: inMemory.id,
        orderNumber: inMemory.orderNumber,
        customerName: inMemory.customerName,
        orderType: inMemory.orderType,
        tableNumber: inMemory.tableNumber,
        scheduledFor: inMemory.scheduledFor,
        items: inMemory.items,
        subtotal: inMemory.subtotal,
        discountAmount: inMemory.discountAmount,
        loyaltyDiscount: inMemory.loyaltyDiscount,
        taxAmount: inMemory.taxAmount,
        deliveryFee: inMemory.deliveryFee,
        totalPayable: inMemory.totalPayable,
        totalBeans: inMemory.totalBeans,
        paymentMethod: inMemory.paymentMethod,
        paymentStatus: inMemory.paymentStatus,
        pickupNote: inMemory.pickupNote,
        status: inMemory.status,
        createdAt: inMemory.createdAt,
      });
    }

    let cancelled = false;
    const poll = async () => {
      const tracked = await apiClient.trackOrder(trackedOrderNumber);
      if (!cancelled && tracked) setActiveTrackedOrder(tracked);
    };
    poll();
    const timer = backendMode === 'live-api' ? window.setInterval(poll, 7000) : null;
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [trackedOrderNumber, store.orders, backendMode]);

  const setActiveTrackedOrderNumber = useCallback((orderNumber: string | null) => {
    setTrackedOrderNumber(orderNumber);
    if (orderNumber) localStorage.setItem(ACTIVE_ORDER_KEY, orderNumber);
    else {
      localStorage.removeItem(ACTIVE_ORDER_KEY);
      setActiveTrackedOrder(null);
    }
  }, []);

  // Sync Document Title, CSS Theme Variables, and Dark Mode Class
  useEffect(() => {
    document.title = `${store.brand.name} — ${store.brand.tagline} | Indian Chai & Coffee Café`;
    const root = document.documentElement;
    root.style.setProperty('--brand-accent', store.brand.accentColor || '#E68A24');
    root.style.setProperty(
      '--brand-secondary',
      store.brand.secondaryAccent || '#294B35'
    );
    root.style.scrollPaddingTop = store.brand.announcementEnabled ? '7.5rem' : '5.5rem';
    root.classList.toggle('dark-cafe', theme === 'dark');
  }, [
    store.brand.name,
    store.brand.tagline,
    store.brand.accentColor,
    store.brand.secondaryAccent,
    store.brand.announcementEnabled,
    theme,
  ]);

  const shopStatus = useMemo(
    () => computeShopStatus(store.availability, new Date(clockTick)),
    [store.availability, clockTick]
  );

  // ---------- Customer Actions ----------
  const registerCustomer = useCallback(
    async (payload: {
      name: string;
      email: string;
      phone: string;
      password: string;
      preferredDrink?: string;
      referralCode?: string;
      birthday?: string;
    }) => {
      const { user } = await apiClient.registerCustomer(payload);
      setCustomerUser(user);
      await refreshStore();
      await refreshCustomerHub();
      return user;
    },
    [refreshStore, refreshCustomerHub]
  );

  const loginCustomer = useCallback(
    async (email: string, password: string) => {
      const { user } = await apiClient.loginCustomer(email, password);
      setCustomerUser(user);
      await refreshCustomerHub();
      return user;
    },
    [refreshCustomerHub]
  );

  const logoutCustomer = useCallback(() => {
    apiClient.logoutCustomer();
    setCustomerUser(null);
    setCustomerOrders([]);
    setCustomerLoyaltyHistory([]);
    setCustomerNotifications([]);
  }, []);

  const verifyCustomerEmail = useCallback(async (code: string) => {
    const user = await apiClient.verifyCustomerEmail(code);
    setCustomerUser(user);
  }, []);

  const updateCustomerProfile = useCallback(async (patch: Partial<CustomerUser>) => {
    const user = await apiClient.updateCustomerProfile(patch);
    setCustomerUser(user);
  }, []);

  const toggleFavourite = useCallback(async (productId: string) => {
    const favs = await apiClient.toggleFavourite(productId);
    setCustomerUser((prev) => (prev ? { ...prev, favourites: favs } : prev));
  }, []);

  const addCustomerAddress = useCallback(async (addr: Omit<DeliveryAddress, 'id'>) => {
    const user = await apiClient.addCustomerAddress(addr);
    setCustomerUser(user);
  }, []);

  const deleteCustomerAddress = useCallback(async (id: string) => {
    const user = await apiClient.deleteCustomerAddress(id);
    setCustomerUser(user);
  }, []);

  // ---------- Cart, Ordering & Payments ----------
  const getCartQuote = useCallback(
    async (payload: {
      items: CartItemLine[];
      orderType: OrderType;
      couponCode?: string;
      redeemPoints?: number;
      customerEmail?: string;
    }) => {
      return apiClient.getCartQuote({
        ...payload,
        availablePoints: customerUser?.loyaltyPoints || 0,
      });
    },
    [customerUser?.loyaltyPoints]
  );

  const placeOrder = useCallback(
    async (payload: {
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
    }) => {
      const result = await apiClient.placeOrder({
        ...payload,
        availablePoints: customerUser?.loyaltyPoints || 0,
      });
      if (result.fullStore) {
        setStore(result.fullStore);
      } else {
        setStore((prev) => ({
          ...prev,
          menuItems: result.menuItems,
          orders: [result.order, ...prev.orders.filter((o) => o.id !== result.order.id)],
        }));
      }
      setActiveTrackedOrderNumber(result.order.orderNumber);
      refreshCustomerHub().catch(() => {});
      return { order: result.order, paymentSession: result.paymentSession };
    },
    [customerUser?.loyaltyPoints, setActiveTrackedOrderNumber, refreshCustomerHub]
  );

  const verifyPayment = useCallback(
    async (payload: {
      orderId: string;
      gatewayOrderId?: string;
      simulateSuccess?: boolean;
      simulateFailure?: boolean;
    }) => {
      const res = await apiClient.verifyPayment(payload);
      await refreshStore();
      refreshCustomerHub().catch(() => {});
      return res.order;
    },
    [refreshStore, refreshCustomerHub]
  );

  // ---------- Reviews & Support ----------
  const submitReview = useCallback(
    async (payload: { productId: string; rating: number; comment: string }) => {
      const rev = await apiClient.submitReview(payload);
      await refreshStore();
      return rev;
    },
    [refreshStore]
  );

  const reportReview = useCallback(
    async (reviewId: string, reason: string) => {
      await apiClient.reportReview(reviewId, reason);
      await refreshStore();
    },
    [refreshStore]
  );

  const submitSupportTicket = useCallback(
    async (payload: {
      name: string;
      email: string;
      phone?: string;
      subject: string;
      message: string;
    }) => {
      await apiClient.submitSupportTicket(payload);
      await refreshStore();
    },
    [refreshStore]
  );

  const registerMember = useCallback(
    async (payload: {
      name: string;
      email: string;
      plan: string;
      preferredDrink: string;
    }) => {
      const { member, store: nextStore } = await apiClient.registerMember(payload);
      setStore(nextStore);
      setPublicMemberCount((c) => Math.max(c, nextStore.members.length));
      return member;
    },
    []
  );

  // ---------- Admin Actions ----------
  const loginAdmin = useCallback(async (email: string, password: string) => {
    const { user } = await apiClient.loginAdmin(email, password);
    setAdminUser(user);
    const full = await apiClient.getAdminState();
    setStore(full);
    setPublicMemberCount(full.members.length);
  }, []);

  const logoutAdmin = useCallback(() => {
    apiClient.logoutAdmin();
    setAdminUser(null);
  }, []);

  const updateAdminCredentials = useCallback(
    async (payload: {
      currentPassword: string;
      username: string;
      email: string;
      name: string;
      newPassword?: string;
    }) => {
      const updatedUser = await apiClient.updateAdminCredentials(payload);
      setAdminUser(updatedUser);
      return updatedUser;
    },
    []
  );

  const changeAdminPassword = useCallback(
    async (currentPwd: string, newPwd: string) => {
      await apiClient.changeAdminPassword(currentPwd, newPwd);
    },
    []
  );

  const reconnectBackend = useCallback(async (customApiUrl?: string) => {
    if (customApiUrl !== undefined) setConfiguredApiBase(customApiUrl);
    const mode = await apiClient.detectBackend();
    setBackendMode(mode);
    const result = await apiClient.getStorefront();
    setStore(result.store);
    setPublicMemberCount(result.memberCount);
    return mode;
  }, []);

  const getAnalytics = useCallback(
    async (period = 'weekly') => apiClient.getAnalytics(period),
    []
  );

  const updateSettings = useCallback(
    async (
      partial: Partial<
        Pick<
          StoreState,
          'brand' | 'availability' | 'commerce' | 'display' | 'rewards' | 'locations'
        >
      >
    ) => {
      const updated = await apiClient.updateSettings(partial);
      setStore(updated);
    },
    []
  );

  const createMenuItem = useCallback(async (item: Partial<MenuItem>) => {
    setStore(await apiClient.createMenuItem(item));
  }, []);

  const updateMenuItem = useCallback(
    async (id: string, patch: Partial<MenuItem>) => {
      setStore(await apiClient.updateMenuItem(id, patch));
    },
    []
  );

  const deleteMenuItem = useCallback(async (id: string) => {
    setStore(await apiClient.deleteMenuItem(id));
  }, []);

  const reorderMenuItems = useCallback(async (orderedIds: string[]) => {
    setStore(await apiClient.reorderMenuItems(orderedIds));
  }, []);

  const savePricingTiers = useCallback(async (tiers: PricingTier[]) => {
    setStore(await apiClient.savePricingTiers(tiers));
  }, []);

  const saveFaqs = useCallback(async (faqs: FAQItem[]) => {
    setStore(await apiClient.saveFaqs(faqs));
  }, []);

  const saveTestimonials = useCallback(async (testimonials: Testimonial[]) => {
    setStore(await apiClient.saveTestimonials(testimonials));
  }, []);

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      setStore(await apiClient.updateOrderStatus(orderId, status));
    },
    []
  );

  const refundOrder = useCallback(async (orderId: string) => {
    setStore(await apiClient.refundOrder(orderId));
  }, []);

  const deleteOrder = useCallback(async (orderId: string) => {
    setStore(await apiClient.deleteOrder(orderId));
  }, []);

  const adjustIngredient = useCallback(
    async (
      ingredientId: string,
      delta: number,
      reason: string,
      lowStockThreshold?: number
    ) => {
      setStore(
        await apiClient.adjustIngredient(
          ingredientId,
          delta,
          reason,
          lowStockThreshold
        )
      );
    },
    []
  );

  const createCoupon = useCallback(async (coupon: Partial<Coupon>) => {
    setStore(await apiClient.createCoupon(coupon));
  }, []);

  const toggleCoupon = useCallback(async (id: string, active: boolean) => {
    setStore(await apiClient.toggleCoupon(id, active));
  }, []);

  const deleteCoupon = useCallback(async (id: string) => {
    setStore(await apiClient.deleteCoupon(id));
  }, []);

  const moderateReview = useCallback(
    async (
      id: string,
      patch: { status?: 'approved' | 'pending' | 'hidden'; adminReply?: string; reported?: boolean }
    ) => {
      setStore(await apiClient.moderateReview(id, patch));
    },
    []
  );

  const deleteReview = useCallback(async (id: string) => {
    setStore(await apiClient.deleteReview(id));
  }, []);

  const adjustMemberBeans = useCallback(async (memberId: string, delta: number) => {
    setStore(await apiClient.adjustMemberBeans(memberId, delta));
  }, []);

  const deleteMember = useCallback(async (memberId: string) => {
    const updated = await apiClient.deleteMember(memberId);
    setStore(updated);
    setPublicMemberCount(updated.members.length);
  }, []);

  const updateSupportTicket = useCallback(
    async (
      id: string,
      status: 'open' | 'in_progress' | 'resolved',
      adminNote: string
    ) => {
      setStore(await apiClient.updateSupportTicket(id, status, adminNote));
    },
    []
  );

  const markAdminNotificationsRead = useCallback(async () => {
    setStore(await apiClient.markAdminNotificationsRead());
  }, []);

  const importStoreJson = useCallback(async (nextStore: StoreState) => {
    const updated = await apiClient.importStoreJson(nextStore);
    setStore(updated);
    setPublicMemberCount(updated.members.length);
  }, []);

  const resetToDefaults = useCallback(async () => {
    const updated = await apiClient.resetToDefaults();
    setStore(updated);
    setPublicMemberCount(updated.members.length);
  }, []);

  const value: StoreContextValue = {
    store,
    publicMemberCount,
    loading,
    backendMode,
    language,
    setLanguage,
    theme,
    setTheme,
    tableNumberFromQr,
    setTableNumberFromQr,
    recentlyViewedIds,
    recordRecentlyViewed,
    shopStatus,
    adminUser,
    customerUser,
    customerOrders,
    customerLoyaltyHistory,
    customerNotifications,
    activeTrackedOrder,
    setActiveTrackedOrderNumber,
    registerCustomer,
    loginCustomer,
    logoutCustomer,
    refreshCustomerHub,
    verifyCustomerEmail,
    updateCustomerProfile,
    toggleFavourite,
    addCustomerAddress,
    deleteCustomerAddress,
    getCartQuote,
    placeOrder,
    verifyPayment,
    submitReview,
    reportReview,
    submitSupportTicket,
    registerMember,
    loginAdmin,
    logoutAdmin,
    updateAdminCredentials,
    changeAdminPassword,
    refreshStore,
    reconnectBackend,
    getAnalytics,
    updateSettings,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    reorderMenuItems,
    savePricingTiers,
    saveFaqs,
    saveTestimonials,
    updateOrderStatus,
    refundOrder,
    deleteOrder,
    adjustIngredient,
    createCoupon,
    toggleCoupon,
    deleteCoupon,
    moderateReview,
    deleteReview,
    adjustMemberBeans,
    deleteMember,
    updateSupportTicket,
    markAdminNotificationsRead,
    importStoreJson,
    resetToDefaults,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
