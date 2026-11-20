import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  ShoppingBag,
  SlidersHorizontal,
  Clock,
  Megaphone,
  Search,
  User,
  QrCode,
  Languages,
} from 'lucide-react';
import { SOLEN_EASE } from './MotionPrimitives';
import { BrandLogo } from './BrandLogo';
import { useStore } from '../context/StoreContext';
import { UI_COPY } from '../utils/i18n';

interface NavbarProps {
  bagCount: number;
  onOpenBag: () => void;
  onOpenJoin: (plan?: string) => void;
  onOpenAdmin: () => void;
  onOpenAccount: () => void;
  onOpenSearch: () => void;
  onOpenQr: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  bagCount,
  onOpenBag,
  onOpenJoin,
  onOpenAdmin,
  onOpenAccount,
  onOpenSearch,
  onOpenQr,
}) => {
  const {
    store,
    shopStatus,
    adminUser,
    customerUser,
    language,
    setLanguage,
    tableNumberFromQr,
  } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHash, setActiveHash] = useState<string>('');

  const t = UI_COPY[language];
  const unreadAdmin = (store.notifications || []).filter((n) => !n.read).length;

  const navLinks = [
    { label: t.navStory, href: '#craft', show: true },
    { label: t.navSpecialties, href: '#specialties', show: true },
    { label: t.navMenu, href: '#menu', show: true },
    { label: t.navClub, href: '#rewards', show: store.display.showRewardsCalculator },
    { label: t.navVisit, href: '#visit', show: store.locations.length > 0 },
  ].filter((l) => l.show);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 36);
      const sections = ['#craft', '#specialties', '#menu', '#rewards', '#visit'];
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.querySelector(sections[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 180) {
            setActiveHash(sections[i]);
            return;
          }
        }
      }
      setActiveHash('');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      {/* Light Botanical Sage Announcement Bar */}
      <AnimatePresence>
        {(store.brand.announcementEnabled && store.brand.announcementText) ||
        tableNumberFromQr ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#EAF3EE] text-[#144734] border-b border-[#144734]/12 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-center gap-2.5 text-xs font-medium text-center">
              {tableNumberFromQr ? (
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <QrCode className="w-3.5 h-3.5 text-[#C87D28]" />
                  Ordering for Table {tableNumberFromQr} · Express Table Delivery Active
                </span>
              ) : (
                <>
                  <Megaphone className="w-3.5 h-3.5 text-[#C87D28] shrink-0" />
                  <span className="truncate">{store.brand.announcementText}</span>
                </>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Crisp Airy Frosted White Navbar */}
      <div
        className={`transition-all duration-300 ${
          scrolled
            ? 'glass-nav border-b border-[#144734]/10 py-2.5 shadow-[0_8px_30px_rgba(20,71,52,0.06)]'
            : 'bg-white/70 backdrop-blur-md border-b border-[#144734]/[0.06] py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2.5">
            {/* Brand + Live Hours Pill */}
            <div className="flex items-center gap-2.5 min-w-0">
              <a
                href="#"
                className="flex items-center gap-2.5 group rounded-xl shrink-0"
                aria-label={`${store.brand.name} Home`}
              >
                <motion.div
                  whileHover={{ rotate: [-2, 4, 0], scale: 1.06 }}
                  transition={{ duration: 0.35 }}
                >
                  <BrandLogo brand={store.brand} className="w-9 h-9 shadow-xs" />
                </motion.div>
                <div className="flex flex-col leading-none">
                  <span className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-[#15241E]">
                    {store.brand.name}
                  </span>
                  <span className="font-devanagari text-[11px] font-medium mt-0.5 text-[#C87D28]">
                    {store.brand.tagline}
                  </span>
                </div>
              </a>

              <div
                className={`hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium whitespace-nowrap ${
                  shopStatus.isOpen
                    ? 'bg-[#EAF3EE] border-[#144734]/18 text-[#144734]'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    shopStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <Clock className="w-3 h-3 opacity-80" />
                <span>{shopStatus.badgeText}</span>
              </div>
            </div>

            {/* Center Links with Animated Underline */}
            <nav
              aria-label="Primary"
              className="hidden xl:flex items-center gap-1 rounded-full px-2 py-1 bg-[#F4F7F5] border border-[#144734]/10"
            >
              {navLinks.map((item) => {
                const isActive = activeHash === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`relative px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
                      isActive
                        ? 'text-[#144734] font-semibold bg-white shadow-2xs'
                        : 'text-[#52635B] hover:text-[#144734]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="navActiveUnderlineLight"
                        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                        className="absolute inset-x-3.5 bottom-1 h-[2px] rounded-full bg-[#C87D28]"
                      />
                    )}
                  </a>
                );
              })}
            </nav>

            {/* Right Utility & Action Cluster */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={onOpenSearch}
                title="Search Teas & Coffees (Ctrl+K)"
                aria-label="Search beverages"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border bg-white border-[#144734]/14 text-[#15241E] hover:bg-[#F1F6F3] transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenQr}
                title="QR Digital Menu & Table Order"
                aria-label="Open QR Digital Menu"
                className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full border bg-white border-[#144734]/14 text-[#144734] hover:bg-[#F1F6F3] transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                title="Switch English / हिंदी"
                className="hidden md:inline-flex items-center gap-1 px-2.5 h-9 rounded-full border bg-white border-[#144734]/14 text-[#15241E] hover:bg-[#F1F6F3] text-[11px] font-semibold cursor-pointer transition-colors"
              >
                <Languages className="w-3.5 h-3.5 text-[#C87D28]" />
                <span>{language === 'en' ? 'हिंदी' : 'EN'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenAccount}
                className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                  customerUser
                    ? 'bg-[#144734] border-[#144734] text-white'
                    : 'bg-white border-[#144734]/14 text-[#15241E] hover:bg-[#F1F6F3]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden md:inline max-w-[76px] truncate">
                  {customerUser ? customerUser.name.split(' ')[0] : t.myAccount}
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenAdmin}
                title="Open Admin Dashboard (Ctrl+Shift+A)"
                className="relative inline-flex items-center gap-1.5 px-3 h-9 rounded-full border bg-white border-[#144734]/14 text-[#144734] hover:border-[#C87D28] hover:bg-[#F8F4EC] text-xs font-semibold transition-all cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#C87D28]" />
                <span className="hidden 2xl:inline">Admin</span>
                {adminUser && unreadAdmin > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={onOpenBag}
                aria-label={`Open order tray (${bagCount} cups)`}
                className="relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#144734] hover:bg-[#0F3829] text-white transition-colors cursor-pointer shadow-sm"
              >
                <ShoppingBag className="w-[17px] h-[17px]" strokeWidth={2} />
                <AnimatePresence>
                  {bagCount > 0 && (
                    <motion.span
                      key={bagCount}
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.3, opacity: 0 }}
                      className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[#C87D28] text-white text-[11px] font-bold flex items-center justify-center shadow-sm"
                    >
                      {bagCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <button
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                className="xl:hidden inline-flex items-center justify-center w-9 h-9 rounded-full border bg-white border-[#144734]/14 text-[#15241E] cursor-pointer"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Light Airy Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: SOLEN_EASE }}
            className="xl:hidden overflow-hidden border-t backdrop-blur-xl border-[#144734]/12 bg-white/98 text-[#15241E] shadow-xl"
          >
            <div className="px-5 pt-4 pb-6 space-y-3">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-medium bg-[#F1F6F3] text-[#144734]">
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      shopStatus.isOpen ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  {shopStatus.badgeText}
                </span>
                <span className="font-mono text-[11px] text-[#52635B]">
                  {shopStatus.todayScheduleText}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                  className="py-2 rounded-xl border border-[#144734]/15 bg-[#FCFAF7] text-xs font-semibold cursor-pointer"
                >
                  {language === 'en' ? 'हिंदी में देखें' : 'View in English'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenQr();
                  }}
                  className="py-2 rounded-xl border border-[#144734]/15 bg-[#FCFAF7] text-xs font-semibold cursor-pointer"
                >
                  QR Table Menu
                </button>
              </div>

              <div className="space-y-1">
                {navLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 rounded-xl text-base font-medium text-[#15241E] hover:bg-[#F1F6F3]"
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenAccount();
                  }}
                  className="py-3 rounded-full border border-[#144734]/20 bg-white text-[#144734] text-xs font-semibold cursor-pointer"
                >
                  {customerUser ? customerUser.name : 'Sign In / Orders'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenJoin('Daily Tapri Club (Free)');
                  }}
                  className="py-3 rounded-full bg-[#144734] text-white text-xs font-bold cursor-pointer"
                >
                  Free Welcome Cup
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
