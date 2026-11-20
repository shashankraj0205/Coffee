import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, MessageCircle } from 'lucide-react';
import { FadeIn, SOLEN_EASE } from './MotionPrimitives';
import { useStore } from '../context/StoreContext';

interface FAQProps {
  onOpenJoin: (plan?: string) => void;
}

export const FAQ: React.FC<FAQProps> = ({ onOpenJoin }) => {
  const { store } = useStore();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const visibleFaqs = store.faqs.filter((f) => f.visible !== false);
  if (visibleFaqs.length === 0) return null;

  return (
    <section
      id="faq"
      className="py-20 lg:py-28 cafe-surface-warm transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-start">
          <FadeIn className="lg:col-span-5 lg:sticky lg:top-28">
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#E68A24] font-semibold mb-3.5">
              <span className="w-6 h-px bg-[#E68A24]" />
              Questions &amp; Answers
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.08] cafe-heading">
              Everything before your{' '}
              <span className="font-semibold text-[#C87D28]">
                first kulhad.
              </span>
            </h2>
            <p className="mt-4 text-base cafe-muted leading-relaxed">
              Wondering about our clay kulhads, 80:20 South Indian filter coffee,
              jaggery (gud) options, or how Chai Coins unlock free cups? Here are
              honest answers from our chaiwalas and coffee roasters.
            </p>

            <div className="mt-8 p-6 rounded-3xl cafe-card-alt border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#E68A24]/15 flex items-center justify-center text-[#E68A24]">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold cafe-heading">
                    Planning an office chai &amp; kaapi session?
                  </p>
                  <p className="text-xs cafe-muted">
                    Group Tapri referrals earn 3× bonus Chai Coins.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenJoin('Office Chai & Kaapi Inquiry')}
                className="mt-2 inline-flex items-center text-sm font-semibold text-[#E68A24] hover:opacity-80 transition-opacity cursor-pointer"
              >
                Speak with our café concierge →
              </button>
            </div>
          </FadeIn>

          <FadeIn delay={0.1} className="lg:col-span-7 space-y-3.5">
            {visibleFaqs.map((item, idx) => {
              const isOpen = openIndex === idx;
              const panelId = `faq-panel-${item.id || idx}`;

              return (
                <div
                  key={item.id || item.question}
                  className={`rounded-2xl border transition-all duration-200 ${
                    isOpen
                      ? 'cafe-card-alt border-[#E68A24]/55 shadow-[0_8px_24px_rgba(59,36,24,0.08)]'
                      : 'cafe-card hover:border-[#E68A24]/35'
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E68A24] rounded-2xl"
                  >
                    <span className="font-serif text-lg sm:text-xl font-semibold cafe-heading leading-snug">
                      {item.question}
                    </span>
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isOpen
                          ? 'bg-[#E68A24] text-[#3B2418]'
                          : 'bg-[#E68A24]/15 text-[#E68A24]'
                      }`}
                    >
                      {isOpen ? (
                        <Minus className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: SOLEN_EASE }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-1 text-sm sm:text-base cafe-muted leading-relaxed">
                          {item.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </FadeIn>
        </div>
      </div>
    </section>
  );
};
