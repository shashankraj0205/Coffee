import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, CheckCircle2, Copy, Check } from 'lucide-react';
import { FadeIn, SOLEN_EASE } from './MotionPrimitives';
import { useStore } from '../context/StoreContext';
import { RitualMember } from '../types/store';

export const FinalCTA: React.FC = () => {
  const { store, publicMemberCount, registerMember } = useStore();
  const [email, setEmail] = useState('');
  const [preference, setPreference] = useState<'tea' | 'coffee' | 'both'>('both');
  const [member, setMember] = useState<RitualMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const brandSlug =
    store.brand.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'kulhadkaapi';
  const generatedLink = `https://${brandSlug}.in/chai/${member?.referralCode || 'tapri'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await registerMember({
        name: email.split('@')[0],
        email: email.trim(),
        plan: 'Daily Tapri Club (Free)',
        preferredDrink:
          preference === 'tea'
            ? 'Masala Chai'
            : preference === 'coffee'
              ? 'South Indian Filter Coffee'
              : 'Masala Chai & Filter Coffee',
      });
      setMember(created);
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
      navigator.clipboard.writeText(generatedLink).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-16 lg:py-24 bg-[#FCFAF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="relative rounded-[2.25rem] overflow-hidden bg-gradient-to-br from-[#EAF3EE] via-[#F7FAF8] to-[#F8F4EC] border border-[#144734]/15 shadow-[0_24px_60px_-15px_rgba(20,71,52,0.1)]">
            <div className="relative z-10 px-6 sm:px-12 lg:px-16 py-14 sm:py-20 text-center max-w-3xl mx-auto text-[#15241E]">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#144734]/15 font-mono text-[11px] uppercase tracking-[0.18em] text-[#144734] font-semibold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#C87D28]" />
                नमस्ते · First Cup Free + {store.rewards.welcomeBonusBeans} Chai Coins
              </span>

              <h2 className="mt-6 font-serif text-3xl sm:text-5xl lg:text-[3.35rem] font-semibold tracking-[-0.025em] leading-[1.07] text-[#15241E]">
                Your steaming kulhad &amp; filter kaapi is waiting at{' '}
                <span className="font-semibold text-[#C87D28]">
                  {store.brand.name}.
                </span>
              </h2>

              <p className="mt-4 text-base sm:text-lg text-[#52635B] leading-relaxed max-w-2xl mx-auto">
                Join {(publicMemberCount + 52000).toLocaleString()}+ Indian chai and
                coffee lovers. Claim your complimentary cup of Masala Chai or South
                Indian Filter Coffee and unlock your personal referral link.
              </p>

              <AnimatePresence mode="wait">
                {!member ? (
                  <motion.form
                    key="cta-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: SOLEN_EASE }}
                    onSubmit={handleSubmit}
                    className="mt-8 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="text-xs text-[#52635B] mr-1">
                        I love sipping:
                      </span>
                      {(
                        [
                          { id: 'tea', label: 'चाय · Indian Chai' },
                          { id: 'coffee', label: 'कॉफी · Indian Coffee' },
                          { id: 'both', label: 'Both Chai & Coffee' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setPreference(opt.id)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                            preference === opt.id
                              ? 'bg-[#144734] text-white border-[#144734]'
                              : 'bg-white text-[#52635B] border-[#144734]/14 hover:border-[#144734]/35'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl mx-auto">
                      <label htmlFor="final-cta-email" className="sr-only">
                        Email address
                      </label>
                      <input
                        id="final-cta-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email for your free cup pass..."
                        className="flex-1 px-5 py-4 rounded-full bg-white border border-[#144734]/18 text-[#15241E] placeholder:text-[#52635B]/65 text-sm sm:text-base shadow-xs focus:outline-none focus:ring-2 focus:ring-[#144734]"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-[#144734] hover:bg-[#0F3829] disabled:opacity-60 text-white text-sm sm:text-base font-semibold transition-all shadow-md cursor-pointer shrink-0"
                      >
                        <span>
                          {submitting ? 'Activating...' : 'Claim Free Cup'}
                        </span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>
                    {error && (
                      <p className="text-xs text-rose-600 font-medium">{error}</p>
                    )}
                    <p className="text-xs text-[#52635B]">
                      100% Tea &amp; Coffee Only · No card required · Redeemable in-café or pickup
                    </p>
                  </motion.form>
                ) : (
                  <motion.div
                    key="cta-success"
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: SOLEN_EASE }}
                    className="mt-8 p-6 rounded-3xl bg-white border border-[#144734]/20 max-w-xl mx-auto text-left shadow-lg"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-serif text-xl font-semibold text-[#15241E]">
                          नमस्ते! Welcome to the {store.brand.name} Club
                        </p>
                        <p className="text-sm text-[#52635B] mt-1">
                          Your free cup pass +{' '}
                          <strong className="text-[#C87D28]">
                            {member.beansBalance} Chai Coins
                          </strong>{' '}
                          is live for <span className="underline">{member.email}</span>.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#144734]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[#C87D28] font-semibold">
                          Share &amp; Earn Chai Coins Immediately
                        </p>
                        <p className="font-mono text-xs sm:text-sm text-[#144734] font-semibold truncate mt-0.5">
                          {generatedLink}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#144734] text-white text-xs font-semibold hover:bg-[#0F3829] transition-colors cursor-pointer shrink-0"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#F0C97A]" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Invite</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
