import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight, Coins, Gift } from 'lucide-react';
import { FadeIn, StaggerContainer, StaggerItem } from './MotionPrimitives';
import { useStore } from '../context/StoreContext';

interface PricingProps {
  onSelectPlan: (planName: string) => void;
}

export const Pricing: React.FC<PricingProps> = ({ onSelectPlan }) => {
  const { store } = useStore();
  const [annual, setAnnual] = useState(true);

  const tiers = store.pricingTiers.filter((t) => t.visible !== false);
  if (tiers.length === 0) return null;

  return (
    <section
      id="pricing"
      className="py-20 lg:py-28 cafe-surface-cream border-y border-[#6F4028]/15 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="max-w-2xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#E68A24] font-semibold mb-3.5">
            <span className="w-5 h-px bg-[#E68A24]" />
            Chai &amp; Kaapi Memberships
            <span className="w-5 h-px bg-[#E68A24]" />
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.08] cafe-heading">
            Start free.{' '}
            <span className="font-semibold text-[#C87D28]">
              Sip more, save more every month.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg cafe-muted leading-relaxed">
            Every pass works across all 12 Indian teas and 10 Indian coffees,
            with uncapped Reach &amp; Earn rewards. Pause or cancel anytime.
          </p>

          <div className="mt-8 inline-flex items-center gap-3 p-1.5 rounded-full cafe-card border shadow-xs">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                !annual
                  ? 'bg-[#144734] text-white'
                  : 'text-[#52635B] hover:text-[#144734]'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                annual
                  ? 'bg-[#144734] text-white'
                  : 'text-[#52635B] hover:text-[#144734]'
              }`}
            >
              <span>Annual</span>
              <span className="px-2 py-0.5 rounded-full bg-[#294B35] text-[#FFF9F0] font-mono text-[10px] font-semibold">
                Save 20%
              </span>
            </button>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-7 items-stretch">
          {tiers.map((tier) => {
            const price = annual ? tier.annualMonthlyPrice : tier.monthlyPrice;
            const isFeatured = Boolean(tier.featured);

            return (
              <StaggerItem
                key={tier.id}
                className={`relative rounded-[2rem] p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                  isFeatured
                    ? 'bg-white text-[#15241E] border-2 border-[#144734] shadow-[0_24px_60px_-15px_rgba(20,71,52,0.18)] lg:-translate-y-2'
                    : 'bg-white text-[#15241E] border border-[#144734]/12 shadow-[0_8px_24px_rgba(20,71,52,0.05)]'
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3.5 left-8">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold shadow-sm ${
                        isFeatured
                          ? 'bg-[#E68A24] text-[#3B2418]'
                          : 'bg-[#294B35] text-[#FFF9F0]'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="font-serif text-2xl font-semibold">{tier.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#52635B]">
                    {tier.tagline}
                  </p>

                  <div className="mt-6 flex items-baseline gap-1.5">
                    <motion.span
                      key={`${tier.id}-${annual}-${price}`}
                      initial={{ opacity: 0.4, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-serif text-5xl font-semibold tracking-tight text-[#15241E]"
                    >
                      ₹{price}
                    </motion.span>
                    <span className="text-sm text-[#52635B]">
                      {price === 0 ? '/ forever' : '/ month'}
                    </span>
                  </div>
                  {price > 0 && annual && (
                    <p className="font-mono text-[11px] mt-1 text-[#144734] font-semibold">
                      Billed ₹{(price * 12).toLocaleString('en-IN')} yearly · Save ₹
                      {Math.max(
                        0,
                        (tier.monthlyPrice - tier.annualMonthlyPrice) * 12
                      ).toLocaleString('en-IN')}
                      /yr
                    </p>
                  )}

                  <div
                    className={`mt-6 p-3.5 rounded-2xl space-y-2 border ${
                      isFeatured
                        ? 'bg-[#EAF3EE] border-[#144734]/18'
                        : 'bg-[#F8F9F8] border-[#144734]/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#15241E]">
                      <Coins className="w-4 h-4 shrink-0 text-[#C87D28]" />
                      <span>{tier.beanMultiplier}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#15241E]">
                      <Gift className="w-4 h-4 shrink-0 text-[#144734]" />
                      <span>{tier.referralBonus}</span>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {tier.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-[#EAF3EE] text-[#144734] flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" strokeWidth={2.5} />
                        </span>
                        <span className="text-[#52635B]">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onSelectPlan(
                      `${tier.name}${price > 0 ? ` (₹${price}/mo)` : ' (Free)'}`
                    )
                  }
                  className={`mt-8 w-full group inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isFeatured
                      ? 'bg-[#144734] hover:bg-[#0F3829] text-white shadow-md'
                      : 'bg-[#F1F6F3] hover:bg-[#144734] text-[#144734] hover:text-white border border-[#144734]/18'
                  }`}
                >
                  <span>{tier.cta}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
};
