import React from 'react';
import { Flame, Leaf, Coins, Compass, ArrowUpRight } from 'lucide-react';
import { FadeIn, StaggerContainer, StaggerItem } from './MotionPrimitives';
import { useStore } from '../context/StoreContext';

interface FeaturesProps {
  onOpenJoin: (plan?: string) => void;
}

export const Features: React.FC<FeaturesProps> = ({ onOpenJoin }) => {
  const { store } = useStore();
  const { brand, rewards } = store;

  return (
    <section
      id="experience"
      className="py-20 lg:py-28 cafe-surface-warm transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* About Our Café Header */}
        <FadeIn className="max-w-3xl mb-14 lg:mb-16">
          <span
            style={{ color: brand.accentColor || '#E68A24' }}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] mb-4 font-semibold"
          >
            <span
              style={{ backgroundColor: brand.accentColor || '#E68A24' }}
              className="w-6 h-px"
            />
            About {brand.name} · हमारी कहानी
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.08] cafe-heading">
            Born from India’s tapri spirit.{' '}
            <span className="font-semibold text-[#C87D28]">
              Crafted like a modern specialty coffee house.
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-lg cafe-muted leading-relaxed">
            In India, chai and coffee are not just beverages — they are how
            mornings start, friendships deepen, and ideas spark. At{' '}
            <strong className="cafe-heading">{brand.name}</strong>, we serve{' '}
            <strong className="cafe-heading">exclusively Tea and Coffee</strong>{' '}
            — freshly pounded spices, clay kulhads, brass filter decoctions, and
            single-estate Indian roasts poured to perfection.
          </p>
        </FadeIn>

        {/* Architectural Bento Grid: Story + Café Experience */}
        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
          {/* Card 1: Authentic Indian Sourcing & Spice Craft */}
          <StaggerItem className="lg:col-span-7 group relative rounded-3xl overflow-hidden cafe-card-alt border shadow-[0_8px_28px_rgba(59,36,24,0.08)] transition-all duration-300 flex flex-col">
            <div className="relative h-64 sm:h-72 overflow-hidden bg-[#3B2418]">
              <img
                src="https://images.pexels.com/photos/12865880/pexels-photo-12865880.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200"
                alt="Traditional brass kettle pouring Indian masala chai into fluted glasses"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full glass-card-light font-mono text-[11px] font-semibold text-[#3B2418]">
                  Upper Assam CTC &amp; Darjeeling
                </span>
                <span className="px-3 py-1 rounded-full bg-[#294B35] text-[#FFF9F0] font-mono text-[11px] font-medium">
                  Chikmagalur &amp; Coorg Arabica
                </span>
              </div>
            </div>
            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 text-[#E68A24] mb-3">
                  <Flame className="w-5 h-5" />
                  <span className="font-mono text-xs uppercase tracking-[0.16em] font-semibold">
                    Authentic Indian Craft
                  </span>
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-semibold cafe-heading tracking-tight">
                  Freshly pounded whole spices. Real brass-filter decoction.
                </h3>
                <p className="mt-3 text-sm sm:text-base cafe-muted leading-relaxed">
                  Never pre-mixed powders or bottled syrups. Every kettle of Masala,
                  Adrak, and Elaichi Chai starts with freshly crushed Wayanad ginger
                  and Idukki cardamom pods, while our South Indian Filter Coffee
                  slow-drips from fresh 80:20 Chikmagalur peaberry roast.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-[#6F4028]/15 grid grid-cols-3 gap-4">
                <div>
                  <p className="font-mono text-xs cafe-muted">Chai Vessels</p>
                  <p className="text-sm font-semibold cafe-heading mt-0.5">
                    Kulhad &amp; Glass
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs cafe-muted">Kaapi Craft</p>
                  <p className="text-sm font-semibold cafe-heading mt-0.5">
                    Brass Davara Set
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs cafe-muted">Pure Focus</p>
                  <p className="text-sm font-semibold cafe-heading mt-0.5">
                    Tea &amp; Coffee Only
                  </p>
                </div>
              </div>
            </div>
          </StaggerItem>

          {/* Card 2: Light Champagne Chai Club Flywheel */}
          <StaggerItem className="lg:col-span-5 rounded-3xl p-6 sm:p-8 bg-[#F8F4EC] text-[#15241E] relative overflow-hidden flex flex-col justify-between shadow-[0_12px_34px_rgba(20,71,52,0.06)] border border-[#C87D28]/25">
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#C87D28]/25 flex items-center justify-center text-[#C87D28] mb-6 shadow-2xs">
                <Coins className="w-6 h-6" />
              </div>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#C87D28] font-semibold">
                Tapri Reach &amp; Earn
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-semibold mt-2 leading-tight text-[#15241E]">
                Chai pe charcha — now rewarded with every cup.
              </h3>
              <p className="mt-3 text-sm sm:text-base text-[#52635B] leading-relaxed">
                Bring your friends or office crew to {brand.name}. Earn Chai Coins on
                every single kulhad and filter coffee, plus +{rewards.referralBonusBeans}{' '}
                bonus Coins &amp; up to ₹{rewards.reserveReferralCash} café credit per
                friend invited.
              </p>

              <div className="mt-7 space-y-3">
                {[
                  {
                    step: '01',
                    title: 'Order Your Favourite Cup',
                    desc: 'Collect Chai Coins on every chai glass, kulhad, or coffee mug.',
                  },
                  {
                    step: '02',
                    title: 'Share Your Tapri Link',
                    desc: 'Send a free welcome cup invite to friends & colleagues.',
                  },
                  {
                    step: '03',
                    title: 'Redeem Free Chais & Coffees',
                    desc: `Just ${rewards.beansForFreeDrink} Coins unlocks any handcrafted drink free.`,
                  },
                ].map((row) => (
                  <div
                    key={row.step}
                    className="flex items-start gap-3.5 p-3 rounded-2xl bg-white border border-[#144734]/10 shadow-2xs"
                  >
                    <span className="font-mono text-xs font-bold text-[#C87D28] pt-0.5">
                      {row.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#15241E]">
                        {row.title}
                      </p>
                      <p className="text-xs text-[#52635B] mt-0.5">{row.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenJoin('Daily Tapri Club (Free)')}
              className="relative z-10 mt-7 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-[#144734] hover:bg-[#0F3829] text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm"
            >
              <span>Unlock Your Personal Chai Invite Link</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </StaggerItem>

          {/* Card 3: Airy Sage Mist Botanicals Card */}
          <StaggerItem className="lg:col-span-5 rounded-3xl p-6 sm:p-8 bg-[#EAF3EE] text-[#15241E] border border-[#144734]/15 flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-[#144734] mb-5 shadow-2xs">
                <Leaf className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#15241E]">
                Whole Indian botanicals. Zero premixes.
              </h3>
              <p className="mt-3 text-sm sm:text-base text-[#52635B] leading-relaxed">
                From Pampore Kashmiri kesar and fresh holy tulsi leaves to sun-dried
                green cardamom and organic palm jaggery (gud), every cup is brewed
                fresh from raw, honest Indian ingredients.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                'Wayanad Ginger',
                'Idukki Cardamom',
                'Kashmiri Kesar',
                'Fresh Tulsi',
                '80:20 Chicory Blend',
              ].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-white border border-[#144734]/12 text-xs font-medium text-[#144734]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </StaggerItem>

          {/* Card 4: Café Experience — Authentic Indian Café Interior */}
          <StaggerItem className="lg:col-span-7 group rounded-3xl overflow-hidden cafe-card-alt border shadow-[0_8px_28px_rgba(59,36,24,0.08)] grid grid-cols-1 sm:grid-cols-12">
            <div className="sm:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-[#E68A24]/20 flex items-center justify-center text-[#E68A24] mb-5">
                  <Compass className="w-5 h-5" />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#E68A24]">
                  The Café Experience
                </span>
                <h3 className="font-serif text-2xl font-semibold cafe-heading mt-1.5">
                  Sandstone arches, terracotta warmth &amp; unhurried conversations.
                </h3>
                <p className="mt-3 text-sm cafe-muted leading-relaxed">
                  Step into warm brass pendant lighting, teak wood counters lined
                  with clay kulhads and cutting glasses, comfortable seating, and
                  express pickup ready in ~{store.availability.prepTimeMinutes} minutes.
                </p>
              </div>
              {store.locations.length > 0 && (
                <a
                  href="#visit"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#144734] hover:text-[#C87D28] transition-colors"
                >
                  <span>
                    See{' '}
                    {store.locations
                      .map((l) => l.neighborhood || l.name)
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(' & ')}{' '}
                    {store.locations.length === 1 ? 'outlet' : 'outlets'}
                  </span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="sm:col-span-6 relative min-h-[250px] overflow-hidden bg-[#3B2418]">
              <img
                src="/images/indian-cafe-interior.jpg"
                alt={`${brand.name} Indian café interior with sandstone arches, terracotta tiles, brass lights, and stacked kulhads`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </section>
  );
};
