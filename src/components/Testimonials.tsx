import React from 'react';
import { Star, Sparkles, Quote } from 'lucide-react';
import { FadeIn, StaggerContainer, StaggerItem } from './MotionPrimitives';
import { useStore } from '../context/StoreContext';

export const Testimonials: React.FC = () => {
  const { store } = useStore();
  const visibleTestimonials = (store.testimonials || []).filter(
    (t) => t.visible !== false
  );

  if (visibleTestimonials.length === 0) return null;

  return (
    <section
      id="community"
      className="py-20 lg:py-28 cafe-surface-warm transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <FadeIn className="max-w-2xl">
            <span
              style={{ color: store.brand.accentColor || '#E68A24' }}
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] mb-3.5 font-semibold"
            >
              <span
                style={{ backgroundColor: store.brand.accentColor || '#E68A24' }}
                className="w-6 h-px"
              />
              Chai Lovers &amp; Regulars
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.08] cafe-heading">
              Loved across India.{' '}
              <span className="font-semibold text-[#C87D28]">
                Shared every evening over chai.
              </span>
            </h2>
          </FadeIn>

          <FadeIn
            delay={0.1}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl cafe-card-alt border self-start md:self-auto"
          >
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-4 h-4 fill-[#E68A24] text-[#E68A24]"
                />
              ))}
            </div>
            <div className="text-xs">
              <span className="font-semibold cafe-heading">4.95 out of 5</span>
              <span className="cafe-muted"> · 4,200+ verified cups</span>
            </div>
          </FadeIn>
        </div>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleTestimonials.map((item) => (
            <StaggerItem
              key={item.id}
              className="group relative p-7 sm:p-8 rounded-3xl cafe-card-alt border hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-0.5">
                    {[...Array(Math.max(1, Math.min(5, item.rating || 5)))].map(
                      (_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 fill-[#E68A24] text-[#E68A24]"
                        />
                      )
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#294B35] text-[#FFF9F0] font-mono text-[11px] font-semibold">
                    <Sparkles className="w-3 h-3 text-[#D9A441]" />
                    {item.earnedStat}
                  </span>
                </div>

                <Quote
                  aria-hidden="true"
                  className="w-7 h-7 mb-3 text-[#D9A441]/60"
                />
                <p className="font-serif text-lg sm:text-xl leading-relaxed cafe-heading">
                  “{item.quote.replace(/Solen/g, store.brand.name)}”
                </p>
              </div>

              <div className="mt-7 pt-5 border-t border-[#6F4028]/15 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: item.avatarBg || '#6F4028' }}
                    className="w-10 h-10 rounded-full text-[#FFF9F0] text-xs font-semibold flex items-center justify-center shrink-0"
                  >
                    {item.avatarInitials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold cafe-heading">
                      {item.name}
                    </p>
                    <p className="text-xs cafe-muted">{item.role}</p>
                  </div>
                </div>

                <span className="text-xs font-medium px-3 py-1 rounded-full cafe-card border cafe-muted">
                  Orders: {item.favoriteDrink}
                </span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};
