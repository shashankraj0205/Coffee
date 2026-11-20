import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Send, CheckCircle2, Phone } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useModalEffects } from '../utils/useModalEffects';
import { SOLEN_EASE } from './MotionPrimitives';

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ open, onClose }) => {
  const { store, customerUser, submitSupportTicket } = useStore();
  const [name, setName] = useState(customerUser?.name || '');
  const [email, setEmail] = useState(customerUser?.email || '');
  const [phone, setPhone] = useState(customerUser?.phone || '');
  const [subject, setSubject] = useState('Order / Café Inquiry');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useModalEffects(open, onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitSupportTicket({ name, email, phone, subject, message });
      setSent(true);
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappDigits = (store.brand.whatsappPhone || '+918041238900').replace(
    /[^\d]/g,
    ''
  );

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Customer Support & Contact"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1E120C]/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: SOLEN_EASE }}
            className="relative z-10 w-full max-w-lg rounded-3xl bg-white text-[#15241E] border border-[#144734]/15 shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-[#144734] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-5 h-5 text-[#E68A24]" />
                <div>
                  <h3 className="font-serif text-lg font-semibold">
                    {store.brand.name} Support &amp; Concierge
                  </h3>
                  <p className="text-[11px] text-[#F5EBDD]/70">
                    Direct message to our café team or WhatsApp desk
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {sent ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[#294B35]/15 text-[#294B35] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-serif text-2xl font-semibold">
                    Dhanyavaad! Message Received
                  </h4>
                  <p className="text-sm text-[#6F4028] max-w-xs mx-auto">
                    Your inquiry is logged in our Admin Support Desk. Our café
                    team will respond promptly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      onClose();
                    }}
                    className="px-6 py-2.5 rounded-full bg-[#3B2418] text-[#FFF9F0] text-xs font-semibold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name *"
                      className="px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#E68A24]"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address *"
                      className="px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#E68A24]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone / WhatsApp (+91...)"
                      className="px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#E68A24]"
                    />
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-sm"
                    >
                      <option>Order / Café Inquiry</option>
                      <option>Office Chai &amp; Kaapi Bulk Order</option>
                      <option>Order Issue / Refund Help</option>
                      <option>Loyalty Coins &amp; Coupons</option>
                    </select>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can our chai & coffee bar help you today? *"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#E68A24]"
                  />

                  {error && (
                    <p className="text-xs text-rose-600 font-medium">{error}</p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#3B2418] hover:bg-[#6F4028] text-[#FFF9F0] text-sm font-semibold cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-[#E68A24]" />
                      <span>{submitting ? 'Sending...' : 'Send Support Message'}</span>
                    </button>
                    <a
                      href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Namaste ${store.brand.name}! I have a tea & coffee order question.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#294B35] hover:bg-[#1f3b29] text-[#FFF9F0] text-sm font-semibold"
                    >
                      <Phone className="w-4 h-4" />
                      <span>WhatsApp Us</span>
                    </a>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
