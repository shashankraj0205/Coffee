import React from 'react';
import {
  MapPin,
  Clock,
  Mail,
  Phone,
  ArrowUpRight,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useStore } from '../context/StoreContext';
import { formatTime12h } from '../utils/schedule';

interface FooterProps {
  onOpenJoin: (plan?: string) => void;
  onOpenAdmin: () => void;
  onOpenSupport?: () => void;
  onOpenQr?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenJoin,
  onOpenAdmin,
  onOpenSupport,
  onOpenQr,
}) => {
  const { store, shopStatus, backendMode } = useStore();
  const { brand, availability, locations } = store;

  return (
    <footer
      id="visit"
      className="bg-[#F4F7F5] text-[#15241E] border-t border-[#144734]/12"
    >
      {/* Light Sunlit Locations & Hours Band (hides cleanly when all outlets are deleted) */}
      {locations.length > 0 && (
        <div className="border-b border-[#144734]/10 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#C87D28] font-semibold">
                  Visit Our {locations.length === 1 ? 'Outlet' : 'Outlets'} ({locations.length})
                </span>
                <h2 className="font-serif text-2xl sm:text-4xl font-semibold text-[#15241E] mt-1.5">
                  Drop by for a steaming kulhad or filter kaapi.
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAF3EE] border border-[#144734]/15 text-xs font-semibold text-[#144734]">
                <Clock className="w-4 h-4 text-[#C87D28]" />
                <span>
                  {shopStatus.badgeText} · Today: {shopStatus.todayScheduleText}
                </span>
              </div>
            </div>

            <div
              className={`grid grid-cols-1 ${
                locations.length > 1 ? 'md:grid-cols-2' : 'max-w-2xl'
              } gap-5`}
            >
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-6 rounded-3xl bg-[#FCFAF7] border border-[#144734]/12 flex flex-col justify-between gap-4 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#EAF3EE] border border-[#144734]/14 flex items-center justify-center text-[#144734] shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-serif text-xl font-semibold text-[#15241E]">
                            {loc.name}
                          </h3>
                          {loc.neighborhood && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white border border-[#144734]/14 text-[#144734]">
                              {loc.neighborhood}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#52635B] mt-1">
                          {loc.address}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[10px] uppercase px-2.5 py-1 rounded-full font-semibold shrink-0 ${
                        loc.isOpen
                          ? 'bg-[#EAF3EE] text-[#144734]'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {loc.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-[#144734]/10 flex flex-wrap items-center justify-between gap-3 text-xs text-[#52635B]">
                    <div className="flex flex-wrap items-center gap-4">
                      {loc.hours && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#C87D28]" />
                          {loc.hours}
                        </span>
                      )}
                      {loc.phone && (
                        <a
                          href={`tel:${loc.phone.replace(/\s+/g, '')}`}
                          className="inline-flex items-center gap-1.5 hover:text-[#144734] font-medium"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#144734]" />
                          {loc.phone}
                        </a>
                      )}
                    </div>
                    <a
                      href={
                        loc.mapUrl ||
                        `https://maps.google.com/?q=${encodeURIComponent(loc.address)}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#144734] hover:text-[#C87D28]"
                    >
                      <span>Open in Maps</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Clean Light Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-[#144734]/12">
          <div className="lg:col-span-4 space-y-5">
            <a href="#" className="inline-flex items-center gap-3">
              <BrandLogo brand={brand} className="w-9 h-9" />
              <div className="flex flex-col leading-none">
                <span className="font-serif text-xl font-semibold tracking-tight text-[#15241E]">
                  {brand.name}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C87D28] mt-0.5">
                  {brand.footerSublabel}
                </span>
              </div>
            </a>
            <p className="text-sm text-[#52635B] leading-relaxed max-w-sm">
              Dedicated exclusively to India’s love for authentic{' '}
              <span className="font-devanagari text-[#144734] font-semibold">चाय</span>{' '}
              and freshly brewed{' '}
              <span className="font-devanagari text-[#C87D28] font-semibold">कॉफी</span>.
              Served fresh in clay kulhads, cutting glasses, and brass davara tumblers.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={`mailto:${brand.supportEmail}`}
                aria-label={`Email ${brand.name}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-[#EAF3EE] border border-[#144734]/15 text-xs text-[#15241E] transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#C87D28]" />
                <span>{brand.supportEmail}</span>
              </a>
              {onOpenSupport && (
                <button
                  type="button"
                  onClick={onOpenSupport}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#144734] hover:bg-[#0F3829] text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  <span>Support &amp; WhatsApp</span>
                </button>
              )}
              {onOpenQr && (
                <button
                  type="button"
                  onClick={onOpenQr}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-[#EAF3EE] border border-[#144734]/15 text-xs font-semibold text-[#144734] transition-colors cursor-pointer"
                >
                  <span>QR Table Menu</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#F8F4EC] hover:bg-[#F2E9DA] border border-[#C87D28]/35 text-xs font-semibold text-[#15241E] transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#C87D28]" />
                <span>Admin Control</span>
              </button>
            </div>
          </div>

          {/* Explore Links */}
          <div className="lg:col-span-2">
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-[#144734] font-semibold mb-4">
              Explore
            </h3>
            <ul className="space-y-2.5 text-sm text-[#52635B]">
              <li>
                <a href="#craft" className="hover:text-[#144734] transition-colors">
                  About Our Café
                </a>
              </li>
              <li>
                <a
                  href="#specialties"
                  className="hover:text-[#144734] transition-colors"
                >
                  Our Specialties
                </a>
              </li>
              <li>
                <a href="#menu" className="hover:text-[#144734] transition-colors">
                  Tea &amp; Coffee Menu
                </a>
              </li>
              {store.display.showRewardsCalculator && (
                <li>
                  <a
                    href="#rewards"
                    className="hover:text-[#144734] transition-colors"
                  >
                    Tapri Rewards
                  </a>
                </li>
              )}
              {store.display.showPricing && (
                <li>
                  <a
                    href="#pricing"
                    className="hover:text-[#144734] transition-colors"
                  >
                    Memberships
                  </a>
                </li>
              )}
              {store.display.showFaq && (
                <li>
                  <a href="#faq" className="hover:text-[#144734] transition-colors">
                    FAQ
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Tapri Club */}
          <div className="lg:col-span-3">
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-[#144734] font-semibold mb-4">
              Tapri Club
            </h3>
            <ul className="space-y-2.5 text-sm text-[#52635B]">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenJoin('Daily Tapri Club (Free)')}
                  className="hover:text-[#144734] transition-colors cursor-pointer"
                >
                  Claim Free First Cup
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenJoin('Chai & Kaapi Pass')}
                  className="hover:text-[#144734] transition-colors cursor-pointer"
                >
                  Chai &amp; Kaapi Pass (2× Coins)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenJoin('Maharaja Kulhad Club')}
                  className="hover:text-[#144734] transition-colors cursor-pointer"
                >
                  Maharaja Kulhad Club
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenJoin('Office Chai & Kaapi Inquiry')}
                  className="inline-flex items-center gap-1 hover:text-[#144734] transition-colors cursor-pointer"
                >
                  <span>Office Chai &amp; Kaapi Packs</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </li>
            </ul>
          </div>

          {/* Serving Hours */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-[#144734] font-semibold">
              Serving Hours ({availability.timezoneLabel})
            </h3>
            <div className="text-xs text-[#52635B] space-y-1.5">
              <p>
                Regular Opening:{' '}
                <strong className="text-[#15241E]">
                  {formatTime12h(availability.openingTime)}
                </strong>
              </p>
              <p>
                Regular Closing:{' '}
                <strong className="text-[#15241E]">
                  {formatTime12h(availability.closingTime)}
                </strong>
              </p>
              <p>
                Member Early Pickup:{' '}
                <strong className="text-[#C87D28]">
                  {formatTime12h(availability.memberEarlyPickupTime)}
                </strong>
              </p>
              <p className="pt-2 text-[11px] text-[#144734] font-semibold">
                100% Pure Indian Tea &amp; Coffee Only · No Food Items
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#52635B]">
          <p>
            © {new Date().getFullYear()} {brand.name} — {brand.footerSublabel}. All
            rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#52635B]">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendMode === 'live-api' ? 'bg-emerald-500' : 'bg-[#144734]'
                }`}
              />
              {backendMode === 'live-api'
                ? 'Live Express Backend Connected'
                : 'Full-Stack Store Sync Ready'}
            </span>
            <span className="font-devanagari text-[#144734] font-semibold">
              शुद्ध चाय एवं कॉफ़ी
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
