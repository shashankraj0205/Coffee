import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Star,
  Gift,
  Clock,
  AlertCircle,
  Coffee,
  ChevronDown,
} from 'lucide-react';
import { SOLEN_EASE } from './MotionPrimitives';
import { useStore } from '../context/StoreContext';
import { SplitWordReveal, MagneticWrap } from './KineticTypography';
import { AmbientParticlesCanvas } from './AmbientParticlesCanvas';
import { UI_COPY } from '../utils/i18n';

interface HeroProps {
  onOpenJoin: (plan?: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenJoin }) => {
  const { store, publicMemberCount, shopStatus, language } = useStore();
  const { brand, rewards } = store;
  const t = UI_COPY[language];
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '8%']);
  const cardY = useTransform(scrollYProgress, [0, 1], ['0%', '-8%']);

  const teaCount = store.menuItems.filter(
    (m) => m.displayed && m.category === 'tea'
  ).length;
  const coffeeCount = store.menuItems.filter(
    (m) => m.displayed && m.category === 'coffee'
  ).length;

  return (
    <section
      ref={heroRef}
      className={`relative min-h-[90vh] flex items-center overflow-hidden sunlit-hero-bg text-[#15241E] ${
        brand.announcementEnabled
          ? 'pt-32 sm:pt-36 pb-16 lg:pb-24'
          : 'pt-28 sm:pt-32 pb-16 lg:pb-24'
      }`}
    >
      {/* Delicate Floating Tea Leaves & Coffee Motes on Sunlit Canvas */}
      <AmbientParticlesCanvas variant="warm" density="low" className="opacity-45" />

      {/* Subtle Light Devanagari Watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -left-6 z-0 font-devanagari text-[9rem] sm:text-[14rem] lg:text-[17rem] font-bold leading-none text-[#144734]/[0.035] select-none"
      >
        चाय
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Live Closed / Busy Notice Bar controlled by Admin */}
        {(!shopStatus.isOpen || shopStatus.isBusy) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-7 px-4 py-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm ${
              !shopStatus.isOpen
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-[#F8F4EC] border-[#C87D28]/35 text-[#15241E]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#C87D28]" />
              <span className="font-medium">{shopStatus.detailText}</span>
            </div>
            <span className="font-mono text-xs text-[#52635B]">
              Today’s Hours: {shopStatus.todayScheduleText}
            </span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Sunlit Editorial Copy Column */}
          <motion.div style={{ y: copyY }} className="lg:col-span-7 space-y-6">
            {/* Namaste Live Status Pill */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: SOLEN_EASE }}
              className="inline-flex flex-wrap items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#F1F6F3] border border-[#144734]/14 shadow-2xs"
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    shopStatus.isOpen ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    shopStatus.isOpen ? 'bg-emerald-600' : 'bg-rose-500'
                  }`}
                />
              </span>
              <span className="text-xs font-semibold text-[#144734] tracking-wide">
                {brand.heroBadge}
              </span>
            </motion.div>

            {/* Oversized Masked Editorial Headline */}
            <h1 className="font-serif text-[2.65rem] sm:text-6xl lg:text-[4.45rem] font-semibold tracking-[-0.03em] leading-[1.02] text-[#15241E]">
              <SplitWordReveal
                text={brand.heroHeadline}
                highlightPhrase={brand.heroHighlightWord}
                highlightColor={brand.accentColor || '#C87D28'}
                delay={0.08}
                immediate
              />
            </h1>

            {/* Devanagari & Pure Beverage Accent */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: SOLEN_EASE }}
              className="flex flex-wrap items-center gap-3 text-sm font-medium text-[#52635B]"
            >
              <span className="font-devanagari text-lg text-[#144734] font-semibold">
                चाय · कॉफी · भारतीय स्वाद
              </span>
              <span className="text-[#C87D28]">•</span>
              <span>
                Exclusively {teaCount} Indian Chais &amp; {coffeeCount} Coffees
              </span>
            </motion.div>

            {/* Supporting Emotional Copy */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.38, ease: SOLEN_EASE }}
              className="text-base sm:text-lg text-[#52635B] leading-relaxed max-w-xl"
            >
              {brand.heroSubhead}
            </motion.p>

            {/* Magnetic Conversion CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.46, ease: SOLEN_EASE }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2"
            >
              <MagneticWrap cursorLabel="EXPLORE">
                <a
                  href="#menu"
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-full bg-[#144734] hover:bg-[#0F3829] text-white text-sm sm:text-base font-semibold transition-all duration-200 shadow-[0_14px_32px_rgba(20,71,52,0.22)]"
                >
                  <Coffee className="w-4 h-4 text-[#F0C97A]" />
                  <span>{t.exploreMenu}</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </a>
              </MagneticWrap>

              <MagneticWrap cursorLabel="ORDER">
                <button
                  type="button"
                  onClick={() => onOpenJoin('Daily Tapri Club (Free)')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-white hover:bg-[#F8F4EC] border border-[#144734]/18 text-[#144734] text-sm sm:text-base font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#C87D28]" />
                  <span>{t.claimFreeCup}</span>
                </button>
              </MagneticWrap>
            </motion.div>

            {/* Trust & Live Bar Hours Strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.75, delay: 0.58 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-5 border-t border-[#144734]/12"
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[
                    { initials: 'AS', bg: '#144734' },
                    { initials: 'RK', bg: '#C87D28' },
                    { initials: 'MI', bg: '#2B624B' },
                    { initials: 'KM', bg: '#1E352B' },
                  ].map((m) => (
                    <span
                      key={m.initials}
                      style={{ backgroundColor: m.bg }}
                      className="w-8 h-8 rounded-full border-2 border-white text-[11px] font-semibold text-white flex items-center justify-center shadow-xs"
                    >
                      {m.initials}
                    </span>
                  ))}
                </div>
                <div className="text-xs leading-snug">
                  <div className="flex items-center gap-1 font-semibold text-[#15241E]">
                    <Star className="w-3.5 h-3.5 fill-[#C87D28] text-[#C87D28]" />
                    <span>4.95</span>
                    <span className="font-normal text-[#52635B]">
                      (4,200+ reviews)
                    </span>
                  </div>
                  <p className="text-[#52635B]">
                    {(publicMemberCount + 52000).toLocaleString()}+ Tapri Members
                  </p>
                </div>
              </div>

              <div className="hidden sm:block h-8 w-px bg-[#144734]/12" />

              <div className="flex items-center gap-2 text-xs text-[#52635B]">
                <Clock className="w-4 h-4 text-[#C87D28]" />
                <span>
                  <strong className="text-[#144734]">{shopStatus.badgeText}</strong> ·{' '}
                  {shopStatus.todayScheduleText}
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Sunlit Arched Beverage Photography + Soft Rising Steam */}
          <motion.div
            style={{ y: cardY }}
            className="lg:col-span-5 relative pb-6 sm:pb-0"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.18, ease: SOLEN_EASE }}
              className="relative"
            >
              {/* Arched Editorial Photo Frame */}
              <div
                data-cursor="VIEW"
                className="relative rounded-t-[3.5rem] rounded-b-[2rem] overflow-hidden border border-[#144734]/14 shadow-[0_28px_70px_-15px_rgba(20,71,52,0.18)] bg-white aspect-[4/4.4] sm:aspect-[4/3.9] lg:aspect-[4/4.6]"
              >
                <img
                  src={brand.heroImage || '/images/indian-hero-chai-kaapi.jpg'}
                  alt={`${brand.name} steaming terracotta kulhad masala chai and brass South Indian filter coffee`}
                  className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-[1.04]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/30 via-transparent to-transparent"
                />

                {/* Animated Rising Steam Plumes */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-[20%] flex justify-around px-10"
                >
                  <span className="steam-plume w-7 h-20 rounded-full bg-white/35 blur-lg" />
                  <span className="steam-plume-delayed w-8 h-24 rounded-full bg-white/30 blur-xl" />
                  <span className="steam-plume-slow w-7 h-20 rounded-full bg-white/35 blur-lg" />
                </div>

                {/* Top-Left Crisp White Frosted Badge */}
                <div className="absolute top-4 left-4 glass-card-light rounded-full px-3.5 py-1.5 flex items-center gap-2 text-[11px] font-semibold text-[#15241E] shadow-sm">
                  <span className="font-devanagari text-[#144734] font-bold">
                    चाय
                  </span>
                  <span className="text-[#C87D28]">·</span>
                  <span>Kulhad &amp; Brass Davara · From ₹40</span>
                </div>
              </div>

              {/* Floating Light Frosted Chai Coins Reward Card */}
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{
                  duration: 5.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -bottom-5 left-3 right-3 sm:left-auto sm:-right-4 sm:bottom-5 sm:max-w-[290px] bg-white/95 backdrop-blur-xl border border-[#144734]/14 rounded-2xl p-4 text-[#15241E] shadow-[0_20px_48px_rgba(20,71,52,0.16)]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-[#EAF3EE] border border-[#144734]/15 flex items-center justify-center text-[#144734]">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#C87D28] font-semibold">
                        Tapri Rewards
                      </span>
                      <span className="font-devanagari text-[11px] text-[#144734] font-semibold">
                        नमस्ते
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#15241E] mt-0.5">
                      +{rewards.welcomeBonusBeans} Chai Coins Free
                    </p>
                    <p className="text-[11px] text-[#52635B] mt-0.5 leading-snug">
                      Use code <strong className="text-[#144734]">FIRSTCHAI</strong> for
                      20% off your first chai or coffee!
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Cue */}
        <motion.a
          href="#craft"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.6 }}
          className="hidden lg:inline-flex items-center gap-2 mt-10 font-mono text-[10px] uppercase tracking-[0.24em] text-[#52635B] hover:text-[#144734] transition-colors"
        >
          <span>{t.heroScrollCue}</span>
          <motion.span
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            <ChevronDown className="w-4 h-4 text-[#C87D28]" />
          </motion.span>
        </motion.a>
      </div>
    </section>
  );
};
