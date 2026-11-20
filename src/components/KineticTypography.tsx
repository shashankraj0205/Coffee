import React, { useRef, useState, useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
  AnimatePresence,
} from 'framer-motion';
import { SOLEN_EASE } from './MotionPrimitives';

/* =========================================================
   1. SplitWordReveal — Masked Word-by-Word Editorial Entrance
   ========================================================= */
interface SplitWordRevealProps {
  text: string;
  highlightPhrase?: string;
  highlightColor?: string;
  className?: string;
  delay?: number;
  immediate?: boolean;
}

export const SplitWordReveal: React.FC<SplitWordRevealProps> = ({
  text,
  highlightPhrase,
  highlightColor = '#E68A24',
  className = '',
  delay = 0,
  immediate = false,
}) => {
  const words = text.split(' ');
  const hlLower = highlightPhrase?.trim().toLowerCase() || '';

  return (
    <span className={`inline-block ${className}`}>
      {words.map((word, idx) => {
        const cleanWord = word.toLowerCase();
        const isHighlighted =
          hlLower.length > 0 &&
          hlLower
            .split(' ')
            .some(
              (h) =>
                h.length > 2 &&
                (cleanWord.includes(h) || h.includes(cleanWord.replace(/[^a-z]/g, '')))
            );

        return (
          <span
            key={`${word}-${idx}`}
            className="inline-block overflow-hidden align-bottom mr-[0.26em] pb-[0.06em]"
          >
            <motion.span
              className={`inline-block ${isHighlighted ? 'font-bold' : ''}`}
              style={isHighlighted ? { color: highlightColor } : undefined}
              initial={{ y: '108%', opacity: 0 }}
              animate={immediate ? { y: '0%', opacity: 1 } : undefined}
              whileInView={immediate ? undefined : { y: '0%', opacity: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.68,
                delay: delay + idx * 0.045,
                ease: SOLEN_EASE,
              }}
            >
              {word}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
};

/* =========================================================
   2. AnimatedCounter — Smooth Scroll-Triggered Number Countup
   ========================================================= */
interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const duration = 950;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
};

/* =========================================================
   3. AnimatedPrice — Rolling Price Transition on Size Change
   ========================================================= */
export const AnimatedPrice: React.FC<{
  price: number;
  className?: string;
}> = ({ price, className = '' }) => (
  <span className={`inline-flex items-baseline overflow-hidden ${className}`}>
    <span>₹</span>
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={price}
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -14, opacity: 0 }}
        transition={{ duration: 0.24, ease: SOLEN_EASE }}
        className="inline-block"
      >
        {price}
      </motion.span>
    </AnimatePresence>
  </span>
);

/* =========================================================
   4. MagneticButton — Tactile Magnetic Cursor Attraction
   ========================================================= */
interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  cursorLabel?: string;
}

export const MagneticWrap: React.FC<MagneticButtonProps> = ({
  children,
  className = '',
  strength = 0.24,
  cursorLabel,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 20, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 260, damping: 20, mass: 0.4 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || window.matchMedia('(pointer: coarse)').matches) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      data-cursor={cursorLabel}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
};

/* =========================================================
   5. TiltCard3D — GPU-Friendly 3D Perspective Card + Sheen
   ========================================================= */
interface TiltCard3DProps {
  children: React.ReactNode;
  className?: string;
  cursorLabel?: string;
  maxTilt?: number;
  disabled?: boolean;
}

export const TiltCard3D: React.FC<TiltCard3DProps> = ({
  children,
  className = '',
  cursorLabel = 'VIEW',
  maxTilt = 6,
  disabled = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);

  const rotateX = useSpring(
    useTransform(my, [0, 1], [maxTilt, -maxTilt]),
    { stiffness: 220, damping: 22 }
  );
  const rotateY = useSpring(
    useTransform(mx, [0, 1], [-maxTilt, maxTilt]),
    { stiffness: 220, damping: 22 }
  );
  const sheenBg = useTransform(
    [mx, my],
    ([lx, ly]) =>
      `radial-gradient(280px circle at ${(lx as number) * 100}% ${(ly as number) * 100}%, rgba(230, 138, 36, 0.14), transparent 70%)`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !ref.current || window.matchMedia('(pointer: coarse)').matches)
      return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <div className="perspective-1200 h-full">
      <motion.div
        ref={ref}
        data-cursor={cursorLabel}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={disabled ? undefined : { rotateX, rotateY }}
        className={`relative preserve-3d h-full ${className}`}
      >
        {!disabled && (
          <motion.div
            aria-hidden="true"
            style={{ background: sheenBg }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
        )}
        {children}
      </motion.div>
    </div>
  );
};
