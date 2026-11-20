import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Share2,
  Gift,
  Award,
  Zap,
  Copy,
  Check,
  Sparkles,
  Users,
  Coffee,
  ArrowRight,
} from 'lucide-react';
import { FadeIn, StaggerContainer, StaggerItem } from './MotionPrimitives';
import { useStore } from '../context/StoreContext';

interface ReachAndEarnProps {
  onOpenJoin: (plan?: string) => void;
}

export const ReachAndEarn: React.FC<ReachAndEarnProps> = ({ onOpenJoin }) => {
  const { store } = useStore();
  const { brand, rewards } = store;
  const [cupsPerWeek, setCupsPerWeek] = useState<number>(6);
  const [friendsPerMonth, setFriendsPerMonth] = useState<number>(3);
  const [tierMultiplier, setTierMultiplier] = useState<1 | 2 | 3>(2);
  const [copied, setCopied] = useState(false);

  const brandSlug =
    brand.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'kulhadkaapi';

  const benefits = [
    {
      icon: Gift,
      title: 'Share a Cup, Earn Every Time',
      desc: `Every friend you invite gets their first Masala Chai or South Indian Filter Coffee completely free — and you earn ${rewards.referralBonusBeans}–${rewards.referralBonusBeans * 2} Chai Coins plus ₹${rewards.ritualPassReferralCash}–₹${rewards.reserveReferralCash} credit.`,
    },
    {
      icon: Zap,
      title: 'Multiply Your Chai Coins',
      desc: `Stack 1×, 2×, or 3× Chai Coins across all 22 Indian teas and coffees. Just ${rewards.beansForFreeDrink} Coins unlocks any handcrafted cup free at the bar.`,
    },
    {
      icon: Award,
      title: 'Maharaja Tapri Status',
      desc: 'Invite 5 friends to unlock VIP perks: priority peak-hour bar pickup, complimentary spice/jaggery customizations, and tasting invites.',
    },
    {
      icon: Share2,
      title: 'One-Tap “Chai Treat” Gifting',
      desc: 'Surprise a colleague or friend with a Kulhad Chai or Cold Coffee directly via your link — building your streak effortlessly.',
    },
  ];

  const avgSpendPerCupInr = 85;
  const coinsPerCupBase = Math.max(
    1,
    Math.round((avgSpendPerCupInr / 10) * Math.max(1, rewards.beansPerDollar) * 3)
  );
  const coinsFromSipping = Math.round(
    cupsPerWeek * 52 * coinsPerCupBase * tierMultiplier
  );
  const referralCoinsPerFriend =
    tierMultiplier === 1
      ? rewards.referralBonusBeans
      : tierMultiplier === 2
        ? Math.round(rewards.referralBonusBeans * 1.4)
        : rewards.referralBonusBeans * 2;
  const referralCashPerFriend =
    tierMultiplier === 1
      ? 0
      : tierMultiplier === 2
        ? rewards.ritualPassReferralCash
        : rewards.reserveReferralCash;

  const annualReferralCoins = friendsPerMonth * 12 * referralCoinsPerFriend;
  const annualReferralCreditInr = friendsPerMonth * 12 * referralCashPerFriend;

  const totalAnnualCoins = coinsFromSipping + annualReferralCoins;
  const freeDrinksFromCoins = Math.floor(
    totalAnnualCoins / Math.max(50, rewards.beansForFreeDrink)
  );
  const totalValueSavedInr = Math.round(
    freeDrinksFromCoins * 95 + annualReferralCreditInr
  );

  const communityRank =
    friendsPerMonth >= 5 || totalAnnualCoins >= 15000
      ? 'Chai Ustad Ambassador'
      : friendsPerMonth >= 2 || totalAnnualCoins >= 6000
        ? 'Kulhad Connoisseur'
        : 'Tapri Regular';

  const handleCopyInvite = () => {
    const sampleLink = `https://${brandSlug}.in/chai/your-tapri`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(sampleLink).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="rewards"
      className="relative py-20 lg:py-28 indian-sage-surface text-[#15241E] border-y border-[#144734]/12 overflow-hidden"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-start">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-8">
            <FadeIn>
              <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#144734] font-semibold mb-4">
                <span className="w-6 h-px bg-[#C87D28]" />
                Tapri Reach &amp; Earn Club
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.08] text-[#15241E]">
                Every shared cup brings{' '}
                <span className="font-semibold text-[#C87D28]">
                  free chai &amp; kaapi back to you.
                </span>
              </h2>
              <p className="mt-5 text-base sm:text-lg text-[#52635B] leading-relaxed">
                Great Indian chai tastes best in good company. {brand.name}’s
                transparent Reach &amp; Earn Club turns your daily cutting chai,
                kulhad, and filter coffee habit into free pours and ₹ café credit.
              </p>
            </FadeIn>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {benefits.map((item) => {
                const Icon = item.icon;
                return (
                  <StaggerItem
                    key={item.title}
                    className="p-5 rounded-2xl bg-white hover:shadow-md border border-[#144734]/10 transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#EAF3EE] border border-[#144734]/12 flex items-center justify-center text-[#144734] mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[#15241E]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-[#52635B] leading-relaxed">
                      {item.desc}
                    </p>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>

          {/* Right Column: Clean Crisp White Interactive Rewards Calculator */}
          <FadeIn delay={0.14} className="lg:col-span-6">
            <div className="rounded-[2rem] p-6 sm:p-8 bg-white border border-[#144734]/14 shadow-[0_24px_60px_rgba(20,71,52,0.09)]">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-[#144734]/10">
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#C87D28] font-semibold">
                    Live Chai Coins Estimator
                  </span>
                  <h3 className="font-serif text-2xl font-semibold text-[#15241E] mt-1">
                    See your yearly chai &amp; kaapi rewards
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3EE] border border-[#144734]/18 text-[#144734] text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-[#C87D28]" />
                  {communityRank}
                </span>
              </div>

              <div className="mt-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#52635B] mb-2.5">
                  Select Club Multiplier
                </p>
                <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-[#F4F7F5] border border-[#144734]/10">
                  {[
                    { mult: 1 as const, label: 'Daily Tapri', sub: '1× Free' },
                    {
                      mult: 2 as const,
                      label: 'Chai & Kaapi',
                      sub: `2× + ₹${rewards.ritualPassReferralCash}/ref`,
                    },
                    {
                      mult: 3 as const,
                      label: 'Maharaja Club',
                      sub: `3× + ₹${rewards.reserveReferralCash}/ref`,
                    },
                  ].map((opt) => {
                    const active = tierMultiplier === opt.mult;
                    return (
                      <button
                        key={opt.mult}
                        type="button"
                        onClick={() => setTierMultiplier(opt.mult)}
                        className={`relative py-2.5 px-2 rounded-xl text-center transition-all cursor-pointer ${
                          active
                            ? 'bg-[#144734] text-white font-semibold shadow-sm'
                            : 'text-[#52635B] hover:text-[#15241E]'
                        }`}
                      >
                        <div className="text-xs sm:text-sm leading-tight">
                          {opt.label}
                        </div>
                        <div
                          className={`font-mono text-[10px] mt-0.5 ${
                            active ? 'text-[#F0C97A]' : 'text-[#52635B]/75'
                          }`}
                        >
                          {opt.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2.5">
                    <label
                      htmlFor="cups-slider"
                      className="flex items-center gap-2 text-[#15241E] font-medium"
                    >
                      <Coffee className="w-4 h-4 text-[#C87D28]" />
                      <span>Chais or coffees you enjoy weekly</span>
                    </label>
                    <span className="font-mono text-base font-bold text-[#144734]">
                      {cupsPerWeek} cups/wk
                    </span>
                  </div>
                  <input
                    id="cups-slider"
                    type="range"
                    min={1}
                    max={14}
                    value={cupsPerWeek}
                    onChange={(e) => setCupsPerWeek(Number(e.target.value))}
                    className="w-full solen-slider"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-[#52635B] mt-1.5">
                    <span>1 cup</span>
                    <span>7 cups</span>
                    <span>14 cups</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2.5">
                    <label
                      htmlFor="friends-slider"
                      className="flex items-center gap-2 text-[#15241E] font-medium"
                    >
                      <Users className="w-4 h-4 text-[#144734]" />
                      <span>Friends you invite per month</span>
                    </label>
                    <span className="font-mono text-base font-bold text-[#C87D28]">
                      {friendsPerMonth}{' '}
                      {friendsPerMonth === 1 ? 'friend' : 'friends'}/mo
                    </span>
                  </div>
                  <input
                    id="friends-slider"
                    type="range"
                    min={0}
                    max={10}
                    value={friendsPerMonth}
                    onChange={(e) => setFriendsPerMonth(Number(e.target.value))}
                    className="w-full solen-slider"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-[#52635B] mt-1.5">
                    <span>0 friends</span>
                    <span>5 friends</span>
                    <span>10 friends</span>
                  </div>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-[#F4F7F5] border border-[#144734]/10">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#52635B]">
                    Yearly Coins
                  </p>
                  <motion.p
                    key={totalAnnualCoins}
                    initial={{ scale: 0.92, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-serif text-2xl sm:text-3xl font-semibold text-[#15241E] mt-1"
                  >
                    {totalAnnualCoins.toLocaleString()}
                  </motion.p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F4F7F5] border border-[#144734]/10">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#52635B]">
                    Free Cups
                  </p>
                  <motion.p
                    key={freeDrinksFromCoins}
                    initial={{ scale: 0.92, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-serif text-2xl sm:text-3xl font-semibold text-[#144734] mt-1"
                  >
                    {freeDrinksFromCoins}
                    <span className="text-sm font-sans font-normal text-[#52635B]">
                      /yr
                    </span>
                  </motion.p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8F4EC] border border-[#C87D28]/35">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#C87D28] font-semibold">
                    Value Saved
                  </p>
                  <motion.p
                    key={totalValueSavedInr}
                    initial={{ scale: 0.92, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-serif text-2xl sm:text-3xl font-semibold text-[#15241E] mt-1"
                  >
                    ₹{totalValueSavedInr.toLocaleString('en-IN')}
                  </motion.p>
                </div>
              </div>

              <div className="mt-6 p-3.5 rounded-2xl bg-[#F4F7F5] border border-[#144734]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#52635B]">
                    Your Shareable Chai Invite Preview
                  </p>
                  <p className="font-mono text-xs sm:text-sm text-[#144734] font-semibold truncate mt-0.5">
                    {brandSlug}.in/chai/your-tapri
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#EAF3EE] border border-[#144734]/15 text-xs font-semibold text-[#144734] transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Preview</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  onOpenJoin(
                    tierMultiplier === 1
                      ? 'Daily Tapri Club (Free)'
                      : tierMultiplier === 2
                        ? 'Chai & Kaapi Pass'
                        : 'Maharaja Kulhad Club'
                  )
                }
                className="mt-5 w-full group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-[#144734] hover:bg-[#0F3829] text-white text-sm sm:text-base font-semibold transition-all duration-200 shadow-[0_10px_24px_rgba(20,71,52,0.2)] cursor-pointer"
              >
                <span>Activate My Personal Chai Club Pass</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
};
