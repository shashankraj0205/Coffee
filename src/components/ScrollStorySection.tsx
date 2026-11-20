import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Coffee, Compass, Sparkles, ArrowUpRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SOLEN_EASE } from './MotionPrimitives';

gsap.registerPlugin(ScrollTrigger);

interface StoryChapter {
  id: string;
  num: string;
  hindi: string;
  kicker: string;
  title: string;
  copy: string;
  statLabel: string;
  statValue: string;
  image: string;
  bgTone: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CHAPTERS: StoryChapter[] = [
  {
    id: 'art-of-chai',
    num: '01',
    hindi: 'चाय',
    kicker: 'THE ART OF CHAI · UPPER ASSAM',
    title: 'Freshly pounded ginger, cardamom & slow-simmered brass kettles.',
    copy: 'Every morning at 6:30 AM, our chai masters crush whole Wayanad ginger, Idukki green cardamom, and cinnamon bark — simmering bold second-flush Assam CTC leaves with farm-fresh milk until rich, amber, and unmistakably kadak.',
    statLabel: 'Boiling Ritual',
    statValue: '96°C Brass Patila',
    image:
      'https://images.pexels.com/photos/12865880/pexels-photo-12865880.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
    bgTone: '#FFFFFF',
    icon: Flame,
  },
  {
    id: 'earth-and-fire',
    num: '02',
    hindi: 'कुल्हड़',
    kicker: 'EARTH & TANDOOR FIRE · JAIPUR POTTERY',
    title: 'Kiln-fired clay kulhads that turn every sip into petrichor nostalgia.',
    copy: 'From sizzling red-hot Tandoori Chai foaming over charcoal-heated clay pots to timeless railway-style Kulhad Chai, our biodegradable natural terracotta vessels gently balance tea warmth with earthy Indian soul.',
    statLabel: 'Earthen Vessels',
    statValue: '100% Natural Clay',
    image:
      'https://images.pexels.com/photos/36662612/pexels-photo-36662612.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
    bgTone: '#F8F5EF',
    icon: Sparkles,
  },
  {
    id: 'filter-kaapi',
    num: '03',
    hindi: 'कॉफी',
    kicker: 'CHIKMAGALUR & COORG · 80:20 ROAST',
    title: 'Slow-dripped brass decoction pulled yard-high into thick velvet froth.',
    copy: 'Born in the misty hills of Chikmagalur and Baba Budangiri. Whether you crave authentic brass-davara South Indian Filter Coffee, a double-shot Cappuccino, or thick café-style Cold Coffee, every bean is freshly ground to order.',
    statLabel: 'Estate Origin',
    statValue: '1,550m Karnataka',
    image: '/images/indian-hero-chai-kaapi.jpg',
    bgTone: '#F1F6F3',
    icon: Coffee,
  },
  {
    id: 'indian-sanctuary',
    num: '04',
    hindi: 'सुकून',
    kicker: 'SUNLIT INDIAN CAFÉ EXPERIENCE',
    title: 'Sandstone arches, warm brass glow & unhurried chai pe charcha.',
    copy: 'Inspired by India’s iconic tapris and classic coffee houses — elevated with sunlit arches, natural textures, calm seating, and a strict promise: only India’s finest tea and coffee, never distracting food clutter.',
    statLabel: 'Menu Purity',
    statValue: '22 Pure Beverages',
    image: '/images/indian-cafe-interior.jpg',
    bgTone: '#FCFAF7',
    icon: Compass,
  },
];

export const ScrollStorySection: React.FC<{
  onOpenJoin: (plan?: string) => void;
}> = ({ onOpenJoin }) => {
  const { store } = useStore();
  const sectionRef = useRef<HTMLElement>(null);
  const watermarkRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      if (watermarkRef.current && sectionRef.current) {
        gsap.to(watermarkRef.current, {
          xPercent: -16,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.2,
          },
        });
      }

