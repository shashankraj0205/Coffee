export type MenuCategory = 'all' | 'tea' | 'coffee';
export type StorefrontOption = 'A' | 'B';
export type AvailabilityMode = 'open' | 'closed' | 'busy' | 'auto';
export type LogoPreset = 'kulhad' | 'davara' | 'kettle' | 'emblem';
export type LanguageCode = 'en' | 'hi';
export type ThemeMode = 'light' | 'dark';

export type BeverageSizeName = 'Small' | 'Medium' | 'Large';
export type BeverageTemp = 'hot' | 'cold';
export type OrderType = 'pickup' | 'delivery' | 'dine_in';

export type OrderStatus =
  | 'order_placed'
  | 'order_accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod =
  | 'razorpay_upi'
  | 'razorpay_card'
  | 'razorpay_netbanking'
  | 'razorpay_wallet'
  | 'cod';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface ProductSizeOption {
  name: BeverageSizeName;
  volumeLabel: string;
  priceDelta: number; // Added to base price in ₹
}

export interface MenuItem {
  id: string;
  name: string;
  hindiName?: string;
  subtitle: string;
  servingStyle?: string;
  category: 'tea' | 'coffee';
  price: number; // Selling price in ₹ INR (Medium)
  originalPrice?: number; // Optional MRP / strikethrough price in ₹ INR
  beansEarned: number;
  origin: string;
  elevation: string;
  notes: string[];
  ingredients?: string[];
  preparationSteps?: string;
  description: string;
  image: string;
  badge?: string;
  caffeine: 'Low' | 'Medium' | 'High';
  supportsHot?: boolean;
  supportsCold?: boolean;
  defaultTemp?: BeverageTemp;
  sizes?: ProductSizeOption[];
  recipe?: Record<string, number>; // ingredientId -> units per cup
  isBestseller?: boolean;
  isNewArrival?: boolean;
  ratingAvg?: number;
  reviewCount?: number;
  popularityScore?: number;
  available: boolean;
  displayed: boolean;
  featured: boolean;
  stockCount: number;
  sortOrder: number;
  profile: {
    label1: string;
    val1: number;
    label2: string;
    val2: number;
    label3: string;
    val3: number;
  };
}

export interface DaySchedule {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

export interface BrandSettings {
  name: string;
  tagline: string;
  footerSublabel: string;
  logoType: 'preset' | 'image';
  logoPreset: LogoPreset;
  logoUrl: string;
  accentColor: string;
  secondaryAccent: string;
  heroBadge: string;
  heroHeadline: string;
  heroHighlightWord: string;
  heroSubhead: string;
  heroImage: string;
  announcementEnabled: boolean;
  announcementText: string;
  supportEmail: string;
  whatsappPhone?: string;
}

export interface AvailabilitySettings {
  mode: AvailabilityMode;
  acceptingOrders: boolean;
  pickupEnabled?: boolean;
  deliveryEnabled?: boolean;
  tableQrEnabled?: boolean;
  prepTimeMinutes: number;
  openingTime: string;
  closingTime: string;
  memberEarlyPickupTime: string;
  timezoneLabel: string;
  closedNotice: string;
  busyNotice: string;
  weeklySchedule: DaySchedule[];
}

export interface CommerceSettings {
  taxRatePercent: number; // e.g. 5 for 5% GST
  deliveryCharge: number; // e.g. ₹35
  freeDeliveryAbove: number; // e.g. ₹299
  codEnabled: boolean;
  razorpayEnabled: boolean;
  razorpayMode: 'sandbox' | 'live';
  razorpayKeyIdConfigured?: boolean;
  loyaltyPointsPer100: number; // e.g. 20 points per ₹100
  pointRedemptionValueInr: number; // e.g. 0.5 (100 points = ₹50)
  maxRedeemPercentOfSubtotal: number; // e.g. 30%
  minPointsToRedeem: number; // e.g. 50
  birthdayBonusPoints: number;
  autoDeductInventoryOn: 'order_accepted' | 'order_placed' | 'delivered';
}

export interface DisplaySettings {
  activeVariant: StorefrontOption;
  allowCustomerVariantSwitch: boolean;
  showSoldOutItems: boolean;
  showRewardsCalculator: boolean;
  showTestimonials: boolean;
  showPricing: boolean;
  showFaq: boolean;
  maxDisplayItems: number;
}

export interface RewardsSettings {
  beansPerDollar: number;
  beansForFreeDrink: number;
  welcomeBonusBeans: number;
  referralBonusBeans: number;
  ritualPassReferralCash: number;
  reserveReferralCash: number;
}

export interface CafeLocation {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  phone?: string;
  hours: string;
  mapUrl?: string;
  isOpen: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatarInitials: string;
  avatarBg: string;
  quote: string;
  favoriteDrink: string;
  earnedStat: string;
  rating: number;
  visible: boolean;
}

export interface PricingTier {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  badge?: string;
  featured?: boolean;
  visible: boolean;
  cta: string;
  beanMultiplier: string;
  referralBonus: string;
  features: string[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  visible: boolean;
}

export interface CartCustomization {
  size: BeverageSizeName;
  temperature: BeverageTemp;
  sugarPreference: string;
  milkStrength: string;
  specialInstructions: string;
}

export interface CartItemLine extends CartCustomization {
  lineKey: string;
  itemId: string;
  quantity: number;
}

export interface DeliveryAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  landmark?: string;
  city: string;
  pincode: string;
  isDefault?: boolean;
}

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'staff' | 'owner';
  emailVerified: boolean;
  verificationCodePreview?: string;
  birthday: string;
  loyaltyPoints: number;
  membershipLevel: string;
  referralCode: string;
  referralsCount: number;
  preferredDrink: string;
  favourites: string[];
  addresses: DeliveryAddress[];
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number;
  firstOrderOnly: boolean;
  singleUse: boolean;
  isFestival: boolean;
  expiresAt?: string;
  usageLimit: number;
  timesUsed: number;
  active: boolean;
}

