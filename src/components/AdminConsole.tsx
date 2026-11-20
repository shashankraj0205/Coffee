import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  LayoutDashboard,
  Clock,
  Palette,
  Coffee,
  Monitor,
  ShoppingBag,
  Sparkles,
  Server,
  LogOut,
  Lock,
  Plus,
  Trash2,
  Upload,
  Check,
  RefreshCw,
  Download,
  RotateCcw,
  CheckCircle2,
  MapPin,
  Users,
  MessageSquareQuote,
  BarChart3,
  Package,
  Tag,
  Bell,
} from 'lucide-react';
import {
  AvailabilityMode,
  LogoPreset,
  MenuItem,
  PricingTier,
  FAQItem,
  Testimonial,
  StoreState,
} from '../types/store';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from './BrandLogo';
import { AdminMenuModal } from './AdminMenuModal';
import { AdminProductStudioPanel } from './AdminProductStudioPanel';
import { AdminAnalyticsPanel } from './AdminAnalyticsPanel';
import {
  AdminOrdersAndKdsPanel,
  AdminInventoryPanel,
  AdminCouponsAndCommercePanel,
  AdminReviewsSupportPanel,
} from './AdminOperationsPanels';
import {
  GALLERY_IMAGES,
  formatTime12h,
  getTodayShortName,
} from '../utils/schedule';
import { getConfiguredApiBase, getSavedLocalAdminInfo } from '../services/api';
import { compressImageFile } from '../utils/image';
import { useModalEffects } from '../utils/useModalEffects';
import { SOLEN_EASE } from './MotionPrimitives';

export type AdminTab =
  | 'menu'
  | 'overview'
  | 'analytics'
  | 'orders'
  | 'inventory'
  | 'coupons'
  | 'reviews'
  | 'availability'
  | 'brand'
  | 'display'
  | 'rewards'
  | 'system';

interface AdminConsoleProps {
  open: boolean;
  onClose: () => void;
  initialTab?: AdminTab;
  initialEditProduct?: MenuItem | null;
  onClearInitialEditProduct?: () => void;
}

