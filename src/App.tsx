import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { MotionConfig, AnimatePresence, motion } from 'framer-motion';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles, Coffee, ShoppingBag } from 'lucide-react';
import {
  CartCustomization,
  CartItemLine,
  CustomerOrder,
  MenuItem,
} from './types/store';
import { StoreProvider, useStore } from './context/StoreContext';
import { apiClient } from './services/api';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { SocialProof } from './components/SocialProof';
import { ScrollStorySection } from './components/ScrollStorySection';
import { SpecialtiesSection } from './components/SpecialtiesSection';
import { ProductShowcase } from './components/ProductShowcase';
import { Features } from './components/Features';
import { ReachAndEarn } from './components/ReachAndEarn';
import { Testimonials } from './components/Testimonials';
import { Pricing } from './components/Pricing';
import { FAQ } from './components/FAQ';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';
import { TastingBagDrawer } from './components/TastingBagDrawer';
import { JoinModal } from './components/JoinModal';
import { AdminConsole, AdminTab } from './components/AdminConsole';
import { CustomerAccountModal } from './components/CustomerAccountModal';
import { SearchOverlay } from './components/SearchOverlay';
import { QrMenuModal } from './components/QrMenuModal';
import { SupportModal } from './components/SupportModal';
import { CinematicPreloader } from './components/CinematicPreloader';
import { CustomCursor } from './components/CustomCursor';
import { SOLEN_EASE } from './components/MotionPrimitives';
import {
  getUnitPriceForSize,
  ORDER_STATUS_META,
  SUGAR_OPTIONS,
  STRENGTH_OPTIONS,
} from './utils/commerce';

gsap.registerPlugin(ScrollTrigger);

const GUEST_CART_KEY = 'kulhad_guest_cart_v2';

function makeLineKey(itemId: string, custom: CartCustomization): string {
  return [
    itemId,
    custom.size,
    custom.temperature,
    custom.sugarPreference,
    custom.milkStrength,
    custom.specialInstructions.trim().toLowerCase(),
  ].join('|');
}

