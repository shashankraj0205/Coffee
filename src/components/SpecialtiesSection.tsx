import React, { useRef, useState } from 'react';
import {
  Flame,
  Plus,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { MenuItem } from '../types/store';
import { useStore } from '../context/StoreContext';
import { FadeIn } from './MotionPrimitives';
import { SplitWordReveal } from './KineticTypography';

interface SpecialtiesSectionProps {
  onAddToBag: (item: MenuItem) => void;
  onInspectItem?: (item: MenuItem) => void;
}

export const SpecialtiesSection: React.FC<SpecialtiesSectionProps> = ({
  onAddToBag,
  onInspectItem,
}) => {
  const { store, shopStatus } = useStore();
  const railRef = useRef<HTMLDivElement>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  const featuredItems = [...store.menuItems]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((item) => item.displayed && (item.featured || item.isBestseller))
    .slice(0, 6);

  const itemsToShow =
    featuredItems.length > 0
      ? featuredItems
      : store.menuItems.filter((i) => i.displayed).slice(0, 6);

  if (itemsToShow.length === 0) return null;

  const handleQuickAdd = (item: MenuItem) => {
    if (!item.available || item.stockCount <= 0 || !shopStatus.canOrder) return;
    onAddToBag(item);
    setAddedId(item.id);
    window.setTimeout(() => {
      setAddedId((curr) => (curr === item.id ? null : curr));
    }, 1100);
  };

  const scrollRail = (dir: -1 | 1) => {
    if (!railRef.current) return;
    railRef.current.scrollBy({ left: dir * 340, behavior: 'smooth' });
  };

  return (
    <section
      id="specialties"
      className="py-20 lg:py-24 bg-white text-[#15241E] relative overflow-hidden"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <FadeIn className="max-w-2xl">
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#144734] font-semibold mb-3.5">
              <Flame className="w-4 h-4 text-[#C87D28]" />
              <span>Our Specialties · ख़ास पेशकश</span>
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.06] text-[#15241E]">
              <SplitWordReveal
                text="Iconic Indian cups people travel across town for."
                highlightPhrase="Iconic Indian"
                highlightColor="#C87D28"
              />
            </h2>
          </FadeIn>

          <FadeIn delay={0.1} className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              type="button"
              onClick={() => scrollRail(-1)}
              aria-label="Scroll specialties left"
              className="w-10 h-10 rounded-full bg-[#F1F6F3] hover:bg-[#144734] text-[#144734] hover:text-white border border-[#144734]/14 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollRail(1)}
              aria-label="Scroll specialties right"
              className="w-10 h-10 rounded-full bg-[#F1F6F3] hover:bg-[#144734] text-[#144734] hover:text-white border border-[#144734]/14 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <a
              href="#menu"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#F1F6F3] hover:bg-[#144734] text-[#144734] hover:text-white border border-[#144734]/14 text-xs font-semibold transition-all"
            >
              All {store.menuItems.filter((m) => m.displayed).length} Beverages
            </a>
          </FadeIn>
        </div>

        {/* Clean Bright Horizontal Showcase Rail */}
        <div
          ref={railRef}
          className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar"
        >
          {itemsToShow.map((item) => {
            const isSoldOut = !item.available || item.stockCount <= 0;
            const canOrder = !isSoldOut && shopStatus.canOrder;
            const isAdded = addedId === item.id;

            return (
              <article
                key={item.id}
                data-cursor="VIEW"
                className="shrink-0 w-[290px] sm:w-[325px] snap-start group rounded-3xl overflow-hidden bg-[#FCFAF7] border border-[#144734]/12 hover:border-[#C87D28]/50 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-[0_10px_28px_rgba(20,71,52,0.06)] hover:shadow-[0_18px_40px_rgba(20,71,52,0.12)]"
              >
                <div>
                  <div
                    onClick={() => onInspectItem?.(item)}
                    className="relative aspect-[4/3] overflow-hidden bg-[#F1F6F3] cursor-pointer"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-transform duration-700 ${
                        isSoldOut ? 'grayscale opacity-70' : 'group-hover:scale-105'
                      }`}
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent"
                    />
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold shadow-xs ${
                          item.category === 'tea'
                            ? 'bg-[#144734] text-white'
                            : 'bg-white/95 text-[#15241E]'
                        }`}
                      >
                        {item.category === 'tea' ? 'चाय · Tea' : 'कॉफी · Coffee'}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/95 text-[#144734] shadow-xs inline-flex items-center gap-1">
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-[10px] line-through text-[#52635B]/70 font-normal">
                            ₹{item.originalPrice}
                          </span>
                        )}
                        <span>₹{item.price}</span>
                      </span>
                    </div>
                    {item.servingStyle && (
                      <span className="absolute bottom-2.5 left-3 text-[11px] font-medium text-white drop-shadow-xs">
                        {item.servingStyle}
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-serif text-xl font-semibold text-[#15241E] leading-snug">
                        {item.name}
                      </h3>
                      {item.hindiName && (
                        <span className="font-devanagari text-xs text-[#C87D28] font-medium shrink-0">
                          {item.hindiName}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-[#52635B] leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2 flex items-center justify-between gap-2 border-t border-[#144734]/[0.08]">
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#C87D28] font-semibold">
                    <Sparkles className="w-3 h-3" />+{item.beansEarned} Coins
                  </span>
                  <button
                    type="button"
                    data-cursor="ORDER"
                    disabled={!canOrder}
                    onClick={() => handleQuickAdd(item)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                      !canOrder
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : isAdded
                          ? 'bg-emerald-600 text-white cursor-pointer'
                          : 'bg-[#144734] hover:bg-[#0F3829] text-white cursor-pointer'
                    }`}
                  >
                    {isSoldOut ? (
                      <span>Sold Out</span>
                    ) : !shopStatus.canOrder ? (
                      <span>Closed</span>
                    ) : isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-[#F0C97A]" />
                        <span>Order ₹{item.price}</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