const TABS: {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'menu', label: 'Products & Prices', icon: Coffee },
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics & CSV', icon: BarChart3 },
  { id: 'orders', label: 'KDS, Orders & CRM', icon: ShoppingBag },
  { id: 'inventory', label: 'Ingredients Stock', icon: Package },
  { id: 'coupons', label: 'Coupons & GST', icon: Tag },
  { id: 'reviews', label: 'Reviews & Alerts', icon: Bell },
  { id: 'availability', label: 'Timings & Branches', icon: Clock },
  { id: 'brand', label: 'Brand & Logo', icon: Palette },
  { id: 'display', label: 'Storefront Layout', icon: Monitor },
  { id: 'rewards', label: 'Plans & CMS', icon: Sparkles },
  { id: 'system', label: 'Backend & Security', icon: Server },
];

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  open,
  onClose,
  initialTab,
  initialEditProduct,
  onClearInitialEditProduct,
}) => {
  const {
    store,
    backendMode,
    shopStatus,
    adminUser,
    loginAdmin,
    logoutAdmin,
    updateAdminCredentials,
    reconnectBackend,
    updateSettings,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    savePricingTiers,
    saveFaqs,
    saveTestimonials,
    adjustMemberBeans,
    deleteMember,
    importStoreJson,
    resetToDefaults,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || 'menu');

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (open && adminUser && initialEditProduct) {
      setActiveTab('menu');
      setEditingItem(initialEditProduct);
      setMenuModalOpen(true);
      onClearInitialEditProduct?.();
    }
  }, [open, adminUser, initialEditProduct, onClearInitialEditProduct]);
  const [loginEmail, setLoginEmail] = useState(
    () => getSavedLocalAdminInfo().username || 'admin'
  );
  // Demo credentials are only prefilled/shown in dev builds, never on a public deploy.
  const [loginPassword, setLoginPassword] = useState(import.meta.env.DEV ? 'chai2026' : '');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Local draft states
  const [brandDraft, setBrandDraft] = useState(store.brand);
  const [availDraft, setAvailDraft] = useState(store.availability);
  const [displayDraft, setDisplayDraft] = useState(store.display);
  const [rewardsDraft, setRewardsDraft] = useState(store.rewards);
  const [locationsDraft, setLocationsDraft] = useState(store.locations);
  const [pricingDraft, setPricingDraft] = useState<PricingTier[]>(store.pricingTiers);
  const [faqsDraft, setFaqsDraft] = useState<FAQItem[]>(store.faqs);
  const [testimonialsDraft, setTestimonialsDraft] = useState<Testimonial[]>(
    store.testimonials || []
  );

  // Single-Product Full Controller Modal
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [memberSearch, setMemberSearch] = useState('');

  // System & Security states (Username, Email, Display Name & Password)
  const [apiUrlInput, setApiUrlInput] = useState(() => getConfiguredApiBase());
  const [adminUsernameDraft, setAdminUsernameDraft] = useState(
    adminUser?.username || 'admin'
  );
  const [adminEmailDraft, setAdminEmailDraft] = useState(
    adminUser?.email || 'admin@kulhadkaapi.in'
  );
  const [adminNameDraft, setAdminNameDraft] = useState(
    adminUser?.name || 'Chai & Kaapi Owner'
  );
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdIsError, setPwdIsError] = useState(false);
  const [testingConn, setTestingConn] = useState(false);

  // Close with Escape (unless nested item editor modal is open) + body scroll lock
  useModalEffects(open && !menuModalOpen, onClose);

  useEffect(() => {
    if (adminUser) {
      setAdminUsernameDraft(adminUser.username || 'admin');
      setAdminEmailDraft(adminUser.email || 'admin@kulhadkaapi.in');
      setAdminNameDraft(adminUser.name || 'Chai & Kaapi Owner');
    }
  }, [adminUser]);

  const serializedLocations = JSON.stringify(store.locations);
  useEffect(() => {
    setLocationsDraft(store.locations);
  }, [serializedLocations]);

  useEffect(() => {
    setBrandDraft(store.brand);
    setAvailDraft(store.availability);
    setDisplayDraft(store.display);
    setRewardsDraft(store.rewards);
    setPricingDraft(store.pricingTiers);
    setFaqsDraft(store.faqs);
    setTestimonialsDraft(store.testimonials || []);
  }, [
    store.brand,
    store.availability,
    store.display,
    store.rewards,
    store.pricingTiers,
    store.faqs,
    store.testimonials,
  ]);

  const notify = (msg: string) => {
    setSaveToast(msg);
    window.setTimeout(() => {
      setSaveToast((curr) => (curr === msg ? null : curr));
    }, 2600);
  };

  const todayShort = getTodayShortName();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      await loginAdmin(loginEmail, loginPassword);
      notify('Authenticated into Full-Stack Admin Studio');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 360, 0.9);
      setBrandDraft((prev) => ({
        ...prev,
        logoType: 'image',
        logoUrl: compressed,
      }));
      notify('Logo uploaded — click "Publish Brand Changes" to save');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Logo upload failed');
    }
  };

  const handleHeroFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1200, 0.84);
      setBrandDraft((prev) => ({ ...prev, heroImage: compressed }));
      notify('Hero photo uploaded — click "Publish Brand Changes" to save');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Hero upload failed');
    }
  };

  const handleSaveMenuModal = async (data: Partial<MenuItem>, editingId?: string) => {
    if (editingId) {
      await updateMenuItem(editingId, data);
      notify(`Updated “${data.name}”`);
    } else {
      await createMenuItem(data);
      notify(`Added “${data.name}” to menu`);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${store.brand.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'solen'}-store-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported full store JSON backup');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as StoreState;
        await importStoreJson(parsed);
        notify('Imported store backup successfully');
      } catch {
        notify('Invalid JSON backup file');
      }
    };
    reader.readAsText(file);
  };

  const totalRevenue = store.orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.subtotal, 0);
  const displayedCount = store.menuItems.filter((i) => i.displayed).length;
  const availableCount = store.menuItems.filter(
    (i) => i.available && i.stockCount > 0
  ).length;

  const filteredMembers = store.members.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.referralCode.toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 lg:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Full-Stack Admin Control Studio"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0C0908]/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.3, ease: SOLEN_EASE }}
            className="relative z-10 w-full max-w-6xl h-full sm:h-[90vh] sm:rounded-[2rem] bg-[#0D0A09] text-[#FAF6F0] border border-[#D4A359]/25 shadow-[0_36px_100px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col"
          >
            {/* Top Studio Bar */}
            <div className="px-5 sm:px-7 py-4 bg-[#0F241D] border-b border-[#D4A359]/25 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <BrandLogo brand={store.brand} light className="w-8 h-8" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-lg sm:text-xl font-medium">
                      {store.brand.name} Admin Control Studio
                    </h2>
                    <span
                      className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] ${
                        backendMode === 'live-api'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-[#D68C58]/20 text-[#D68C58] border border-[#D68C58]/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          backendMode === 'live-api'
                            ? 'bg-emerald-400'
                            : 'bg-[#D68C58]'
                        }`}
                      />
                      {backendMode === 'live-api'
                        ? 'Live Express API'
                        : 'Full-Stack Persistent DB'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#FAF8F5]/55">
                    Manage availability, closing hours, branding, menu items, and orders in real time
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {adminUser && (
                  <button
                    type="button"
                    onClick={() => {
                      logoutAdmin();
                      notify('Signed out of Admin');
                    }}
                    title="Sign Out"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] text-xs text-[#FAF8F5]/80 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close Admin Console"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#FAF8F5] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Auth Gate OR Full Admin Workspace */}
            {!adminUser ? (
              <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
                <div className="w-full max-w-md rounded-3xl p-7 sm:p-8 bg-[#1B1512] border border-white/[0.1] shadow-2xl space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#D68C58]/15 border border-[#D68C58]/30 flex items-center justify-center text-[#D68C58] mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif text-2xl font-medium">
                      Owner &amp; Barista Admin Sign In
                    </h3>
                    <p className="text-xs text-[#FAF8F5]/65">
                      Authenticate to control shop availability, closing times,
                      brand logo, brand name, menu items, orders, and storefront layout.
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#FAF8F5]/75 mb-1.5">
                        Admin Username or Email
                      </label>
                      <input
                        type="text"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="admin or admin@kulhadkaapi.in"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#D68C58]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#FAF8F5]/75 mb-1.5">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#D68C58]"
                      />
                    </div>

                    {loginError && (
                      <p className="text-xs text-rose-400 font-medium">{loginError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loggingIn}
                      className="w-full py-3.5 rounded-full bg-[#D68C58] hover:bg-[#E19A67] text-[#140F0C] text-sm font-semibold transition-all cursor-pointer"
                    >
                      {loggingIn ? 'Verifying Credentials...' : 'Enter Admin Control Studio'}
                    </button>
                  </form>

                  {import.meta.env.DEV && (
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#D68C58]">
                        Default Owner Credentials
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const saved = getSavedLocalAdminInfo();
                          setLoginEmail(saved.username || 'admin');
                          setLoginPassword('chai2026');
                        }}
                        className="text-[11px] text-[#A8D5AB] hover:underline cursor-pointer"
                      >
                        Auto-fill
                      </button>
                    </div>
                    <p className="font-mono text-[#FAF8F5]/80">
                      Username: {getSavedLocalAdminInfo().username} (or {getSavedLocalAdminInfo().email}) · chai2026
                    </p>
                  </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                {/* Sidebar Navigation */}
                <aside className="md:w-60 shrink-0 bg-[#120F0E] border-b md:border-b-0 md:border-r border-[#D4A359]/18 p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                          active
                            ? 'bg-[#D68C58] text-[#140F0C] font-semibold shadow-sm'
                            : 'text-[#FAF8F5]/70 hover:text-[#FAF8F5] hover:bg-white/[0.06]'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{tab.label}</span>
                        {tab.id === 'orders' &&
                          store.orders.some(
                            (o) => !['delivered', 'cancelled'].includes(o.status)
                          ) && (
                            <span
                              className={`ml-auto px-1.5 py-0.5 rounded-full font-mono text-[10px] ${
                                active
                                  ? 'bg-[#140F0C]/20 text-[#140F0C]'
                                  : 'bg-[#E68A24]/25 text-[#D9A441]'
                              }`}
                            >
                              {
                                store.orders.filter(
                                  (o) =>
                                    !['delivered', 'cancelled'].includes(o.status)
                                ).length
                              }
                            </span>
                          )}
                        {tab.id === 'reviews' &&
                          store.notifications.some((n) => !n.read) && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-rose-400" />
                          )}
                        {tab.id === 'inventory' &&
                          store.ingredients.some(
                            (i) => i.stockQty <= i.lowStockThreshold
                          ) && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-amber-400" />
                          )}
                      </button>
                    );
                  })}
                </aside>

                {/* Main Content Panel */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 relative">
                  <AnimatePresence>
                    {saveToast && (
                      <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="sticky top-0 z-20 mb-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold backdrop-blur-md"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{saveToast}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ================= TAB 1: OVERVIEW ================= */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-serif text-2xl font-medium">
                          Live Storefront Command Overview
                        </h3>
                        <p className="text-xs text-[#FAF8F5]/60 mt-1">
                          Every switch updates your live storefront instantaneously.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-[#FAF8F5]/55">
                            Live Bar Status
                          </p>
                          <p
                            className={`font-serif text-xl font-medium mt-1 ${
                              shopStatus.isOpen ? 'text-[#A8D5AB]' : 'text-rose-300'
                            }`}
                          >
                            {shopStatus.isOpen ? 'Open' : 'Closed'}
                          </p>
                          <p className="text-[11px] text-[#FAF8F5]/60 mt-0.5">
                            {shopStatus.todayScheduleText}
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-[#FAF8F5]/55">
                            Menu Catalog
                          </p>
                          <p className="font-serif text-xl font-medium mt-1">
                            {availableCount}/{store.menuItems.length} Available
                          </p>
                          <p className="text-[11px] text-[#FAF8F5]/60 mt-0.5">
                            {displayedCount} displayed on storefront
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-[#FAF8F5]/55">
                            Express Orders
                          </p>
                          <p className="font-serif text-xl font-medium mt-1 text-[#D68C58]">
                            {store.orders.length} Orders
                          </p>
                          <p className="text-[11px] text-[#FAF8F5]/60 mt-0.5">
                            ₹{totalRevenue.toLocaleString('en-IN')} bar volume
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-[#FAF8F5]/55">
                            Ritual Members
                          </p>
                          <p className="font-serif text-xl font-medium mt-1">
                            {store.members.length} Active
                          </p>
                          <p className="text-[11px] text-[#FAF8F5]/60 mt-0.5">
                            Ritual Club &amp; referrals active
                          </p>
                        </div>
                      </div>

                      {/* Instant Master Switches */}
                      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.09] space-y-5">
                        <h4 className="font-serif text-lg font-medium">
                          Instant Operations Switches
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-xs text-[#FAF8F5]/70 font-medium">
                              Shop Availability Mode
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {(
                                [
                                  { id: 'open', label: 'Open Now' },
                                  { id: 'busy', label: 'High Demand' },
                                  { id: 'closed', label: 'Closed Override' },
                                  { id: 'auto', label: 'Auto Schedule' },
                                ] as { id: AvailabilityMode; label: string }[]
                              ).map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={async () => {
                                    await updateSettings({
                                      availability: {
                                        ...store.availability,
                                        mode: m.id,
                                      },
                                    });
                                    notify(`Availability set to ${m.label}`);
                                  }}
                                  className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                                    store.availability.mode === m.id
                                      ? 'bg-[#D68C58] text-[#140F0C] border-[#D68C58]'
                                      : 'bg-white/[0.04] border-white/10 text-[#FAF8F5]/75 hover:bg-white/[0.09]'
                                  }`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[11px] text-[#FAF8F5]/65 mb-1">
                                  Opening Time (All Days)
                                </label>
                                <input
                                  type="time"
                                  value={store.availability.openingTime}
                                  onChange={async (e) => {
                                    const openingTime = e.target.value;
                                    const updatedSchedule =
                                      store.availability.weeklySchedule.map((d) => ({
                                        ...d,
                                        open: openingTime,
                                      }));
                                    await updateSettings({
                                      availability: {
                                        ...store.availability,
                                        openingTime,
                                        weeklySchedule: updatedSchedule,
                                      },
                                    });
                                    notify(
                                      `Opening time updated to ${formatTime12h(openingTime)}`
                                    );
                                  }}
                                  className="w-full px-3 py-2 rounded-xl bg-white/[0.07] border border-white/15 text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-[#FAF8F5]/65 mb-1">
                                  Closing Time (All Days)
                                </label>
                                <input
                                  type="time"
                                  value={store.availability.closingTime}
                                  onChange={async (e) => {
                                    const closingTime = e.target.value;
                                    const updatedSchedule =
                                      store.availability.weeklySchedule.map((d) => ({
                                        ...d,
                                        close: closingTime,
                                      }));
                                    await updateSettings({
                                      availability: {
                                        ...store.availability,
                                        closingTime,
                                        weeklySchedule: updatedSchedule,
                                      },
                                    });
                                    notify(
                                      `Closing time updated to ${formatTime12h(closingTime)}`
                                    );
                                  }}
                                  className="w-full px-3 py-2 rounded-xl bg-white/[0.07] border border-white/15 text-xs font-mono"
                                />
                              </div>
                            </div>

                            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.05] border border-white/10 cursor-pointer">
                              <span className="text-xs font-medium">
                                Accept Express Pickup Orders
                              </span>
                              <input
                                type="checkbox"
                                checked={store.availability.acceptingOrders}
                                onChange={async (e) => {
                                  await updateSettings({
                                    availability: {
                                      ...store.availability,
                                      acceptingOrders: e.target.checked,
                                    },
                                  });
                                  notify(
                                    e.target.checked
                                      ? 'Express pickup ordering enabled'
                                      : 'Express pickup ordering paused'
                                  );
                                }}
                                className="w-4 h-4 accent-[#D68C58]"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveTab('brand')}
                          className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-left cursor-pointer transition-colors"
                        >
                          <Palette className="w-5 h-5 text-[#D68C58] mb-2" />
                          <p className="text-sm font-semibold">Edit Brand Name &amp; Logo</p>
                          <p className="text-xs text-[#FAF8F5]/60 mt-0.5">
                            Upload custom logo or switch monograms
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('menu')}
                          className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-left cursor-pointer transition-colors"
                        >
                          <Coffee className="w-5 h-5 text-[#A8D5AB] mb-2" />
                          <p className="text-sm font-semibold">Manage Menu &amp; Display</p>
                          <p className="text-xs text-[#FAF8F5]/60 mt-0.5">
                            Toggle available, sold out &amp; visible drinks
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('orders')}
                          className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-left cursor-pointer transition-colors"
                        >
                          <ShoppingBag className="w-5 h-5 text-[#D68C58] mb-2" />
                          <p className="text-sm font-semibold">Live Orders &amp; Members</p>
                          <p className="text-xs text-[#FAF8F5]/60 mt-0.5">
                            Update live order tracker &amp; award Beans
                          </p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ================= TAB 2: AVAILABILITY & CLOSING HOURS ================= */}
                  {activeTab === 'availability' && (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-serif text-2xl font-medium">
                            Availability, Closing Time &amp; Branches
                          </h3>
                          <p className="text-xs text-[#FAF8F5]/60 mt-0.5">
                            Changing default Opening/Closing times syncs your weekly schedule automatically—or fine-tune any day individually below.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await updateSettings({
                              availability: availDraft,
                              locations: locationsDraft,
                            });
                            notify('Saved availability, closing hours & locations');
                          }}
                          className="px-5 py-2.5 rounded-full bg-[#D68C58] hover:bg-[#E19A67] text-[#140F0C] text-xs font-semibold cursor-pointer"
                        >
                          Save Availability &amp; Hours
                        </button>
                      </div>

                      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                              Status Override Mode
                            </label>
                            <select
                              value={availDraft.mode}
                              onChange={(e) =>
                                setAvailDraft({
                                  ...availDraft,
                                  mode: e.target.value as AvailabilityMode,
                                })
                              }
                              className="w-full px-3 py-2.5 rounded-xl bg-[#251D19] border border-white/15 text-sm"
                            >
                              <option value="open">Open Now (Manual)</option>
                              <option value="busy">Busy / High Demand</option>
                              <option value="closed">Temporarily Closed</option>
                              <option value="auto">Auto Follow Weekly Hours</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                              Default Opening Time
                            </label>
                            <input
                              type="time"
                              value={availDraft.openingTime}
                              onChange={(e) => {
                                const open = e.target.value;
                                setAvailDraft({
                                  ...availDraft,
                                  openingTime: open,
                                  weeklySchedule: availDraft.weeklySchedule.map(
                                    (d) => ({ ...d, open })
                                  ),
                                });
                              }}
                              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                              Default Closing Time
                            </label>
                            <input
                              type="time"
                              value={availDraft.closingTime}
                              onChange={(e) => {
                                const close = e.target.value;
                                setAvailDraft({
                                  ...availDraft,
                                  closingTime: close,
                                  weeklySchedule: availDraft.weeklySchedule.map(
                                    (d) => ({ ...d, close })
                                  ),
                                });
                              }}
                              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                              Express Member Early Pickup
                            </label>
                            <input
                              type="time"
                              value={availDraft.memberEarlyPickupTime}
                              onChange={(e) =>
                                setAvailDraft({
                                  ...availDraft,
                                  memberEarlyPickupTime: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 cursor-pointer">
                            <div>
                              <p className="text-xs font-semibold">Accept Express Orders</p>
                              <p className="text-[11px] text-[#FAF8F5]/55">
                                Allow customers to place bar pickup orders online
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={availDraft.acceptingOrders}
                              onChange={(e) =>
                                setAvailDraft({
                                  ...availDraft,
                                  acceptingOrders: e.target.checked,
                                })
                              }
                              className="w-4 h-4 accent-[#D68C58]"
                            />
                          </label>

                          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold">Bar Prep Time (mins)</p>
                              <p className="text-[11px] text-[#FAF8F5]/55">
                                Shown on pickup confirmations
                              </p>
                            </div>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={availDraft.prepTimeMinutes}
                              onChange={(e) =>
                                setAvailDraft({
                                  ...availDraft,
                                  prepTimeMinutes: Number(e.target.value) || 4,
                                })
                              }
                              className="w-20 px-3 py-1.5 rounded-xl bg-white/[0.08] border border-white/15 text-sm font-mono text-center"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                              Closed Notice Banner Copy
                            </label>
                            <textarea
                              rows={2}
                              value={availDraft.closedNotice}
                              onChange={(e) =>
                                setAvailDraft({
                                  ...availDraft,
                                  closedNotice: e.target.value,
                                })
                              }
                              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                              High Demand / Busy Notice Copy
                            </label>
                            <textarea
                              rows={2}
                              value={availDraft.busyNotice}
                              onChange={(e) =>
                                setAvailDraft({
                                  ...availDraft,
                                  busyNotice: e.target.value,
                                })
                              }
                              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 7-Day Schedule with TODAY highlight */}
                      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-serif text-lg font-medium">
                            Per-Day Opening &amp; Closing Schedule
                          </h4>
                          <span className="font-mono text-[11px] text-[#A8D5AB]">
                            Active Today ({todayShort}):{' '}
                            {formatTime12h(
                              availDraft.weeklySchedule.find((d) =>
                                d.day.startsWith(todayShort)
                              )?.open || availDraft.openingTime
                            )}{' '}
                            –{' '}
                            {formatTime12h(
                              availDraft.weeklySchedule.find((d) =>
                                d.day.startsWith(todayShort)
                              )?.close || availDraft.closingTime
                            )}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {availDraft.weeklySchedule.map((row, idx) => {
                            const isToday = row.day
                              .toLowerCase()
                              .startsWith(todayShort.toLowerCase());
                            return (
                              <div
                                key={row.day}
                                className={`grid grid-cols-12 items-center gap-2.5 p-2.5 rounded-xl border ${
                                  isToday
                                    ? 'bg-[#D68C58]/10 border-[#D68C58]/40'
                                    : 'bg-white/[0.03] border-white/[0.06]'
                                }`}
                              >
                                <div className="col-span-3 sm:col-span-2 flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-semibold">
                                    {row.day}
                                  </span>
                                  {isToday && (
                                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#D68C58] text-[#140F0C] font-bold">
                                      Today
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="time"
                                  disabled={row.isClosed}
                                  value={row.open}
                                  onChange={(e) => {
                                    const next = [...availDraft.weeklySchedule];
                                    next[idx] = { ...row, open: e.target.value };
                                    setAvailDraft({
                                      ...availDraft,
                                      weeklySchedule: next,
                                    });
                                  }}
                                  className="col-span-3 sm:col-span-4 px-2.5 py-1.5 rounded-lg bg-white/[0.07] border border-white/10 text-xs font-mono disabled:opacity-40"
                                />
                                <input
                                  type="time"
                                  disabled={row.isClosed}
                                  value={row.close}
                                  onChange={(e) => {
                                    const next = [...availDraft.weeklySchedule];
                                    next[idx] = { ...row, close: e.target.value };
                                    setAvailDraft({
                                      ...availDraft,
                                      weeklySchedule: next,
                                    });
                                  }}
                                  className="col-span-4 px-2.5 py-1.5 rounded-lg bg-white/[0.07] border border-white/10 text-xs font-mono disabled:opacity-40"
                                />
                                <label className="col-span-2 flex items-center justify-end gap-1.5 text-[11px] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={row.isClosed}
                                    onChange={(e) => {
                                      const next = [...availDraft.weeklySchedule];
                                      next[idx] = {
                                        ...row,
                                        isClosed: e.target.checked,
                                      };
                                      setAvailDraft({
                                        ...availDraft,
                                        weeklySchedule: next,
                                      });
                                    }}
                                    className="accent-rose-500"
                                  />
                                  <span className="text-[#FAF8F5]/70">Off</span>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Café Outlets / Branches Live Manager (Auto-Persists to Front Page!) */}
                      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="font-serif text-lg font-medium flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-[#D68C58]" />
                              Café Outlets / Branches ({locationsDraft.length})
                            </h4>
                            <p className="text-xs text-[#FAF8F5]/60 mt-0.5">
                              Adding, editing, or deleting an outlet updates the front page immediately.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                const next = [
                                  ...locationsDraft,
                                  {
                                    id: `loc-${Date.now()}`,
                                    name: 'New Chai & Kaapi Outlet',
                                    neighborhood: 'Bengaluru',
                                    address: '100 Feet Road, Indiranagar',
                                    phone: '+91 80 4123 8900',
                                    hours: 'Daily 7:00 AM – 10:30 PM',
                                    mapUrl: '',
                                    isOpen: true,
                                  },
                                ];
                                setLocationsDraft(next);
                                await updateSettings({ locations: next });
                                notify('Added new outlet live on front page');
                              }}
                              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Outlet
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await updateSettings({ locations: locationsDraft });
                                notify('Saved all outlet changes live to front page');
                              }}
                              className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#D68C58] hover:bg-[#E19A67] text-[#140F0C] text-xs font-bold cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Save Outlets
                            </button>
                          </div>
                        </div>

                        {locationsDraft.length === 0 ? (
                          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center text-xs text-[#FAF8F5]/65">
                            No outlets currently listed on the front page. Click <strong>“Add Outlet”</strong> above to add a café location.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {locationsDraft.map((loc, idx) => (
                              <div
                                key={loc.id}
                                className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                                  <input
                                    type="text"
                                    value={loc.name}
                                    onChange={(e) => {
                                      const next = [...locationsDraft];
                                      next[idx] = { ...loc, name: e.target.value };
                                      setLocationsDraft(next);
                                    }}
                                    onBlur={() =>
                                      updateSettings({ locations: locationsDraft })
                                    }
                                    placeholder="Outlet Name (e.g., Flagship Tapri · Indiranagar)"
                                    className="sm:col-span-5 px-3 py-2 rounded-lg bg-white/[0.07] border border-white/12 text-xs font-semibold"
                                  />
                                  <input
                                    type="text"
                                    value={loc.neighborhood || ''}
                                    onChange={(e) => {
                                      const next = [...locationsDraft];
                                      next[idx] = {
                                        ...loc,
                                        neighborhood: e.target.value,
                                      };
                                      setLocationsDraft(next);
                                    }}
                                    onBlur={() =>
                                      updateSettings({ locations: locationsDraft })
                                    }
                                    placeholder="City / Area (e.g., Bengaluru)"
                                    className="sm:col-span-3 px-3 py-2 rounded-lg bg-white/[0.07] border border-white/12 text-xs"
                                  />
                                  <label className="sm:col-span-2 flex items-center gap-1.5 text-xs cursor-pointer justify-start sm:justify-center">
                                    <input
                                      type="checkbox"
                                      checked={loc.isOpen}
                                      onChange={async (e) => {
                                        const next = [...locationsDraft];
                                        next[idx] = {
                                          ...loc,
                                          isOpen: e.target.checked,
                                        };
                                        setLocationsDraft(next);
                                        await updateSettings({ locations: next });
                                        notify(
                                          `${loc.name} marked ${e.target.checked ? 'Open' : 'Closed'}`
                                        );
                                      }}
                                      className="accent-emerald-500"
                                    />
                                    <span>{loc.isOpen ? 'Open' : 'Closed'}</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const next = locationsDraft.filter(
                                        (l) => l.id !== loc.id
                                      );
                                      setLocationsDraft(next);
                                      await updateSettings({ locations: next });
                                      notify(`Removed outlet “${loc.name}” from front page`);
                                    }}
                                    className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 text-[11px] font-semibold cursor-pointer"
                                    aria-label={`Delete ${loc.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                  <input
                                    type="text"
                                    value={loc.address}
                                    onChange={(e) => {
                                      const next = [...locationsDraft];
                                      next[idx] = { ...loc, address: e.target.value };
                                      setLocationsDraft(next);
                                    }}
                                    onBlur={() =>
                                      updateSettings({ locations: locationsDraft })
                                    }
                                    placeholder="Full Street Address"
                                    className="sm:col-span-5 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-xs"
                                  />
                                  <input
                                    type="text"
                                    value={loc.phone || ''}
                                    onChange={(e) => {
                                      const next = [...locationsDraft];
                                      next[idx] = { ...loc, phone: e.target.value };
                                      setLocationsDraft(next);
                                    }}
                                    onBlur={() =>
                                      updateSettings({ locations: locationsDraft })
                                    }
                                    placeholder="Phone (+91...)"
                                    className="sm:col-span-3 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-xs"
                                  />
                                  <input
                                    type="text"
                                    value={loc.hours || ''}
                                    onChange={(e) => {
                                      const next = [...locationsDraft];
                                      next[idx] = { ...loc, hours: e.target.value };
                                      setLocationsDraft(next);
                                    }}
                                    onBlur={() =>
                                      updateSettings({ locations: locationsDraft })
                                    }
                                    placeholder="Hours (e.g., Daily 7 AM – 10:30 PM)"
                                    className="sm:col-span-4 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-xs"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ================= TAB 3: BRAND NAME, LOGO & HERO ================= */}
                  {activeTab === 'brand' && (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-serif text-2xl font-medium">
                            Brand Name, Logo &amp; Hero Identity
                          </h3>
                          <p className="text-xs text-[#FAF8F5]/60 mt-0.5">
                            Instantly rebrand your storefront, Digital Passes, and browser tab title.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await updateSettings({ brand: brandDraft });
                            notify('Brand identity & logo published live');
                          }}
                          className="px-5 py-2.5 rounded-full bg-[#D68C58] hover:bg-[#E19A67] text-[#140F0C] text-xs font-semibold cursor-pointer"
                        >
                          Publish Brand Changes
                        </button>
                      </div>

                      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                              Brand Name
                            </label>
                            <input
                              type="text"
                              value={brandDraft.name}
                              onChange={(e) =>
                                setBrandDraft({ ...brandDraft, name: e.target.value })
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                              Navbar Sub-label
                            </label>
                            <input
                              type="text"
                              value={brandDraft.tagline}
                              onChange={(e) =>
                                setBrandDraft({
                                  ...brandDraft,
                                  tagline: e.target.value,
                                })
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                              Footer Descriptor
                            </label>
                            <input
                              type="text"
                              value={brandDraft.footerSublabel}
                              onChange={(e) =>
                                setBrandDraft({
                                  ...brandDraft,
                                  footerSublabel: e.target.value,
                                })
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                              Support Email
                            </label>
                            <input
                              type="email"
                              value={brandDraft.supportEmail}
                              onChange={(e) =>
                                setBrandDraft({
                                  ...brandDraft,
                                  supportEmail: e.target.value,
                                })
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm"
                            />
                          </div>
                        </div>

                        {/* Brand Logo Controls */}
                        <div className="pt-4 border-t border-white/[0.08] space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase font-mono tracking-wider text-[#D68C58]">
                              Brand Logo Control
                            </p>
                            <div className="inline-flex rounded-full p-0.5 bg-white/[0.06] border border-white/10 text-xs">
                              <button
                                type="button"
                                onClick={() =>
                                  setBrandDraft({ ...brandDraft, logoType: 'preset' })
                                }
                                className={`px-3 py-1 rounded-full cursor-pointer ${
                                  brandDraft.logoType === 'preset'
                                    ? 'bg-[#D68C58] text-[#140F0C] font-semibold'
                                    : 'text-[#FAF8F5]/70'
                                }`}
                              >
                                Built-in Monograms
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setBrandDraft({ ...brandDraft, logoType: 'image' })
                                }
                                className={`px-3 py-1 rounded-full cursor-pointer ${
                                  brandDraft.logoType === 'image'
                                    ? 'bg-[#D68C58] text-[#140F0C] font-semibold'
                                    : 'text-[#FAF8F5]/70'
                                }`}
                              >
                                Custom Logo Image
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                            <div className="lg:col-span-4 flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                              <BrandLogo brand={brandDraft} className="w-12 h-12" />
                              <BrandLogo brand={brandDraft} light className="w-12 h-12" />
                              <div className="min-w-0">
                                <p className="font-serif text-lg font-medium truncate">
                                  {brandDraft.name}
                                </p>
                                <p className="font-mono text-[10px] uppercase tracking-widest text-[#D68C58] truncate">
                                  {brandDraft.tagline}
                                </p>
                              </div>
                            </div>

                            {brandDraft.logoType === 'preset' ? (
                              <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {(
                                  [
                                    { id: 'kulhad', label: 'Clay Kulhad' },
                                    { id: 'davara', label: 'Brass Davara' },
                                    { id: 'kettle', label: 'Chai Kettle' },
                                    { id: 'emblem', label: 'Arch Emblem' },
                                  ] as { id: LogoPreset; label: string }[]
                                ).map((preset) => (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() =>
                                      setBrandDraft({
                                        ...brandDraft,
                                        logoType: 'preset',
                                        logoPreset: preset.id,
                                      })
                                    }
                                    className={`p-3 rounded-2xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                                      brandDraft.logoPreset === preset.id
                                        ? 'bg-[#D68C58]/15 border-[#D68C58]'
                                        : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07]'
                                    }`}
                                  >
                                    <BrandLogo
                                      brand={{
                                        ...brandDraft,
                                        logoType: 'preset',
                                        logoPreset: preset.id,
                                      }}
                                      light
                                      className="w-9 h-9"
                                    />
                                    <span className="text-[11px] font-medium">
                                      {preset.label}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="lg:col-span-8 space-y-2.5">
                                <div className="flex flex-col sm:flex-row gap-2.5">
                                  <input
                                    type="text"
                                    value={brandDraft.logoUrl}
                                    onChange={(e) =>
                                      setBrandDraft({
                                        ...brandDraft,
                                        logoType: 'image',
                                        logoUrl: e.target.value,
                                      })
                                    }
                                    placeholder="Paste logo image URL (https://...) or upload file →"
                                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-xs font-mono"
                                  />
                                  <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#D68C58] text-[#140F0C] text-xs font-semibold cursor-pointer shrink-0">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Upload Logo File</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleLogoFileUpload}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                                <p className="text-[11px] text-[#FAF8F5]/55">
                                  Auto-optimized PNG, SVG, JPG, or WebP synced live across your storefront.
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10">
                              <span className="text-xs font-medium">
                                Primary Brand Accent (Saffron Orange)
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-[#FAF8F5]/70">
                                  {brandDraft.accentColor}
                                </span>
                                <input
                                  type="color"
                                  value={brandDraft.accentColor}
                                  onChange={(e) =>
                                    setBrandDraft({
                                      ...brandDraft,
                                      accentColor: e.target.value,
                                    })
                                  }
                                  className="w-8 h-8 rounded cursor-pointer bg-transparent"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10">
                              <span className="text-xs font-medium">
                                Secondary Accent (Deep Green)
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-[#FAF8F5]/70">
                                  {brandDraft.secondaryAccent}
                                </span>
                                <input
                                  type="color"
                                  value={brandDraft.secondaryAccent}
                                  onChange={(e) =>
                                    setBrandDraft({
                                      ...brandDraft,
                                      secondaryAccent: e.target.value,
                                    })
                                  }
                                  className="w-8 h-8 rounded cursor-pointer bg-transparent"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hero Copy & Announcement Bar */}
                      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] space-y-4">
                        <h4 className="font-serif text-lg font-medium">
                          Hero Copy, Badge, Photo &amp; Announcement Bar
                        </h4>

                        <label className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 cursor-pointer">
                          <div>
                            <p className="text-xs font-semibold">Show Top Announcement Bar</p>
                            <p className="text-[11px] text-[#FAF8F5]/55">
                              Displays a promo or seasonal harvest banner across the top of your site
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={brandDraft.announcementEnabled}
                            onChange={(e) =>
                              setBrandDraft({
                                ...brandDraft,
                                announcementEnabled: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-[#D68C58]"
                          />
                        </label>

                        {brandDraft.announcementEnabled && (
                          <input
                            type="text"
                            value={brandDraft.announcementText}
                            onChange={(e) =>
                              setBrandDraft({
                                ...brandDraft,
                                announcementText: e.target.value,
                              })
                            }
                            placeholder="Announcement bar message..."
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-xs"
                          />
                        )}

                        <div>
                          <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                            Hero Live Harvest Badge Text
                          </label>
                          <input
                            type="text"
                            value={brandDraft.heroBadge}
                            onChange={(e) =>
                              setBrandDraft({
                                ...brandDraft,
                                heroBadge: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          <div className="sm:col-span-2">
                            <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                              Hero Headline
                            </label>
                            <input
                              type="text"
                              value={brandDraft.heroHeadline}
                              onChange={(e) =>
                                setBrandDraft({
                                  ...brandDraft,
                                  heroHeadline: e.target.value,
                                })
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                              Italic Accent Word
                            </label>
                            <input
                              type="text"
                              value={brandDraft.heroHighlightWord}
                              onChange={(e) =>
                                setBrandDraft({
                                  ...brandDraft,
                                  heroHighlightWord: e.target.value,
                                })
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-[#FAF8F5]/70 mb-1.5">
                            Hero Subheadline
                          </label>
                          <textarea
                            rows={2}
                            value={brandDraft.heroSubhead}
                            onChange={(e) =>
                              setBrandDraft({
                                ...brandDraft,
                                heroSubhead: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-xs"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs text-[#FAF8F5]/70">
                            Hero Feature Image
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2.5">
                            <input
                              type="text"
                              value={brandDraft.heroImage}
                              onChange={(e) =>
                                setBrandDraft({
                                  ...brandDraft,
                                  heroImage: e.target.value,
                                })
                              }
                              className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.07] border border-white/15 text-xs font-mono"
                            />
                            <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer">
                              <Upload className="w-3.5 h-3.5" />
                              Upload Photo
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleHeroFileUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pt-1">
                            {GALLERY_IMAGES.map((img) => (
                              <button
                                key={img.url}
                                type="button"
                                onClick={() =>
                                  setBrandDraft({ ...brandDraft, heroImage: img.url })
                                }
                                className={`relative shrink-0 w-14 h-12 rounded-lg overflow-hidden border-2 cursor-pointer ${
                                  brandDraft.heroImage === img.url
                                    ? 'border-[#D68C58]'
                                    : 'border-transparent opacity-65 hover:opacity-100'
                                }`}
                                title={img.label}
                              >
                                <img
                                  src={img.url}
                                  alt={img.label}
                                  className="w-full h-full object-cover"
                                />
                                {brandDraft.heroImage === img.url && (
                                  <span className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-[#D68C58]" />
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ================= DEDICATED PRODUCT & PRICE ADMIN SECTION ================= */}
                  {activeTab === 'menu' && (
                    <AdminProductStudioPanel
                      notify={notify}
                      onOpenCreate={() => {
                        setEditingItem(null);
                        setMenuModalOpen(true);
                      }}
                      onOpenEdit={(item) => {
                        setEditingItem(item);
                        setMenuModalOpen(true);
                      }}
                    />
                  )}

                  {/* ================= TAB 5: STOREFRONT DISPLAY CONTROLS ================= */}
                  {activeTab === 'display' && (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-serif text-2xl font-medium">
                            Storefront Display Controls
                          </h3>
                          <p className="text-xs text-[#FAF8F5]/60 mt-0.5">
                            Manage sold-out visibility, display item cap, and landing page sections.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await updateSettings({ display: displayDraft });
                            notify('Display & layout settings saved');
                          }}
                          className="px-5 py-2.5 rounded-full bg-[#D68C58] hover:bg-[#E19A67] text-[#140F0C] text-xs font-semibold cursor-pointer"
                        >
                          Save Display Controls
                        </button>
                      </div>

                      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] space-y-3">
                        {[
                          {
                            key: 'showSoldOutItems' as const,
                            title: 'Show Sold-Out Items on Menu',
                            desc: 'Display sold-out pours dimmed with badge (turn off to hide them automatically)',
                          },
                          {
                            key: 'showRewardsCalculator' as const,
                            title: 'Display Reach & Earn Rewards Calculator',
                            desc: 'Show the interactive sliders & referral link simulator (also updates nav links)',
                          },
                          {
                            key: 'showTestimonials' as const,
                            title: 'Display Community Testimonials',
                            desc: 'Show verified customer reviews section',
                          },
                          {
                            key: 'showPricing' as const,
                            title: 'Display Ritual Club Memberships & Pricing',
                            desc: 'Show Monthly / Annual membership plans (also updates nav links)',
                          },
                          {
                            key: 'showFaq' as const,
                            title: 'Display FAQ Accordion Section',
                            desc: 'Show frequently asked questions before CTA (also updates nav links)',
                          },
                        ].map((row) => (
                          <label
                            key={row.key}
                            className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] cursor-pointer"
                          >
                            <div>
                              <p className="text-sm font-medium">{row.title}</p>
                              <p className="text-xs text-[#FAF8F5]/55">{row.desc}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={Boolean(displayDraft[row.key])}
                              onChange={(e) =>
                                setDisplayDraft({
                                  ...displayDraft,
                                  [row.key]: e.target.checked,
                                })
                              }
                              className="w-4 h-4 accent-[#D68C58] shrink-0"
                            />
                          </label>
                        ))}

                        <div className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                          <div>
                            <p className="text-sm font-medium">
                              Max Display Items on Storefront
                            </p>
                            <p className="text-xs text-[#FAF8F5]/55">
                              Cap how many enabled items appear in the menu grid
                            </p>
                          </div>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={displayDraft.maxDisplayItems}
                            onChange={(e) =>
                              setDisplayDraft({
                                ...displayDraft,
                                maxDisplayItems: Math.max(
                                  1,
                                  Number(e.target.value) || 6
                                ),
                              })
                            }
                            className="w-20 px-3 py-1.5 rounded-xl bg-white/[0.08] border border-white/15 text-sm font-mono text-center"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ================= NEW ENTERPRISE TABS ================= */}
                  {activeTab === 'analytics' && <AdminAnalyticsPanel />}

                  {activeTab === 'inventory' && (
                    <AdminInventoryPanel notify={notify} />
                  )}

                  {activeTab === 'coupons' && (
                    <AdminCouponsAndCommercePanel notify={notify} />
                  )}

                  {activeTab === 'reviews' && (
                    <AdminReviewsSupportPanel notify={notify} />
                  )}

                  {/* ================= TAB: KDS, LIVE ORDERS & MEMBERS ================= */}
                  {activeTab === 'orders' && (
                    <div className="space-y-8">
                      <AdminOrdersAndKdsPanel notify={notify} />

                      {/* Members CRM */}
                      <div className="space-y-3 pt-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h4 className="font-mono text-xs uppercase tracking-[0.18em] text-[#A8D5AB] flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" />
                            Ritual Club Members ({filteredMembers.length})
                          </h4>
                          <input
                            type="text"
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            placeholder="Search name, email, or ref code..."
                            className="px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/12 text-xs w-60"
                          />
                        </div>

                        <div className="space-y-2.5">
                          {filteredMembers.map((member) => (
                            <div
                              key={member.id}
                              className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-sm">
                                    {member.name}
                                  </span>
                                  <span className="text-xs text-[#FAF8F5]/60">
                                    {member.email}
                                  </span>
                                </div>
                                <p className="text-xs text-[#FAF8F5]/60 mt-1">
                                  {member.plan} · Fav: {member.preferredDrink} · Code:{' '}
                                  <span className="font-mono text-[#D68C58]">
                                    {member.referralCode}
                                  </span>
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                <span className="font-mono text-xs font-semibold px-3 py-1.5 rounded-full bg-[#E68A24]/20 text-[#D9A441]">
                                  {member.beansBalance} Coins
                                </span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await adjustMemberBeans(member.id, -50);
                                    notify(`Deducted 50 Coins from ${member.name}`);
                                  }}
                                  className="px-2.5 py-1.5 rounded-full bg-white/[0.07] hover:bg-white/15 text-[11px] font-semibold cursor-pointer"
                                >
                                  -50
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await adjustMemberBeans(member.id, 50);
                                    notify(`Awarded +50 Coins to ${member.name}`);
                                  }}
                                  className="px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-semibold cursor-pointer"
                                >
                                  +50
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteMember(member.id);
                                    notify(`Removed member ${member.name}`);
                                  }}
                                  title="Remove member"
                                  className="p-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ================= TAB 7: REWARDS, PRICING, TESTIMONIALS & FAQ ================= */}
                  {activeTab === 'rewards' && (
                    <div className="space-y-6">
                      {/* Rewards Config */}
                      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-serif text-xl font-medium">
                              Reach &amp; Earn Rewards Economics
                            </h3>
                            <p className="text-xs text-[#FAF8F5]/60">
                              Adjust Golden Beans rates &amp; referral cash bonuses.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await updateSettings({ rewards: rewardsDraft });
                              notify('Updated Reach & Earn rewards economics');
                            }}
                            className="px-4 py-2 rounded-full bg-[#D68C58] text-[#140F0C] text-xs font-semibold cursor-pointer"
                          >
                            Save Rewards Config
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                          {[
                            {
                              key: 'beansPerDollar' as const,
                              label: 'Coins per ₹10 Spent',
                            },
                            {
                              key: 'beansForFreeDrink' as const,
                              label: 'Coins for Free Cup',
                            },
                            {
                              key: 'welcomeBonusBeans' as const,
                              label: 'Welcome Bonus Coins',
                            },
                            {
                              key: 'referralBonusBeans' as const,
                              label: 'Referral Bonus Coins',
                            },
                            {
                              key: 'ritualPassReferralCash' as const,
                              label: 'Chai Pass Ref (₹)',
                            },
                            {
                              key: 'reserveReferralCash' as const,
                              label: 'Maharaja Ref (₹)',
                            },
                          ].map((field) => (
                            <div key={field.key}>
                              <label className="block text-[11px] text-[#FAF8F5]/70 mb-1">
                                {field.label}
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={rewardsDraft[field.key]}
                                onChange={(e) =>
                                  setRewardsDraft({
                                    ...rewardsDraft,
                                    [field.key]: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-xl bg-white/[0.07] border border-white/15 text-sm font-mono"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pricing Tiers Full Editor */}
                      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-serif text-xl font-medium">
                            Membership Tiers &amp; Pricing
                          </h3>
                          <button
                            type="button"
                            onClick={async () => {
                              await savePricingTiers(pricingDraft);
                              notify('Membership pricing saved live');
                            }}
                            className="px-4 py-2 rounded-full bg-[#D68C58] text-[#140F0C] text-xs font-semibold cursor-pointer"
                          >
                            Save Pricing Tiers
                          </button>
                        </div>

                        <div className="space-y-4">
                          {pricingDraft.map((tier, idx) => (
                            <div
                              key={tier.id}
                              className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-3"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                <input
                                  type="text"
                                  value={tier.name}
                                  onChange={(e) => {
                                    const next = [...pricingDraft];
                                    next[idx] = { ...tier, name: e.target.value };
                                    setPricingDraft(next);
                                  }}
                                  placeholder="Tier Name"
                                  className="sm:col-span-3 px-3 py-2 rounded-lg bg-white/[0.07] border border-white/10 text-xs font-semibold"
                                />
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] text-[#FAF8F5]/50">
                                    Monthly (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={tier.monthlyPrice}
                                    onChange={(e) => {
                                      const next = [...pricingDraft];
                                      next[idx] = {
                                        ...tier,
                                        monthlyPrice: Number(e.target.value) || 0,
                                      };
                                      setPricingDraft(next);
                                    }}
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.07] border border-white/10 text-xs font-mono"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] text-[#FAF8F5]/50">
                                    Annual/mo (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={tier.annualMonthlyPrice}
                                    onChange={(e) => {
                                      const next = [...pricingDraft];
                                      next[idx] = {
                                        ...tier,
                                        annualMonthlyPrice:
                                          Number(e.target.value) || 0,
                                      };
                                      setPricingDraft(next);
                                    }}
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.07] border border-white/10 text-xs font-mono"
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={tier.badge || ''}
                                  placeholder="Badge (optional)"
                                  onChange={(e) => {
                                    const next = [...pricingDraft];
                                    next[idx] = { ...tier, badge: e.target.value };
                                    setPricingDraft(next);
                                  }}
                                  className="sm:col-span-3 px-3 py-2 rounded-lg bg-white/[0.07] border border-white/10 text-xs"
                                />
                                <label className="sm:col-span-2 flex items-center gap-1.5 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={tier.visible !== false}
                                    onChange={(e) => {
                                      const next = [...pricingDraft];
                                      next[idx] = {
                                        ...tier,
                                        visible: e.target.checked,
                                      };
                                      setPricingDraft(next);
                                    }}
                                    className="accent-[#D68C58]"
                                  />
                                  <span>Visible</span>
                                </label>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <input
                                  type="text"
                                  value={tier.cta}
                                  placeholder="CTA Button Label"
                                  onChange={(e) => {
                                    const next = [...pricingDraft];
                                    next[idx] = { ...tier, cta: e.target.value };
                                    setPricingDraft(next);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs"
                                />
                                <input
                                  type="text"
                                  value={tier.beanMultiplier}
                                  placeholder="Bean Multiplier"
                                  onChange={(e) => {
                                    const next = [...pricingDraft];
                                    next[idx] = {
                                      ...tier,
                                      beanMultiplier: e.target.value,
                                    };
                                    setPricingDraft(next);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs"
                                />
                                <input
                                  type="text"
                                  value={tier.referralBonus}
                                  placeholder="Referral Bonus"
                                  onChange={(e) => {
                                    const next = [...pricingDraft];
                                    next[idx] = {
                                      ...tier,
                                      referralBonus: e.target.value,
                                    };
                                    setPricingDraft(next);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Testimonials CMS */}
                      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-serif text-xl font-medium flex items-center gap-2">
                            <MessageSquareQuote className="w-5 h-5 text-[#D68C58]" />
                            Community Testimonials Manager
                          </h3>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setTestimonialsDraft([
                                  ...testimonialsDraft,
                                  {
                                    id: `t-${Date.now()}`,
                                    name: 'New Regular',
                                    role: 'Coffee & Tea Lover',
                                    avatarInitials: 'NR',
                                    avatarBg: '#4E6B50',
                                    quote:
                                      'Unbelievable pour-overs and effortless referral rewards.',
                                    favoriteDrink: 'Velvet Honey Cortado',
                                    earnedStat: '500 Golden Beans earned',
                                    rating: 5,
                                    visible: true,
                                  },
                                ])
                              }
                              className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
                            >
                              + Add Review
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await saveTestimonials(testimonialsDraft);
                                notify('Testimonials published live');
                              }}
                              className="px-4 py-2 rounded-full bg-[#D68C58] text-[#140F0C] text-xs font-semibold cursor-pointer"
                            >
                              Save Reviews
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {testimonialsDraft.map((rev, idx) => (
                            <div
                              key={rev.id}
                              className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-2.5"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                <input
                                  type="text"
                                  value={rev.name}
                                  placeholder="Reviewer Name"
                                  onChange={(e) => {
                                    const next = [...testimonialsDraft];
                                    const initials = e.target.value
                                      .split(' ')
                                      .map((p) => p[0])
                                      .join('')
                                      .toUpperCase()
                                      .slice(0, 2);
                                    next[idx] = {
                                      ...rev,
                                      name: e.target.value,
                                      avatarInitials: initials || rev.avatarInitials,
                                    };
                                    setTestimonialsDraft(next);
                                  }}
                                  className="sm:col-span-3 px-3 py-1.5 rounded-lg bg-white/[0.07] border border-white/10 text-xs font-semibold"
                                />
                                <input
                                  type="text"
                                  value={rev.favoriteDrink}
                                  placeholder="Favorite Drink"
                                  onChange={(e) => {
                                    const next = [...testimonialsDraft];
                                    next[idx] = {
                                      ...rev,
                                      favoriteDrink: e.target.value,
                                    };
                                    setTestimonialsDraft(next);
                                  }}
                                  className="sm:col-span-4 px-3 py-1.5 rounded-lg bg-white/[0.07] border border-white/10 text-xs"
                                />
                                <input
                                  type="text"
                                  value={rev.earnedStat}
                                  placeholder="Earned Stat Badge"
                                  onChange={(e) => {
                                    const next = [...testimonialsDraft];
                                    next[idx] = {
                                      ...rev,
                                      earnedStat: e.target.value,
                                    };
                                    setTestimonialsDraft(next);
                                  }}
                                  className="sm:col-span-3 px-3 py-1.5 rounded-lg bg-white/[0.07] border border-white/10 text-xs"
                                />
                                <div className="sm:col-span-2 flex items-center justify-end gap-2">
                                  <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={rev.visible !== false}
                                      onChange={(e) => {
                                        const next = [...testimonialsDraft];
                                        next[idx] = {
                                          ...rev,
                                          visible: e.target.checked,
                                        };
                                        setTestimonialsDraft(next);
                                      }}
                                      className="accent-[#D68C58]"
                                    />
                                    Show
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setTestimonialsDraft(
                                        testimonialsDraft.filter((t) => t.id !== rev.id)
                                      )
                                    }
                                    className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <textarea
                                rows={2}
                                value={rev.quote}
                                onChange={(e) => {
                                  const next = [...testimonialsDraft];
                                  next[idx] = { ...rev, quote: e.target.value };
                                  setTestimonialsDraft(next);
                                }}
                                className="w-full px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-[#FAF8F5]/80"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* FAQs Editor with Visibility Toggle */}
                      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-serif text-xl font-medium">
                            FAQ Content Manager
                          </h3>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setFaqsDraft([
                                  ...faqsDraft,
                                  {
                                    id: `faq-${Date.now()}`,
                                    question: 'New Question?',
                                    answer: 'Answer goes here...',
                                    visible: true,
                                  },
                                ])
                              }
                              className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
                            >
                              + Add FAQ
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await saveFaqs(faqsDraft);
                                notify('FAQs saved live');
                              }}
                              className="px-4 py-2 rounded-full bg-[#D68C58] text-[#140F0C] text-xs font-semibold cursor-pointer"
                            >
                              Save FAQs
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {faqsDraft.map((faq, idx) => (
                            <div
                              key={faq.id}
                              className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-2"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={faq.question}
                                  onChange={(e) => {
                                    const next = [...faqsDraft];
                                    next[idx] = { ...faq, question: e.target.value };
                                    setFaqsDraft(next);
                                  }}
                                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.07] border border-white/10 text-xs font-semibold"
                                />
                                <label className="flex items-center gap-1 text-[11px] text-[#FAF8F5]/70 cursor-pointer shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={faq.visible !== false}
                                    onChange={(e) => {
                                      const next = [...faqsDraft];
                                      next[idx] = {
                                        ...faq,
                                        visible: e.target.checked,
                                      };
                                      setFaqsDraft(next);
                                    }}
                                    className="accent-[#D68C58]"
                                  />
                                  Show
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFaqsDraft(
                                      faqsDraft.filter((f) => f.id !== faq.id)
                                    )
                                  }
                                  className="p-1.5 text-rose-400 hover:text-rose-300 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <textarea
                                rows={2}
                                value={faq.answer}
                                onChange={(e) => {
                                  const next = [...faqsDraft];
                                  next[idx] = { ...faq, answer: e.target.value };
                                  setFaqsDraft(next);
                                }}
                                className="w-full px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-[#FAF8F5]/80"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ================= TAB 8: BACKEND & SECURITY ================= */}
                  {activeTab === 'system' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-serif text-2xl font-medium">
                          Full-Stack Backend API &amp; Security
                        </h3>
                        <p className="text-xs text-[#FAF8F5]/60 mt-0.5">
                          Connect to the included Node.js Express backend (`server/index.mjs`) or manage backups &amp; admin password.
                        </p>
                      </div>

                      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] space-y-4">
                        <div>
                          <p className="text-sm font-semibold">
                            Backend Status:{' '}
                            <span
                              className={
                                backendMode === 'live-api'
                                  ? 'text-emerald-300'
                                  : 'text-[#D68C58]'
                              }
                            >
                              {backendMode === 'live-api'
                                ? 'Connected to Live Express REST API'
                                : 'Embedded Full-Stack Persistent Storage (Static Preview Mode)'}
                            </span>
                          </p>
                          <p className="text-xs text-[#FAF8F5]/60 mt-1">
                            Run{' '}
                            <code className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[#D68C58]">
                              node server/index.mjs
                            </code>{' '}
                            to start the Express API on port 4000 with JSON file DB persistence.
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <input
                            type="text"
                            value={apiUrlInput}
                            onChange={(e) => setApiUrlInput(e.target.value)}
                            placeholder="http://localhost:4000/api"
                            className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-xs font-mono"
                          />
                          <button
                            type="button"
                            disabled={testingConn}
                            onClick={async () => {
                              setTestingConn(true);
                              const mode = await reconnectBackend(apiUrlInput);
                              setTestingConn(false);
                              notify(
                                mode === 'live-api'
                                  ? 'Connected to Live Express API!'
                                  : 'Express server unreachable — using Persistent Local DB'
                              );
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#D68C58] text-[#140F0C] text-xs font-semibold cursor-pointer"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                testingConn ? 'animate-spin' : ''
                              }`}
                            />
                            <span>Test &amp; Reconnect API</span>
                          </button>
                        </div>
                      </div>

                      {/* Admin Username, Email, Display Name & Password Security */}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setPwdMsg(null);
                          setPwdIsError(false);
                          try {
                            const updated = await updateAdminCredentials({
                              currentPassword: curPwd,
                              username: adminUsernameDraft,
                              email: adminEmailDraft,
                              name: adminNameDraft,
                              newPassword: newPwd,
                            });
                            setCurPwd('');
                            setNewPwd('');
                            setLoginEmail(updated.username || updated.email);
                            setPwdIsError(false);
                            setPwdMsg(
                              `Saved! Admin username is now “${updated.username}” (${updated.email}).`
                            );
                            notify('Admin username & security credentials updated');
                          } catch (err) {
                            setPwdIsError(true);
                            setPwdMsg(
                              err instanceof Error
                                ? err.message
                                : 'Failed to update admin credentials'
                            );
                          }
                        }}
                        className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="font-serif text-lg font-medium">
                              Admin Username, Email &amp; Password Security
                            </h4>
                            <p className="text-xs text-[#FAF8F5]/60 mt-0.5">
                              Currently signed in as username:{' '}
                              <strong className="text-[#D68C58]">
                                {adminUser?.username || 'admin'}
                              </strong>{' '}
                              · email:{' '}
                              <strong className="text-white">
                                {adminUser?.email}
                              </strong>
                            </p>
                          </div>
                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-full bg-[#D68C58] hover:bg-[#E19A67] text-[#140F0C] text-xs font-bold cursor-pointer"
                          >
                            Save Username &amp; Credentials
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] text-[#FAF8F5]/70 mb-1">
                              Admin Login Username *
                            </label>
                            <input
                              type="text"
                              required
                              minLength={3}
                              value={adminUsernameDraft}
                              onChange={(e) =>
                                setAdminUsernameDraft(
                                  e.target.value.replace(/\s+/g, '')
                                )
                              }
                              placeholder="e.g., admin or rohan_admin"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#FAF8F5]/70 mb-1">
                              Admin Login Email *
                            </label>
                            <input
                              type="email"
                              required
                              value={adminEmailDraft}
                              onChange={(e) => setAdminEmailDraft(e.target.value)}
                              placeholder="admin@kulhadkaapi.in"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#FAF8F5]/70 mb-1">
                              Admin Display Name
                            </label>
                            <input
                              type="text"
                              value={adminNameDraft}
                              onChange={(e) => setAdminNameDraft(e.target.value)}
                              placeholder="Chai & Kaapi Owner"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] text-[#FAF8F5]/70 mb-1">
                              Current Password (Required to Confirm Changes) *
                            </label>
                            <input
                              type="password"
                              required
                              value={curPwd}
                              onChange={(e) => setCurPwd(e.target.value)}
                              placeholder="Enter current admin password"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#FAF8F5]/70 mb-1">
                              New Password (Optional — leave blank to keep current)
                            </label>
                            <input
                              type="password"
                              value={newPwd}
                              onChange={(e) => setNewPwd(e.target.value)}
                              placeholder="New password (min 6 chars, optional)"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-xs"
                            />
                          </div>
                        </div>

                        {pwdMsg && (
                          <p
                            className={`text-xs font-semibold ${
                              pwdIsError ? 'text-rose-400' : 'text-emerald-300'
                            }`}
                          >
                            {pwdMsg}
                          </p>
                        )}
                      </form>

                      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="font-serif text-lg font-medium">
                            Database Snapshot &amp; Factory Reset
                          </h4>
                          <p className="text-xs text-[#FAF8F5]/60">
                            Export all brand settings, menu items, reviews, orders &amp; members or restore defaults.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={handleExportJson}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Export JSON
                          </button>
                          <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            Import JSON
                            <input
                              type="file"
                              accept="application/json"
                              onChange={handleImportJson}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={async () => {
                              await resetToDefaults();
                              notify('Restored factory default store data');
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 text-xs font-semibold cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset Defaults
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          <AdminMenuModal
            open={menuModalOpen}
            editingItem={editingItem}
            onClose={() => setMenuModalOpen(false)}
            onSave={handleSaveMenuModal}
            onDelete={async (id) => {
              await deleteMenuItem(id);
              notify('Product removed from menu');
            }}
          />
        </div>
      )}
    </AnimatePresence>
  );
};