function StorefrontShell() {
  const {
    store,
    customerUser,
    activeTrackedOrder,
    refreshCustomerHub,
  } = useStore();

  const [cartLines, setCartLines] = useState<CartItemLine[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [bagOpen, setBagOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('menu');
  const [adminEditProduct, setAdminEditProduct] = useState<MenuItem | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Daily Tapri Club (Free)');
  const [externalProduct, setExternalProduct] = useState<MenuItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const anyModalOpen =
    bagOpen ||
    joinOpen ||
    adminOpen ||
    accountOpen ||
    searchOpen ||
    qrOpen ||
    supportOpen;

  // Persistent Lenis smooth scrolling instance (pauses/resumes cleanly without scroll jump)
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    if (isReduced || isCoarse) return;

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 0.95,
    });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!target) return;
      const hash = target.getAttribute('href');
      if (!hash || hash === '#') return;
      const el = document.querySelector(hash) as HTMLElement | null;
      if (el) {
        e.preventDefault();
        lenis.scrollTo(el, { offset: -76 });
      }
    };
    document.addEventListener('click', onAnchorClick);

    return () => {
      document.removeEventListener('click', onAnchorClick);
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!lenisRef.current) return;
    if (anyModalOpen) lenisRef.current.stop();
    else lenisRef.current.start();
  }, [anyModalOpen]);

  // Persist guest cart & sync logged-in user cart with backend
  useEffect(() => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartLines));
    if (customerUser) {
      apiClient.syncCartToServer(cartLines).catch(() => {});
    }
  }, [cartLines, customerUser]);

  // Merge saved server cart when customer logs in
  useEffect(() => {
    if (!customerUser) return;
    refreshCustomerHub()
      .then((serverCart) => {
        if (serverCart.length > 0) {
          setCartLines((prev) => {
            const map = new Map<string, CartItemLine>();
            for (const item of [...serverCart, ...prev]) {
              const ex = map.get(item.lineKey);
              if (ex)
                map.set(item.lineKey, {
                  ...ex,
                  quantity: Math.max(ex.quantity, item.quantity),
                });
              else map.set(item.lineKey, item);
            }
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
  }, [customerUser?.id, refreshCustomerHub]);

  // Open shared drink URL (?drink=masala-chai) automatically
  useEffect(() => {
    const drinkId = new URLSearchParams(window.location.search).get('drink');
    if (!drinkId || store.menuItems.length === 0) return;
    const found = store.menuItems.find((m) => m.id === drinkId);
    if (found) setExternalProduct(found);
  }, [store.menuItems]);

  // Keyboard shortcuts: Ctrl+K Search, Ctrl+Shift+A Admin Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'a'
      ) {
        e.preventDefault();
        setAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const totalBagCount = useMemo(() => {
    return cartLines.reduce((sum, line) => {
      const exists = store.menuItems.find((m) => m.id === line.itemId);
      if (!exists) return sum;
      return sum + line.quantity;
    }, 0);
  }, [cartLines, store.menuItems]);

  const totalBagSubtotal = useMemo(() => {
    return cartLines.reduce((sum, line) => {
      const item = store.menuItems.find((m) => m.id === line.itemId);
      if (!item) return sum;
      return sum + getUnitPriceForSize(item, line.size) * line.quantity;
    }, 0);
  }, [cartLines, store.menuItems]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2600);
  }, []);

  const handleOpenJoin = useCallback((plan = 'Daily Tapri Club (Free)') => {
    setSelectedPlan(plan);
    setJoinOpen(true);
  }, []);

  const handleAddToBag = useCallback(
    (item: MenuItem, customPatch?: Partial<CartCustomization>) => {
      const custom: CartCustomization = {
        size: customPatch?.size || 'Medium',
        temperature:
          customPatch?.temperature ||
          (item.defaultTemp === 'cold' ? 'cold' : 'hot'),
        sugarPreference: customPatch?.sugarPreference || SUGAR_OPTIONS[0],
        milkStrength: customPatch?.milkStrength || STRENGTH_OPTIONS[0],
        specialInstructions: customPatch?.specialInstructions || '',
      };
      const lineKey = makeLineKey(item.id, custom);
      const unitPrice = getUnitPriceForSize(item, custom.size);

      let hitCap = false;
      setCartLines((prev) => {
        const existing = prev.find((l) => l.lineKey === lineKey);
        if (existing) {
          if (existing.quantity >= item.stockCount) {
            hitCap = true;
            return prev;
          }
          return prev.map((l) =>
            l.lineKey === lineKey ? { ...l, quantity: l.quantity + 1 } : l
          );
        }
        return [...prev, { ...custom, lineKey, itemId: item.id, quantity: 1 }];
      });

      if (hitCap) {
        showToast(`Max daily stock (${item.stockCount}) already in tray`);
      } else {
        showToast(
          `Added ${item.name} (${custom.size}) · ₹${unitPrice} (+${item.beansEarned} Coins)`
        );
      }
    },
    [showToast]
  );

  const handleReorder = useCallback(
    (order: CustomerOrder) => {
      const newLines: CartItemLine[] = [];
      for (const it of order.items) {
        const live = store.menuItems.find((m) => m.id === it.itemId);
        if (!live || !live.available || live.stockCount <= 0) continue;
        const custom: CartCustomization = {
          size: it.size || 'Medium',
          temperature: it.temperature || 'hot',
          sugarPreference: it.sugarPreference || SUGAR_OPTIONS[0],
          milkStrength: it.milkStrength || STRENGTH_OPTIONS[0],
          specialInstructions: it.specialInstructions || '',
        };
        newLines.push({
          ...custom,
          lineKey: makeLineKey(it.itemId, custom),
          itemId: it.itemId,
          quantity: Math.min(it.quantity, live.stockCount),
        });
      }
      if (newLines.length > 0) {
        setCartLines(newLines);
        setBagOpen(true);
        showToast(`Loaded Order #${order.orderNumber} into your tray!`);
      } else {
        showToast('Items from that order are currently sold out.');
      }
    },
    [store.menuItems, showToast]
  );

  const handleUpdateQty = useCallback(
    (lineKey: string, delta: number) => {
      setCartLines((prev) =>
        prev
          .map((line) => {
            if (line.lineKey !== lineKey) return line;
            const liveItem = store.menuItems.find((m) => m.id === line.itemId);
            const maxStock = liveItem ? Math.max(1, liveItem.stockCount) : 20;
            return {
              ...line,
              quantity: Math.min(maxStock, line.quantity + delta),
            };
          })
          .filter((line) => line.quantity > 0)
      );
    },
    [store.menuItems]
  );

  const handleRemoveLine = useCallback((lineKey: string) => {
    setCartLines((prev) => prev.filter((l) => l.lineKey !== lineKey));
  }, []);

  const handleClearBag = useCallback(() => {
    setCartLines([]);
  }, []);

  const { display } = store;

  const showLiveOrderPill =
    activeTrackedOrder &&
    !['delivered', 'cancelled'].includes(activeTrackedOrder.status);

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFAF7] text-[#15241E]">
      {/* Short Skippable Cinematic Preloader (once per session) */}
      <CinematicPreloader />

      {/* Desktop Custom Interactive Cursor (auto-disabled on touch/mobile) */}
      <CustomCursor enabled={!anyModalOpen} />

      <Navbar
        bagCount={totalBagCount}
        onOpenBag={() => setBagOpen(true)}
        onOpenJoin={handleOpenJoin}
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenQr={() => setQrOpen(true)}
      />

      <main className="flex-1">
        {/* 1. Full-Screen Cinematic Hero with Rising Steam & Particles */}
        <Hero onOpenJoin={handleOpenJoin} />

        {/* 2. Press & Animated Rolling Milestones */}
        <SocialProof />

        {/* 3. GSAP ScrollTrigger 4-Chapter Sunlit Indian Beverage Storytelling */}
        <ScrollStorySection onOpenJoin={handleOpenJoin} />

        {/* 4. Horizontal Signature Specialties Showcase */}
        <SpecialtiesSection
          onAddToBag={handleAddToBag}
          onInspectItem={(item) => setExternalProduct(item)}
        />

        {/* 5. Complete 22-Item Tea & Coffee Interactive Menu */}
        <ProductShowcase
          onAddToBag={handleAddToBag}
          externalSelectedProduct={externalProduct}
          onClearExternalSelected={() => setExternalProduct(null)}
          onAdminEditProduct={(item) => {
            setAdminTab('menu');
            setAdminEditProduct(item);
            setAdminOpen(true);
          }}
          onAdminOpenProducts={() => {
            setAdminTab('menu');
            setAdminEditProduct(null);
            setAdminOpen(true);
          }}
        />

        {/* 7. Immersive Indian Café Interior & Botanical Craft Bento */}
        <Features onOpenJoin={handleOpenJoin} />

        {/* 8. Tapri Reach & Earn Rewards Calculator */}
        {display.showRewardsCalculator && (
          <ReachAndEarn onOpenJoin={handleOpenJoin} />
        )}

        {/* 9. Community Reviews, Memberships, FAQ & Conversion CTA */}
        {display.showTestimonials && <Testimonials />}
        {display.showPricing && <Pricing onSelectPlan={handleOpenJoin} />}
        {display.showFaq && <FAQ onOpenJoin={handleOpenJoin} />}
        <FinalCTA />
      </main>

      <Footer
        onOpenJoin={handleOpenJoin}
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
        onOpenQr={() => setQrOpen(true)}
      />

      {/* Complete E-Commerce Cart, Checkout, Razorpay Verification & 7-Stage Order Tracker */}
      <TastingBagDrawer
        open={bagOpen}
        lines={cartLines}
        onClose={() => setBagOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveLine={handleRemoveLine}
        onClearBag={handleClearBag}
        onOpenAccount={() => {
          setBagOpen(false);
          setAccountOpen(true);
        }}
      />

      {/* Customer Auth, Profile, Saved Addresses, Order History & Reorder Hub */}
      <CustomerAccountModal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onReorderOrder={handleReorder}
        onQuickAddProduct={(item) => handleAddToBag(item)}
      />

      {/* Search Overlay (Ctrl+K) */}
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectProduct={(item) => setExternalProduct(item)}
        onQuickAdd={(item) => handleAddToBag(item)}
      />

      {/* QR Digital Menu & Table Ordering */}
      <QrMenuModal open={qrOpen} onClose={() => setQrOpen(false)} />

      {/* Customer Support & WhatsApp Desk */}
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />

      {/* Tapri Club Quick Free Welcome Cup Modal */}
      <JoinModal
        open={joinOpen}
        selectedPlan={selectedPlan}
        onClose={() => setJoinOpen(false)}
      />

      {/* Full-Stack Admin Dashboard & Dedicated Product Control Center */}
      <AdminConsole
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        initialTab={adminTab}
        initialEditProduct={adminEditProduct}
        onClearInitialEditProduct={() => setAdminEditProduct(null)}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.28, ease: SOLEN_EASE }}
            className="fixed bottom-5 left-5 right-5 sm:right-auto z-40 max-w-sm"
          >
            <button
              type="button"
              onClick={() => {
                setToastMessage(null);
                setBagOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white text-[#15241E] shadow-[0_16px_40px_rgba(20,71,52,0.18)] border border-[#144734]/20 cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold">
                <Sparkles className="w-4 h-4 text-[#C87D28] shrink-0" />
                <span>{toastMessage}</span>
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#144734] font-bold underline shrink-0">
                View Tray
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Cart & Live Order Status Indicator */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        <AnimatePresence>
          {showLiveOrderPill && !bagOpen && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              onClick={() => setBagOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-[#144734] border border-[#144734]/25 shadow-lg text-xs font-semibold cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Coffee className="w-3.5 h-3.5 text-[#C87D28]" />
              <span className="font-mono font-bold">{activeTrackedOrder.orderNumber}</span>
              <span className="text-[#52635B]">
                · {ORDER_STATUS_META[activeTrackedOrder.status]?.label}
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {totalBagCount > 0 && !bagOpen && !toastMessage && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.92 }}
              onClick={() => setBagOpen(true)}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full bg-[#144734] hover:bg-[#0F3829] text-white shadow-[0_14px_32px_rgba(20,71,52,0.28)] text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#F0C97A]" />
              <span>
                {totalBagCount} {totalBagCount === 1 ? 'Cup' : 'Cups'} · ₹
                {totalBagSubtotal}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <StorefrontShell />
      </StoreProvider>
    </MotionConfig>
  );
}

export default App;