      const cards = gsap.utils.toArray<HTMLElement>('.story-chapter-trigger');
      cards.forEach((card, idx) => {
        ScrollTrigger.create({
          trigger: card,
          start: 'top 55%',
          end: 'bottom 45%',
          onEnter: () => setActiveIndex(idx),
          onEnterBack: () => setActiveIndex(idx),
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const activeChapter = CHAPTERS[activeIndex] || CHAPTERS[0];

  return (
    <section
      id="craft"
      ref={sectionRef}
      style={{ backgroundColor: activeChapter.bgTone }}
      className="relative text-[#15241E] transition-colors duration-700 overflow-x-clip border-b border-[#144734]/10"
    >
      {/* Subtle Light Editorial Watermark */}
      <div
        ref={watermarkRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-14 left-0 whitespace-nowrap font-serif font-bold text-[5.5rem] sm:text-[9rem] lg:text-[12rem] leading-none text-[#144734]/[0.035] select-none tracking-tight"
      >
        THE ART OF CHAI · चाय · FILTER COFFEE · कॉफी · INDIAN FLAVOURS
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        {/* Section Intro */}
        <div className="max-w-3xl mb-14 lg:mb-18">
          <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-[#144734] font-semibold">
            <span className="w-7 h-px bg-[#C87D28]" />
            Our Story · About {store.brand.name}
          </span>
          <h2 className="mt-4 font-serif text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.025em] leading-[1.05] text-[#15241E]">
            Four chapters of{' '}
            <span className="font-semibold text-[#C87D28]">
              authentic Indian beverage craft.
            </span>
          </h2>
        </div>

        {/* Sticky Split Storytelling Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Sticky Sunlit Photograph */}
          <div className="lg:col-span-6 lg:sticky lg:top-28">
            <div className="relative rounded-[2.25rem] overflow-hidden border border-[#144734]/12 shadow-[0_26px_65px_-15px_rgba(20,71,52,0.16)] aspect-[4/3.6] bg-white">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeChapter.id}
                  src={activeChapter.image}
                  alt={activeChapter.title}
                  initial={{ opacity: 0.35, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0.25, scale: 0.98 }}
                  transition={{ duration: 0.55, ease: SOLEN_EASE }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Clean floating white caption card */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/94 backdrop-blur-md border border-[#144734]/12 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-[#EAF3EE] text-[#144734] font-devanagari text-lg font-bold flex items-center justify-center shrink-0">
                    {activeChapter.hindi}
                  </span>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C87D28] font-semibold">
                      Chapter {activeChapter.num} · {activeChapter.statLabel}
                    </p>
                    <p className="font-serif text-base sm:text-lg font-semibold text-[#15241E]">
                      {activeChapter.statValue}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {CHAPTERS.map((c, idx) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-label={`Jump to chapter ${c.num}`}
                      onClick={() => setActiveIndex(idx)}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === activeIndex
                          ? 'w-6 bg-[#144734]'
                          : 'w-2 bg-[#144734]/20 hover:bg-[#144734]/45'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Clean Light Story Cards */}
          <div className="lg:col-span-6 space-y-6 lg:space-y-10">
            {CHAPTERS.map((chapter, idx) => {
              const Icon = chapter.icon;
              const isActive = idx === activeIndex;
              return (
                <motion.div
                  key={chapter.id}
                  onClick={() => setActiveIndex(idx)}
                  data-cursor="EXPLORE"
                  initial={{ opacity: 0.5, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.55, ease: SOLEN_EASE }}
                  className={`story-chapter-trigger p-6 sm:p-8 rounded-3xl border transition-all duration-400 cursor-pointer ${
                    isActive
                      ? 'bg-white border-[#144734]/28 shadow-[0_18px_44px_rgba(20,71,52,0.09)]'
                      : 'bg-white/75 border-[#144734]/10 opacity-75 hover:opacity-100 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#144734] font-semibold">
                      <Icon className="w-4 h-4 text-[#C87D28]" />
                      <span>
                        {chapter.num} · {chapter.kicker}
                      </span>
                    </span>
                    <span className="font-devanagari text-xl font-semibold text-[#C87D28]">
                      {chapter.hindi}
                    </span>
                  </div>

                  <h3 className="font-serif text-2xl sm:text-3xl font-semibold leading-snug text-[#15241E]">
                    {chapter.title}
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-[#52635B] leading-relaxed">
                    {chapter.copy}
                  </p>

                  {idx === CHAPTERS.length - 1 && (
                    <div className="mt-6 pt-5 border-t border-[#144734]/10 flex flex-wrap items-center gap-3">
                      <a
                        href="#menu"
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#144734] hover:bg-[#0F3829] text-white text-xs font-semibold transition-colors"
                      >
                        <span>Explore All 22 Beverages</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenJoin('Daily Tapri Club (Free)');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#F1F6F3] hover:bg-[#E2EFE8] text-[#144734] text-xs font-semibold cursor-pointer"
                      >
                        Claim Free Welcome Cup
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Light Kinetic Editorial Typography Ribbon */}
      <div className="py-10 bg-[#F4F7F5] border-t border-[#144734]/10 overflow-hidden select-none">
        <div className="flex items-center gap-8 w-max animate-marquee-slow font-serif text-2xl sm:text-4xl font-semibold tracking-tight text-[#144734]/22">
          {[...Array(2)].map((_, rep) => (
            <React.Fragment key={rep}>
              <span className="font-devanagari text-[#C87D28]/60">चाय</span>
              <span>MASALA CHAI</span>
              <span>•</span>
              <span>KULHAD CHAI</span>
              <span>•</span>
              <span>TANDOORI CHAI</span>
              <span>•</span>
              <span className="font-devanagari text-[#144734]/55">कॉफी</span>
              <span>FILTER COFFEE</span>
              <span>•</span>
              <span>KASHMIRI KAHWA</span>
              <span>•</span>
              <span>COLD COFFEE</span>
              <span>•</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
