import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  ArrowRight,
  Clock,
  AlertCircle,
  Coffee,
  Tag,
  ShieldCheck,
  Printer,
  Download,
  Truck,
  Store,
  QrCode,
  CreditCard,
  Wallet,
} from 'lucide-react';
import {
  CartItemLine,
  CartQuoteResult,
  CustomerOrder,
  DeliveryAddress,
  OrderType,
  PaymentMethod,
} from '../types/store';
import { SOLEN_EASE } from './MotionPrimitives';
import { useStore } from '../context/StoreContext';
import { useModalEffects } from '../utils/useModalEffects';
import {
  getUnitPriceForSize,
  ORDER_STATUS_META,
  getOrderProgressionSteps,
  printOrderReceipt,
  downloadOrderInvoice,
  formatInrExact,
} from '../utils/commerce';

interface TastingBagDrawerProps {
  open: boolean;
  lines: CartItemLine[];
  onClose: () => void;
  onUpdateQty: (lineKey: string, delta: number) => void;
  onRemoveLine: (lineKey: string) => void;
  onClearBag: () => void;
  onOpenAccount: () => void;
}

export const TastingBagDrawer: React.FC<TastingBagDrawerProps> = ({
  open,
  lines,
  onClose,
  onUpdateQty,
  onRemoveLine,
  onClearBag,
  onOpenAccount,
}) => {
  const {
    store,
    shopStatus,
    customerUser,
    tableNumberFromQr,
    getCartQuote,
    placeOrder,
    verifyPayment,
    activeTrackedOrder,
    setActiveTrackedOrderNumber,
  } = useStore();

  const [step, setStep] = useState<'cart' | 'checkout' | 'payment' | 'confirmed'>('cart');
  const [orderType, setOrderType] = useState<OrderType>(
    tableNumberFromQr ? 'dine_in' : 'pickup'
  );
  const [tableNumber, setTableNumber] = useState(tableNumberFromQr || '');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduledFor, setScheduledFor] = useState('17:30');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupNote, setPickupNote] = useState('');

  // Delivery address
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [manualLine1, setManualLine1] = useState('');
  const [manualCity, setManualCity] = useState('Bengaluru');
  const [manualPincode, setManualPincode] = useState('');

  // Coupon & Loyalty Redemption
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(0);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay_upi');
  const [quote, setQuote] = useState<CartQuoteResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingPaymentOrder, setPendingPaymentOrder] = useState<CustomerOrder | null>(null);
  const [paymentSession, setPaymentSession] = useState<{
    mode: 'sandbox' | 'live';
    gatewayOrderId: string;
    sandboxNotice?: string;
  } | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    if (tableNumberFromQr) {
      setOrderType('dine_in');
      setTableNumber(tableNumberFromQr);
    }
  }, [tableNumberFromQr]);

  useEffect(() => {
    if (customerUser) {
      setCustomerName((prev) => prev || customerUser.name);
      setCustomerEmail((prev) => prev || customerUser.email);
      setCustomerPhone((prev) => prev || customerUser.phone);
      if (customerUser.addresses.length > 0 && !selectedAddressId) {
        setSelectedAddressId(customerUser.addresses[0].id);
      }
    }
  }, [customerUser, selectedAddressId]);

  // Reconcile lines with live products
  const resolvedLines = useMemo(() => {
    return lines
      .map((line) => {
        const liveItem = store.menuItems.find((m) => m.id === line.itemId);
        if (!liveItem) return null;
        const isSoldOut = !liveItem.available || liveItem.stockCount <= 0;
        const clampedQty = isSoldOut
          ? line.quantity
          : Math.min(line.quantity, liveItem.stockCount);
        const unitPrice = getUnitPriceForSize(liveItem, line.size);
        return {
          line,
          item: liveItem,
          quantity: clampedQty,
          unitPrice,
          isSoldOut,
          atStockCap: !isSoldOut && clampedQty >= liveItem.stockCount,
        };
      })
      .filter(Boolean) as {
      line: CartItemLine;
      item: (typeof store.menuItems)[number];
      quantity: number;
      unitPrice: number;
      isSoldOut: boolean;
      atStockCap: boolean;
    }[];
  }, [lines, store.menuItems]);

  const hasUnavailableItems = resolvedLines.some((r) => r.isSoldOut);

  // Live server-validated quote refresh whenever cart/coupon/orderType/loyalty changes
  useEffect(() => {
    if (!open || resolvedLines.length === 0 || hasUnavailableItems) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    getCartQuote({
      items: resolvedLines.map((r) => ({ ...r.line, quantity: r.quantity })),
      orderType,
      couponCode: appliedCouponCode,
      redeemPoints,
      customerEmail: customerEmail || customerUser?.email || '',
    })
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    open,
    resolvedLines,
    hasUnavailableItems,
    orderType,
    appliedCouponCode,
    redeemPoints,
    customerEmail,
    customerUser?.email,
    getCartQuote,
  ]);

  const handleClose = useCallback(() => {
    setError(null);
    if (step === 'confirmed') setStep('cart');
    onClose();
  }, [onClose, step]);

  useModalEffects(open, handleClose);

  const eligibleCoupons = (store.coupons || []).filter((c) => c.active);

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopStatus.canOrder && scheduleMode === 'now') {
      setError('Café is currently closed — switch to "Schedule for Later" to pre-order!');
      return;
    }
    if (hasUnavailableItems) {
      setError('Please remove sold-out beverages first.');
      return;
    }

    let deliveryAddress: DeliveryAddress | null = null;
    if (orderType === 'delivery') {
      const savedAddr = customerUser?.addresses.find((a) => a.id === selectedAddressId);
      if (savedAddr) {
        deliveryAddress = savedAddr;
      } else {
        if (!manualLine1.trim() || !manualPincode.trim()) {
          setError('Please enter your delivery street address and pincode.');
          return;
        }
        deliveryAddress = {
          id: 'manual',
          label: 'Delivery',
          recipientName: customerName || 'Guest',
          phone: customerPhone || '+91',
          line1: manualLine1.trim(),
          city: manualCity.trim() || 'Bengaluru',
          pincode: manualPincode.trim(),
        };
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const idempotencyKey = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const res = await placeOrder({
        customerName: customerName.trim() || 'Guest Sipper',
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber || 'T1' : '',
        scheduledFor: scheduleMode === 'later' ? scheduledFor : '',
        deliveryAddress,
        pickupNote: pickupNote.trim(),
        couponCode: appliedCouponCode,
        redeemPoints,
        paymentMethod,
        idempotencyKey,
        items: resolvedLines.map((r) => ({ ...r.line, quantity: r.quantity })),
      });

      if (res.paymentSession) {
        setPendingPaymentOrder(res.order);
        setPaymentSession(res.paymentSession);
        setStep('payment');
      } else {
        setConfirmedOrder(res.order);
        onClearBag();
        setStep('confirmed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSandboxPayment = async (simulateFailure = false) => {
    if (!pendingPaymentOrder) return;
    setSubmitting(true);
    setError(null);
    try {
      const verified = await verifyPayment({
        orderId: pendingPaymentOrder.id,
        gatewayOrderId: paymentSession?.gatewayOrderId,
        simulateSuccess: !simulateFailure,
        simulateFailure,
      });
      setConfirmedOrder(verified);
      setPendingPaymentOrder(null);
      setPaymentSession(null);
      onClearBag();
      setStep('confirmed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const liveTrack =
    activeTrackedOrder &&
    (!confirmedOrder || activeTrackedOrder.orderNumber === confirmedOrder.orderNumber)
      ? activeTrackedOrder
      : confirmedOrder;

  const progressSteps = liveTrack
    ? getOrderProgressionSteps(liveTrack.orderType)
    : [];

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Chai & Kaapi Cart and Checkout"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-[#1E120C]/65 backdrop-blur-xs"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.34, ease: SOLEN_EASE }}
            className="relative z-10 w-full max-w-lg bg-white text-[#15241E] h-full shadow-2xl border-l border-[#144734]/12 flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#144734]/12 bg-[#F1F6F3] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#E68A24]" />
                  <h2 className="font-serif text-xl font-semibold">
                    {step === 'cart' && 'Chai & Kaapi Tray'}
                    {step === 'checkout' && 'Checkout & Offers'}
                    {step === 'payment' && 'Razorpay Verification'}
                    {step === 'confirmed' && 'Order Confirmed'}
                  </h2>
                </div>
                <p className="font-mono text-[11px] text-[#6F4028] mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {shopStatus.badgeText}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close tray"
                className="w-9 h-9 rounded-full bg-[#FFF9F0] border border-[#6F4028]/15 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Live 7-Stage Order Tracker */}
              {liveTrack && step !== 'payment' && (
                <div className="p-4 rounded-2xl bg-[#3B2418] text-[#FFF9F0] space-y-3 border border-[#D9A441]/35">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-[#E68A24]" />
                      <span className="font-mono text-xs font-bold text-[#D9A441]">
                        #{liveTrack.orderNumber} · {liveTrack.orderType.toUpperCase()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmedOrder(null);
                        setActiveTrackedOrderNumber(null);
                      }}
                      className="text-[10px] font-mono uppercase text-[#F5EBDD]/60 hover:text-[#FFF9F0] cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>

                  {liveTrack.status === 'cancelled' ? (
                    <p className="text-xs text-rose-300 font-medium">
                      Order cancelled ({liveTrack.paymentStatus}).
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-5 gap-1">
                        {progressSteps.map((st, idx) => {
                          const curIdx = progressSteps.indexOf(liveTrack.status);
                          const active = idx <= (curIdx === -1 ? 0 : curIdx);
                          return (
                            <div key={st} className="space-y-1">
                              <div
                                className={`h-1.5 rounded-full ${
                                  active ? 'bg-[#E68A24]' : 'bg-white/15'
                                }`}
                              />
                              <p className="text-[9px] font-mono text-center truncate text-[#F5EBDD]/80">
                                {ORDER_STATUS_META[st].label.split(' ')[0]}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-[#F5EBDD]/85">
                        Current Stage:{' '}
                        <strong className="text-[#D9A441]">
                          {ORDER_STATUS_META[liveTrack.status]?.label}
                        </strong>{' '}
                        · Payment: <strong className="uppercase">{liveTrack.paymentStatus}</strong>
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* STEP 4: CONFIRMED */}
              {step === 'confirmed' && confirmedOrder && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-[#294B35]/15 text-[#294B35] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold">
                    Dhanyavaad, {confirmedOrder.customerName}!
                  </h3>
                  <p className="text-xs text-[#6F4028] max-w-xs mx-auto">
                    Order <strong>#{confirmedOrder.orderNumber}</strong> is confirmed
                    ({confirmedOrder.orderType.toUpperCase()}). You’ll earn{' '}
                    <strong className="text-[#E68A24]">
                      +{confirmedOrder.totalBeans} Chai Coins
                    </strong>{' '}
                    upon completion.
                  </p>
                  <div className="p-4 rounded-2xl bg-[#F5EBDD] border border-[#6F4028]/15 text-left text-xs space-y-1.5">
                    {confirmedOrder.items.map((it, i) => (
                      <div key={i} className="flex justify-between">
                        <span>
                          {it.quantity}× {it.name} ({it.size})
                        </span>
                        <span className="font-mono font-semibold">
                          ₹{it.price * it.quantity}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-[#6F4028]/15 flex justify-between font-bold text-sm">
                      <span>Total Paid / Payable</span>
                      <span className="font-mono">
                        {formatInrExact(confirmedOrder.totalPayable)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => printOrderReceipt(confirmedOrder, store.brand)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#3B2418] text-[#FFF9F0] text-xs font-semibold cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#D9A441]" /> Print Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadOrderInvoice(confirmedOrder, store.brand)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#F5EBDD] border border-[#6F4028]/20 text-[#3B2418] text-xs font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Invoice
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: RAZORPAY GATEWAY VERIFICATION (EXPLICIT SANDBOX/LIVE STATUS) */}
              {step === 'payment' && pendingPaymentOrder && paymentSession && (
                <div className="space-y-4">
                  <div className="p-5 rounded-3xl bg-[#3B2418] text-[#FFF9F0] border border-[#D9A441]/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D9A441]">
                        <ShieldCheck className="w-4 h-4 text-[#E68A24]" />
                        Razorpay Secure Checkout
                      </span>
                      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-[#E68A24]/25 text-[#FFD39E]">
                        {paymentSession.mode === 'live' ? 'LIVE GATEWAY' : 'SANDBOX TEST MODE'}
                      </span>
                    </div>
                    <p className="font-serif text-3xl font-semibold">
                      {formatInrExact(pendingPaymentOrder.totalPayable)}
                    </p>
                    <p className="font-mono text-[11px] text-[#F5EBDD]/70">
                      Order #{pendingPaymentOrder.orderNumber} · Gateway ID:{' '}
                      {paymentSession.gatewayOrderId}
                    </p>
                    {paymentSession.sandboxNotice && (
                      <p className="p-3 rounded-xl bg-white/10 text-[11px] text-[#F5EBDD]/90 leading-relaxed">
                        {paymentSession.sandboxNotice}
                      </p>
                    )}
                  </div>

                  {error && (
                    <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                      {error}
                    </p>
                  )}

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSandboxPayment(false)}
                      className="w-full py-3.5 px-5 rounded-full bg-[#294B35] hover:bg-[#1f3b29] text-[#FFF9F0] text-sm font-bold cursor-pointer"
                    >
                      {submitting
                        ? 'Verifying HMAC Signature...'
                        : `Complete Verified Test Payment (${formatInrExact(pendingPaymentOrder.totalPayable)})`}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSandboxPayment(true)}
                      className="w-full py-2.5 px-5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold cursor-pointer"
                    >
                      Simulate Payment Failure (Test Error Handling)
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 1: CART REVIEW */}
              {step === 'cart' && (
                <>
                  {resolvedLines.length === 0 ? (
                    <div className="py-12 text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#F5EBDD] flex items-center justify-center text-[#6F4028] mx-auto">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <p className="font-serif text-xl font-semibold">
                        Your chai &amp; coffee tray is empty
                      </p>
                      <p className="text-xs text-[#6F4028] max-w-xs mx-auto">
                        Customize any of our 12 Indian Chais or 10 Indian Coffees
                        with size, temperature, and sugar/gud preference.
                      </p>
                      <a
                        href="#menu"
                        onClick={handleClose}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#3B2418] text-[#FFF9F0] text-xs font-semibold"
                      >
                        Browse Menu <ArrowRight className="w-3.5 h-3.5 text-[#E68A24]" />
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {resolvedLines.map(
                        ({ line, item, quantity, unitPrice, isSoldOut, atStockCap }) => (
                          <div
                            key={line.lineKey}
                            className={`flex gap-3 p-3.5 rounded-2xl border ${
                              isSoldOut
                                ? 'bg-rose-50 border-rose-200'
                                : 'bg-white border-[#6F4028]/15'
                            }`}
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-16 h-16 rounded-xl object-cover shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-serif text-base font-semibold truncate">
                                  {item.name}
                                </h3>
                                <span className="font-mono text-sm font-bold">
                                  ₹{unitPrice * quantity}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#6F4028] mt-0.5">
                                {line.size} · {line.temperature.toUpperCase()} ·{' '}
                                {line.sugarPreference} · {line.milkStrength}
                              </p>
                              {line.specialInstructions && (
                                <p className="text-[11px] text-[#E68A24] italic truncate">
                                  “{line.specialInstructions}”
                                </p>
                              )}

                              <div className="mt-2 flex items-center justify-between">
                                {isSoldOut ? (
                                  <button
                                    type="button"
                                    onClick={() => onRemoveLine(line.lineKey)}
                                    className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
                                  >
                                    Sold out — Remove
                                  </button>
                                ) : (
                                  <div className="inline-flex items-center gap-2 rounded-full bg-[#F5EBDD] px-1.5 py-0.5">
                                    <button
                                      type="button"
                                      onClick={() => onUpdateQty(line.lineKey, -1)}
                                      className="w-6 h-6 rounded-full hover:bg-white flex items-center justify-center cursor-pointer"
                                    >
                                      {quantity === 1 ? (
                                        <Trash2 className="w-3.5 h-3.5 text-[#E68A24]" />
                                      ) : (
                                        <Minus className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <span className="font-mono text-xs font-bold w-5 text-center">
                                      {quantity}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={atStockCap}
                                      onClick={() => onUpdateQty(line.lineKey, 1)}
                                      className="w-6 h-6 rounded-full hover:bg-white disabled:opacity-35 flex items-center justify-center cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                                <span className="font-mono text-[11px] text-[#294B35]">
                                  +{item.beansEarned * quantity} Coins
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </>
              )}

              {/* STEP 2: FULL CHECKOUT FORM */}
              {step === 'checkout' && resolvedLines.length > 0 && (
                <form
                  id="full-checkout-form"
                  onSubmit={handleConfirmOrder}
                  className="space-y-4"
                >
                  {/* Fulfillment Type */}
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#6F4028] mb-2">
                      1. Fulfillment Method
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'pickup', label: 'Café Pickup', icon: Store },
                          { id: 'delivery', label: 'Delivery', icon: Truck },
                          { id: 'dine_in', label: 'Table QR', icon: QrCode },
                        ] as const
                      ).map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setOrderType(opt.id)}
                            className={`py-2.5 px-2 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer ${
                              orderType === opt.id
                                ? 'bg-[#3B2418] text-[#FFF9F0] border-[#3B2418]'
                                : 'bg-white text-[#6F4028] border-[#6F4028]/15'
                            }`}
                          >
                            <Icon className="w-4 h-4 text-[#E68A24]" />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Immediate vs Schedule for Later */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScheduleMode('now')}
                      className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                        scheduleMode === 'now'
                          ? 'bg-[#F5EBDD] border-[#E68A24] text-[#3B2418]'
                          : 'bg-white border-[#6F4028]/15 text-[#6F4028]'
                      }`}
                    >
                      Order Now (~{store.availability.prepTimeMinutes}m)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleMode('later')}
                      className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                        scheduleMode === 'later'
                          ? 'bg-[#F5EBDD] border-[#E68A24] text-[#3B2418]'
                          : 'bg-white border-[#6F4028]/15 text-[#6F4028]'
                      }`}
                    >
                      Schedule for Later
                    </button>
                  </div>
                  {scheduleMode === 'later' && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#6F4028]/15 text-xs">
                      <span className="font-semibold">Preferred Time Slot:</span>
                      <input
                        type="time"
                        value={scheduledFor}
                        onChange={(e) => setScheduledFor(e.target.value)}
                        className="font-mono px-2.5 py-1 rounded-lg bg-[#F5EBDD]"
                      />
                    </div>
                  )}

                  {orderType === 'dine_in' && (
                    <input
                      type="text"
                      required
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Table Number (e.g., T4) *"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-xs font-mono"
                    />
                  )}

                  {/* Customer Info */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[#6F4028]">
                        2. Contact Details
                      </p>
                      {!customerUser && (
                        <button
                          type="button"
                          onClick={onOpenAccount}
                          className="text-[11px] font-semibold text-[#E68A24] hover:underline cursor-pointer"
                        >
                          Sign in for saved addresses &amp; Coins
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your Name *"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Email (for invoice)"
                        className="px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-xs"
                      />
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Mobile (+91...) *"
                        className="px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-xs"
                      />
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {orderType === 'delivery' && (
                    <div className="space-y-2.5 p-3.5 rounded-2xl bg-[#F5EBDD]/70 border border-[#6F4028]/15">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[#6F4028]">
                        Delivery Address (Free above ₹{store.commerce.freeDeliveryAbove})
                      </p>
                      {customerUser && customerUser.addresses.length > 0 && (
                        <div className="space-y-1.5">
                          {customerUser.addresses.map((a) => (
                            <label
                              key={a.id}
                              className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-[#6F4028]/15 text-xs cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="savedAddr"
                                checked={selectedAddressId === a.id}
                                onChange={() => setSelectedAddressId(a.id)}
                                className="mt-0.5 accent-[#E68A24]"
                              />
                              <span>
                                <strong>{a.label}:</strong> {a.line1}, {a.city} -{' '}
                                {a.pincode}
                              </span>
                            </label>
                          ))}
                          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-1">
                            <input
                              type="radio"
                              name="savedAddr"
                              checked={selectedAddressId === 'manual'}
                              onChange={() => setSelectedAddressId('manual')}
                              className="accent-[#E68A24]"
                            />
                            Enter a different address
                          </label>
                        </div>
                      )}
                      {(!customerUser ||
                        customerUser.addresses.length === 0 ||
                        selectedAddressId === 'manual') && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            required
                            value={manualLine1}
                            onChange={(e) => setManualLine1(e.target.value)}
                            placeholder="Flat / Building / Street *"
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#6F4028]/20 text-xs"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={manualCity}
                              onChange={(e) => setManualCity(e.target.value)}
                              placeholder="City"
                              className="px-3 py-2 rounded-xl bg-white border border-[#6F4028]/20 text-xs"
                            />
                            <input
                              type="text"
                              required
                              value={manualPincode}
                              onChange={(e) => setManualPincode(e.target.value)}
                              placeholder="Pincode *"
                              className="px-3 py-2 rounded-xl bg-white border border-[#6F4028]/20 text-xs font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Coupons & Eligible Offers */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-white border border-[#6F4028]/15">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#6F4028] flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-[#E68A24]" />
                      3. Apply Coupon Offer
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Enter code (e.g., FIRSTCHAI)"
                        className="flex-1 px-3 py-2 rounded-xl bg-[#FFF9F0] border border-[#6F4028]/20 text-xs font-mono uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => setAppliedCouponCode(couponInput.trim())}
                        className="px-4 py-2 rounded-xl bg-[#3B2418] text-[#FFF9F0] text-xs font-semibold cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {quote?.couponError && (
                      <p className="text-[11px] text-rose-600 font-medium">
                        {quote.couponError}
                      </p>
                    )}
                    {quote?.couponApplied && (
                      <p className="text-[11px] text-[#294B35] font-semibold">
                        ✓ {quote.couponApplied.code} applied! Saving ₹
                        {quote.discountAmount}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {eligibleCoupons.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCouponInput(c.code);
                            setAppliedCouponCode(c.code);
                          }}
                          className="px-2.5 py-1 rounded-full bg-[#F5EBDD] hover:bg-[#E68A24]/25 border border-[#6F4028]/15 text-[10px] font-mono font-semibold text-[#3B2418] cursor-pointer"
                          title={c.description}
                        >
                          {c.code} · {c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`} OFF
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Loyalty Points Redemption */}
                  {customerUser &&
                    customerUser.loyaltyPoints >= store.commerce.minPointsToRedeem && (
                      <div className="p-3.5 rounded-2xl bg-[#294B35]/10 border border-[#294B35]/25 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#294B35] flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            Redeem Chai Coins ({customerUser.loyaltyPoints} available)
                          </span>
                          <span className="font-mono font-bold text-[#3B2418]">
                            {redeemPoints} Coins (-₹
                            {(
                              redeemPoints * store.commerce.pointRedemptionValueInr
                            ).toFixed(0)}
                            )
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={Math.min(customerUser.loyaltyPoints, 300)}
                          step={25}
                          value={redeemPoints}
                          onChange={(e) => setRedeemPoints(Number(e.target.value))}
                          className="w-full accent-[#294B35]"
                        />
                      </div>
                    )}

                  {/* Payment Method Selection */}
                  <div className="space-y-2">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#6F4028]">
                      4. Payment Method ({store.commerce.razorpayMode === 'live' ? 'Live Gateway' : 'Razorpay Sandbox Test Mode'})
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {store.commerce.razorpayEnabled && (
                        <>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('razorpay_upi')}
                            className={`p-2.5 rounded-xl border text-left font-semibold flex items-center gap-2 cursor-pointer ${
                              paymentMethod === 'razorpay_upi'
                                ? 'bg-[#3B2418] text-[#FFF9F0] border-[#3B2418]'
                                : 'bg-white border-[#6F4028]/15'
                            }`}
                          >
                            <Wallet className="w-4 h-4 text-[#E68A24]" /> UPI (Razorpay)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('razorpay_card')}
                            className={`p-2.5 rounded-xl border text-left font-semibold flex items-center gap-2 cursor-pointer ${
                              paymentMethod === 'razorpay_card'
                                ? 'bg-[#3B2418] text-[#FFF9F0] border-[#3B2418]'
                                : 'bg-white border-[#6F4028]/15'
                            }`}
                          >
                            <CreditCard className="w-4 h-4 text-[#E68A24]" /> Card / NetBanking
                          </button>
                        </>
                      )}
                      {store.commerce.codEnabled && (
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('cod')}
                          className={`col-span-2 p-2.5 rounded-xl border text-left font-semibold flex items-center justify-between cursor-pointer ${
                            paymentMethod === 'cod'
                              ? 'bg-[#3B2418] text-[#FFF9F0] border-[#3B2418]'
                              : 'bg-white border-[#6F4028]/15'
                          }`}
                        >
                          <span>Cash on Delivery / Pay at Café Counter</span>
                          <span className="font-mono text-[10px] opacity-75">COD</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={pickupNote}
                    onChange={(e) => setPickupNote(e.target.value)}
                    placeholder="Order instructions (e.g., extra kulhads, ring bell)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-xs"
                  />

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Footer Totals & Step CTA */}
            {resolvedLines.length > 0 && (step === 'cart' || step === 'checkout') && (
              <div className="p-5 border-t border-[#144734]/12 bg-[#F4F7F5] space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[#6F4028]">
                    <span>Subtotal</span>
                    <span className="font-mono font-semibold text-[#3B2418]">
                      {formatInrExact(
                        quote?.subtotal ??
                          resolvedLines.reduce((s, r) => s + r.unitPrice * r.quantity, 0)
                      )}
                    </span>
                  </div>
                  {quote && quote.discountAmount > 0 && (
                    <div className="flex justify-between text-[#294B35] font-semibold">
                      <span>Coupon ({quote.couponApplied?.code})</span>
                      <span className="font-mono">
                        -{formatInrExact(quote.discountAmount)}
                      </span>
                    </div>
                  )}
                  {quote && quote.loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-[#294B35] font-semibold">
                      <span>Chai Coins Redeemed</span>
                      <span className="font-mono">
                        -{formatInrExact(quote.loyaltyDiscount)}
                      </span>
                    </div>
                  )}
                  {quote && (
                    <>
                      <div className="flex justify-between text-[#6F4028]">
                        <span>GST ({quote.taxRatePercent}%)</span>
                        <span className="font-mono">
                          {formatInrExact(quote.taxAmount)}
                        </span>
                      </div>
                      {orderType === 'delivery' && (
                        <div className="flex justify-between text-[#6F4028]">
                          <span>Delivery Fee</span>
                          <span className="font-mono">
                            {quote.deliveryFee === 0
                              ? 'FREE'
                              : formatInrExact(quote.deliveryFee)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="pt-2 border-t border-[#6F4028]/15 flex justify-between text-sm font-bold text-[#3B2418]">
                    <span>Final Payable</span>
                    <span className="font-mono">
                      {formatInrExact(
                        quote?.totalPayable ??
                          resolvedLines.reduce((s, r) => s + r.unitPrice * r.quantity, 0)
                      )}
                    </span>
                  </div>
                </div>

                {step === 'cart' ? (
                  <button
                    type="button"
                    disabled={hasUnavailableItems}
                    onClick={() => setStep('checkout')}
                    className="w-full py-3.5 px-6 rounded-full bg-[#144734] hover:bg-[#0F3829] disabled:opacity-45 text-white text-sm font-semibold cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Checkout &amp; Offers</span>
                    <ArrowRight className="w-4 h-4 text-[#E68A24]" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep('cart')}
                      className="px-4 py-3.5 rounded-full bg-white border border-[#6F4028]/20 text-xs font-semibold cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      form="full-checkout-form"
                      disabled={submitting || hasUnavailableItems}
                      className="flex-1 py-3.5 px-5 rounded-full bg-[#E68A24] hover:bg-[#D9A441] text-[#3B2418] text-sm font-bold cursor-pointer"
                    >
                      {submitting
                        ? 'Processing Order...'
                        : paymentMethod.startsWith('razorpay')
                          ? `Continue to Razorpay · ${formatInrExact(quote?.totalPayable || 0)}`
                          : `Confirm Order · ${formatInrExact(quote?.totalPayable || 0)}`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
