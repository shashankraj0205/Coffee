import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export const CustomCursor: React.FC<{ enabled?: boolean }> = ({
  enabled = true,
}) => {
  const [visible, setVisible] = useState(false);
  const [isFinePointer, setIsFinePointer] = useState(false);
  const [label, setLabel] = useState<string>('');
  const [isInteractive, setIsInteractive] = useState(false);
  const [pressed, setPressed] = useState(false);

  const mouseX = useMotionValue(-120);
  const mouseY = useMotionValue(-120);

  // Smooth trailing ring + faster inner dot
  const ringX = useSpring(mouseX, { stiffness: 260, damping: 28, mass: 0.45 });
  const ringY = useSpring(mouseY, { stiffness: 260, damping: 28, mass: 0.45 });
  const dotX = useSpring(mouseX, { stiffness: 650, damping: 38, mass: 0.15 });
  const dotY = useSpring(mouseY, { stiffness: 650, damping: 38, mass: 0.15 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setIsFinePointer(fine && !reduced && enabled);
  }, [enabled]);

  useEffect(() => {
    if (!isFinePointer) return;
    document.body.classList.add('custom-cursor-ready');

    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!visible) setVisible(true);

      const target = e.target as HTMLElement | null;
      const cursorHost = target?.closest('[data-cursor]') as HTMLElement | null;
      const nextLabel = cursorHost?.getAttribute('data-cursor') || '';
      setLabel(nextLabel);

      const clickable = Boolean(
        target?.closest('a, button, [role="button"], input, select, textarea')
      );
      setIsInteractive(clickable || Boolean(nextLabel));
    };

    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onLeave = () => setVisible(false);

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onLeave);

    return () => {
      document.body.classList.remove('custom-cursor-ready');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [isFinePointer, mouseX, mouseY, visible]);

  if (!isFinePointer || !visible) return null;

  const hasLabel = label.length > 0;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
    >
      {/* Trailing Ring / Pill Label */}
      <motion.div
        style={{ x: ringX, y: ringY }}
        animate={{
          width: hasLabel ? 84 : isInteractive ? 44 : 30,
          height: hasLabel ? 32 : isInteractive ? 44 : 30,
          scale: pressed ? 0.86 : 1,
          backgroundColor: hasLabel
            ? 'rgba(230, 138, 36, 0.94)'
            : isInteractive
              ? 'rgba(230, 138, 36, 0.14)'
              : 'rgba(217, 164, 65, 0.04)',
          borderColor: hasLabel
            ? 'rgba(255, 249, 240, 0.7)'
            : isInteractive
              ? 'rgba(230, 138, 36, 0.85)'
              : 'rgba(217, 164, 65, 0.55)',
        }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full border flex items-center justify-center shadow-[0_4px_20px_rgba(230,138,36,0.25)] backdrop-blur-[2px]"
      >
        {hasLabel && (
          <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#3B2418] uppercase select-none">
            {label}
          </span>
        )}
      </motion.div>

      {/* Center Precision Dot */}
      {!hasLabel && (
        <motion.div
          style={{ x: dotX, y: dotY }}
          animate={{ scale: pressed ? 1.5 : 1 }}
          className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#E68A24]"
        />
      )}
    </div>
  );
};