export interface OrderItemSummary {
  itemId: string;
  name: string;
  category: 'tea' | 'coffee';
  size: BeverageSizeName;
  temperature: BeverageTemp;
  sugarPreference: string;
  milkStrength: string;
  specialInstructions?: string;
  price: number;
  quantity: number;
  beansEarned: number;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  gateway: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  status: 'created' | 'captured' | 'failed' | 'refunded';
  refundId?: string;
  refundAmount?: number;
  mode: 'sandbox' | 'live';
  createdAt: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  orderType: OrderType;
  tableNumber?: string;
  scheduledFor?: string;
  deliveryAddress?: DeliveryAddress | null;
  pickupNote: string;
  items: OrderItemSummary[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  loyaltyRedeemedPoints: number;
  loyaltyDiscount: number;
  taxAmount: number;
  deliveryFee: number;
  totalPayable: number;
  totalBeans: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  payment?: PaymentRecord | null;
  createdAt: string;
  updatedAt?: string;
}

export interface IngredientItem {
  id: string;
  name: string;
  unit: string;
  stockQty: number;
  lowStockThreshold: number;
  costPerUnit: number;
  updatedAt: string;
}

export interface InventoryLog {
  id: string;
  ingredientId: string;
  ingredientName?: string;
  changeQty: number;
  reason: string;
  orderId?: string;
  createdBy: string;
  createdAt: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  productName?: string;
  userId?: string;
  userName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  status: 'approved' | 'pending' | 'hidden';
  adminReply?: string;
  reported?: boolean;
  reportReason?: string;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  orderId?: string;
  pointsDelta: number;
  type: 'earn' | 'redeem' | 'referral' | 'birthday' | 'welcome' | 'admin_adjust';
  description: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  recipientScope: 'admin' | 'customer';
  userId?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  adminNote?: string;
  createdAt: string;
}

export interface RitualMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan: string;
  preferredDrink: string;
  beansBalance: number;
  referralCode: string;
  referralsCount: number;
  emailVerified?: boolean;
  active?: boolean;
  ordersCount?: number;
  joinedAt: string;
}

export interface CartQuoteResult {
  subtotal: number;
  discountAmount: number;
  couponApplied?: Coupon | null;
  couponError?: string;
  loyaltyRedeemedPoints: number;
  loyaltyDiscount: number;
  taxRatePercent: number;
  taxAmount: number;
  deliveryFee: number;
  totalPayable: number;
  totalBeans: number;
}

export interface AnalyticsSummary {
  totalSales: number;
  todayRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  activeCustomers: number;
  avgOrderValue: number;
  retentionRatePercent: number;
  teaSalesRevenue: number;
  coffeeSalesRevenue: number;
  teaCupsSold: number;
  coffeeCupsSold: number;
  bestSelling: { id: string; name: string; category: string; cups: number; revenue: number }[];
  leastSelling: { id: string; name: string; category: string; cups: number; revenue: number }[];
  revenueSeries: { label: string; revenue: number; orders: number }[];
  peakHours: { hour: string; orders: number }[];
  paymentBreakdown: { method: string; count: number; amount: number }[];
  couponStats: { code: string; uses: number; discountTotal: number }[];
}

export interface StoreState {
  brand: BrandSettings;
  availability: AvailabilitySettings;
  commerce: CommerceSettings;
  display: DisplaySettings;
  rewards: RewardsSettings;
  locations: CafeLocation[];
  menuItems: MenuItem[];
  coupons: Coupon[];
  ingredients: IngredientItem[];
  inventoryLogs: InventoryLog[];
  reviews: ProductReview[];
  testimonials: Testimonial[];
  pricingTiers: PricingTier[];
  faqs: FAQItem[];
  orders: CustomerOrder[];
  members: RitualMember[];
  notifications: AppNotification[];
  supportTickets: SupportTicket[];
  updatedAt: string;
}

export interface AdminUser {
  id?: string;
  username?: string;
  email: string;
  name: string;
  role: 'owner' | 'staff';
}

export type BackendConnectionMode = 'live-api' | 'local-db';

export interface PublicOrderTrack {
  id: string;
  orderNumber: string;
  customerName: string;
  orderType: OrderType;
  tableNumber?: string;
  scheduledFor?: string;
  items: OrderItemSummary[];
  subtotal: number;
  discountAmount: number;
  loyaltyDiscount: number;
  taxAmount: number;
  deliveryFee: number;
  totalPayable: number;
  totalBeans: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  pickupNote: string;
  status: OrderStatus;
  createdAt: string;
}
