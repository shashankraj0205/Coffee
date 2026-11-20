import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle2, Copy, Check, ArrowRight } from 'lucide-react';
import { SOLEN_EASE } from './MotionPrimitives';
import { BrandLogo } from './BrandLogo';
import { useStore } from '../context/StoreContext';
import { RitualMember } from '../types/store';
import { useModalEffects } from '../utils/useModalEffects';

interface JoinModalProps {
  open: boolean;
  selectedPlan: string;
  onClose: () => void;
}

export const JoinModal: React.FC<JoinModalProps> = ({
  open,
  selectedPlan,
  onClose,
}) => {
  const { store, registerMember } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [drinkChoice, setDrinkChoice] = useState(
    store.menuItems[0]?.name || 'Masala Chai'
  );
  const [member, setMember] = useState<RitualMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useModalEffects(open, onClose);

  const drinkOptions = store.menuItems.filter((m) => m.displayed);
  const availableDrinkList =
    drinkOptions.length > 0 ? drinkOptions : store.menuItems;

  useEffect(() => {
    if (
      availableDrinkList.length > 0 &&
      !availableDrinkList.some((d) => d.name === drinkChoice)
    ) {
      setDrinkChoice(availableDrinkList[0].name);
    }
  }, [availableDrinkList, drinkChoice]);

  useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => {
        setMember(null);
        setError(null);
      }, 300);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const brandSlug =
    store.brand.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'kulhadkaapi';
  const inviteUrl = `https://${brandSlug}.in/chai/${member?.referralCode || 'tapri'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const registered = await registerMember({
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
        plan: selectedPlan,
        preferredDrink: drinkChoice,
      });
      setMember(registered);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to register right now.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#3B2418]/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.3, ease: SOLEN_EASE }}
            className="relative z-10 w-full max-w-lg rounded-[2rem] bg-white text-[#15241E] border border-[#144734]/15 shadow-2xl overflow-hidden"
          >
            <div className="px-6 sm:px-8 pt-6 pb-5 bg-[#EAF3EE] text-[#15241E] border-b border-[#144734]/12 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-[#144734] font-mono text-[11px] font-semibold uppercase tracking-[0.18em]">
                  <Sparkles className="w-3.5 h-3.5 text-[#C87D28]" />
                  <span>{selectedPlan}</span>
                </div>
                <h2
                  id="join-modal-title"
                  className="font-serif text-2xl sm:text-3xl font-semibold mt-1.5"
                >
                  {member
                    ? 'नमस्ते! Your Tapri Pass is Live'
                    : 'Claim Your Free Welcome Cup'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="w-9 h-9 rounded-full bg-white hover:bg-[#F4F7F5] border border-[#144734]/15 flex items-center justify-center text-[#15241E] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {!member ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-sm text-[#6F4028] leading-relaxed">
                    Join {store.brand.name} free in 15 seconds to receive a
                    complimentary cup of Indian chai or coffee,{' '}
                    <strong className="text-[#3B2418]">
                      {store.rewards.welcomeBonusBeans} Chai Coins
                    </strong>
                    , and your personal Reach &amp; Earn invite link.
                  </p>

                  <div>
                    <label
                      htmlFor="join-name"
                      className="block text-xs font-semibold text-[#3B2418] mb-1.5"
                    >
                      Your Name
                    </label>
                    <input
                      id="join-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Ananya"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-[#6F4028]/20 text-sm text-[#3B2418] placeholder:text-[#6F4028]/50 focus:outline-none focus:ring-2 focus:ring-[#E68A24]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="join-email"
                      className="block text-xs font-semibold text-[#3B2418] mb-1.5"
                    >
                      Email Address
                    </label>
                    <input
                      id="join-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ananya@studio.in"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-[#6F4028]/20 text-sm text-[#3B2418] placeholder:text-[#6F4028]/50 focus:outline-none focus:ring-2 focus:ring-[#E68A24]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="join-drink"
                      className="block text-xs font-semibold text-[#3B2418] mb-1.5"
                    >
                      Choose Your Complimentary First Cup
                    </label>
                    <select
                      id="join-drink"
                      value={drinkChoice}
                      onChange={(e) => setDrinkChoice(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-[#6F4028]/20 text-sm text-[#3B2418] focus:outline-none focus:ring-2 focus:ring-[#E68A24]"
                    >
                      {availableDrinkList.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name} (₹{item.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <p className="text-xs text-rose-600 font-medium">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 w-full group inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-[#3B2418] hover:bg-[#6F4028] disabled:opacity-60 text-[#FFF9F0] text-sm font-bold transition-all shadow-md cursor-pointer"
                  >
                    <span>
                      {submitting
                        ? 'Activating Pass...'
                        : `Unlock Free Cup + ${store.rewards.welcomeBonusBeans} Coins`}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#E68A24] transition-transform group-hover:translate-x-1" />
                  </button>

                  <p className="text-center text-[11px] text-[#6F4028]/75">
                    100% Tea &amp; Coffee Club · Instant Tapri Pass · Cancel anytime
                  </p>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#294B35] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#3B2418]">
                        Swagat hai, {member.name}!
                      </p>
                      <p className="text-sm text-[#6F4028] mt-0.5">
                        Your voucher for a complimentary{' '}
                        <strong className="text-[#3B2418]">
                          {member.preferredDrink}
                        </strong>{' '}
                        is active for {member.email}.
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#3B2418] text-[#FFF9F0] border border-[#D9A441]/40 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <BrandLogo brand={store.brand} light className="w-7 h-7" />
                        <span className="font-serif text-base font-semibold">
                          {store.brand.name} Pass
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[#D9A441]">
                        {member.beansBalance} COINS
                      </span>
                    </div>
                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[#F5EBDD]/55">
                          Member
                        </p>
                        <p className="text-sm font-semibold mt-0.5">
                          {member.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[#F5EBDD]/55">
                          Welcome Cup
                        </p>
                        <p className="text-xs text-[#E68A24] font-semibold mt-0.5">
                          1× Free Chai or Coffee
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F5EBDD] border border-[#6F4028]/15">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#6F4028]">
                      Share &amp; Earn +{store.rewards.referralBonusBeans} Coins Per Friend
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-mono text-xs sm:text-sm text-[#3B2418] truncate">
                        {inviteUrl}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#3B2418] text-[#FFF9F0] text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#D9A441]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 rounded-full border border-[#6F4028]/25 text-sm font-semibold text-[#3B2418] hover:bg-[#F5EBDD] transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
