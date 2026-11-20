import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../context/StoreContext';
import { SOLEN_EASE } from './MotionPrimitives';

const PRELOADER_SESSION_KEY = 'kulhad_preloader_seen_v1';

export const CinematicPreloader: React.FC = () => {
  const { store } = useStore();
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    return !sessionStorage.getItem(PRELOADER_SESSION_KEY);
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const duration = 1150;
    const start = performance.now();

    const tick = (now: number) => {
      // rAF's timestamp can precede `start`, which made the first frame negative.
      const pct = Math.max(0, Math.min(100, Math.round(((now - start) / duration) * 100)));
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => {
          sessionStorage.setItem(PRELOADER_SESSION_KEY, '1');
          setVisible(false);
        }, 180);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const handleSkip = () => {
    sessionStorage.setItem(PRELOADER_SESSION_KEY, '1');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.72, ease: SOLEN_EASE }}
          className="fixed inset-0 z-[120] bg-[#FCFAF7] text-[#15241E] flex flex-col items-center justify-center px-6 select-none overflow-hidden border-b border-[#144734]/15"
        >
          {/* Warm Ambient Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute w-[420px] h-[420px] rounded-full bg-[#E68A24]/15 blur-[110px]"
          />

          <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
            {/* Animated Steaming Terracotta Kulhad + Orbiting Coffee Beans */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Progressive Coffee Beans Arc */}
              {[0, 1, 2, 3, 4].map((idx) => {
                const angle = (-150 + idx * 30) * (Math.PI / 180);
                const bx = Math.cos(angle) * 52;
                const by = Math.sin(angle) * 52;
                const show = progress >= (idx + 1) * 18;
                return (
                  <motion.span
                    key={idx}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={
                      show
                        ? { scale: 1, opacity: 0.9 }
                        : { scale: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.3, ease: SOLEN_EASE }}
                    style={{
                      transform: `translate(${bx}px, ${by}px) rotate(${idx * 35}deg)`,
                    }}
                    className="absolute w-3.5 h-2.5 rounded-full bg-[#6F4028] border border-[#D9A441]/60 flex items-center justify-center"
                  >
                    <span className="w-2.5 h-[1px] bg-[#24150D] rounded-full" />
                  </motion.span>
                );
              })}

              {/* Steaming Kulhad SVG */}
              <svg
                viewBox="0 0 88 88"
                className="w-24 h-24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Animated Steam Plumes */}
                <motion.path
                  d="M34 32C31 25 38 22 35 14"
                  stroke="#D9A441"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0.2, 0.9, 0.3] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                />
                <motion.path
                  d="M45 30C42 22 50 18 46 10"
                  stroke="#FFF9F0"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.25, delay: 0.15, repeat: Infinity }}
                />
                <motion.path
                  d="M55 32C52 26 59 22 56 15"
                  stroke="#E68A24"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0.2, 0.85, 0.2] }}
                  transition={{ duration: 1.15, delay: 0.3, repeat: Infinity }}
                />

                {/* Terracotta Kulhad Body */}
                <path
                  d="M24 38H64L59 69C58.4 72.5 55.4 75 51.8 75H36.2C32.6 75 29.6 72.5 29 69L24 38Z"
                  fill="#B85A29"
                  stroke="#D9A441"
                  strokeWidth="1.5"
                />
                {/* Subtle clay horizontal ribs */}
                <path
                  d="M27.5 50H60.5M28.8 59H59.2"
                  stroke="#3B2418"
                  strokeOpacity="0.32"
                  strokeWidth="1.3"
                />
                {/* Rim & Masala Chai Surface */}
                <ellipse cx="44" cy="38" rx="20.2" ry="5.5" fill="#F5EBDD" />
                <ellipse cx="44" cy="38" rx="16.5" ry="3.8" fill="#6F4028" />
                <ellipse cx="42" cy="37.5" rx="7" ry="1.4" fill="#D9A441" fillOpacity="0.45" />
              </svg>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="font-devanagari text-2xl text-[#E68A24] font-semibold mt-2"
            >
              नमस्ते
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#144734] mt-1"
            >
              {store.brand.name}
            </motion.h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#52635B] mt-2">
              Brewing India’s Finest Chai &amp; Coffee
            </p>

            {/* Progress Bar */}
            <div className="mt-7 w-full max-w-[240px] space-y-2">
              <div className="h-[3px] w-full rounded-full bg-[#144734]/12 overflow-hidden">
                <div
                  style={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-[#144734] to-[#C87D28] transition-all duration-100"
                />
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] text-[#52635B]">
                <span>100% TEA &amp; COFFEE</span>
                <span>{progress}%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-[#52635B]/75 hover:text-[#144734] transition-colors cursor-pointer"
            >
              Skip Intro →
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
