import React from 'react';
import { PRESS_LOGOS } from '../data/content';
import { FadeIn, StaggerContainer, StaggerItem } from './MotionPrimitives';
import { AnimatedCounter } from './KineticTypography';
import { useStore } from '../context/StoreContext';

export const SocialProof: React.FC = () => {
  const { store, publicMemberCount } = useStore();
  const teaAvailable = store.menuItems.filter(
    (m) => m.displayed && m.category === 'tea' && m.available && m.stockCount > 0
  ).length;
  const coffeeAvailable = store.menuItems.filter(
    (m) =>
      m.displayed && m.category === 'coffee' && m.available && m.stockCount > 0
  ).length;

  const metrics = [
    {
      num: 52000 + publicMemberCount,
      suffix: '+',
      label: 'Tapri Club Sippers',
      sub: 'Chai & kaapi lovers pouring daily',
    },
    {
      num: teaAvailable,
      suffix: ' Chais',
      label: 'Authentic Indian Teas',
      sub: 'Kulhad, Tandoori, Cutting & Kashmiri Kahwa',
    },
    {
      num: coffeeAvailable,
      suffix: ' Coffees',
      label: 'Fresh Indian Coffees',
      sub: 'Brass Filter Kaapi, Cappuccino & Cold Coffee',
    },
    {
      num: 100,
      suffix: '%',
      label: 'Pure Tea & Coffee Only',
      sub: 'Zero food clutter · Freshly brewed every cup',
    },
  ];

  return (
    <section
      aria-label="Press and café milestones"
      className="border-y border-[#6F4028]/15 cafe-surface-cream transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <FadeIn className="flex flex-col md:flex-row items-center justify-between gap-6 pb-9 border-b border-[#6F4028]/15">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] cafe-muted shrink-0">
            Celebrated Across India In
          </p>

          <div className="w-full md:w-auto overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex items-center gap-10 sm:gap-14 w-max animate-marquee md:animate-none">
              {[...PRESS_LOGOS, ...PRESS_LOGOS].map((logo, idx) => (
                <span
                  key={`${logo}-${idx}`}
                  className={`font-serif text-sm sm:text-base tracking-[0.14em] cafe-muted hover:text-[#E68A24] transition-colors select-none ${
                    idx >= PRESS_LOGOS.length ? 'md:hidden' : ''
                  }`}
                >
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 pt-9">
          {metrics.map((item) => (
            <StaggerItem key={item.label} className="space-y-1">
              <p className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight cafe-heading">
                <AnimatedCounter value={item.num} suffix={item.suffix} />
              </p>
              <p className="text-sm font-semibold text-[#E68A24]">{item.label}</p>
              <p className="text-xs cafe-muted leading-relaxed">{item.sub}</p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};
