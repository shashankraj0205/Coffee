import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Sparkles,
  Bell,
  LogOut,
  CheckCircle2,
  RotateCcw,
  Printer,
  Download,
  Plus,
  Trash2,
  KeyRound,
  MailCheck,
  Copy,
  Check,
} from 'lucide-react';
import { CustomerOrder, MenuItem } from '../types/store';
import { useStore } from '../context/StoreContext';
import { apiClient } from '../services/api';
import { useModalEffects } from '../utils/useModalEffects';
import {
  ORDER_STATUS_META,
  printOrderReceipt,
  downloadOrderInvoice,
} from '../utils/commerce';
import { SOLEN_EASE } from './MotionPrimitives';

interface CustomerAccountModalProps {
  open: boolean;
  onClose: () => void;
  onReorderOrder: (order: CustomerOrder) => void;
  onQuickAddProduct: (item: MenuItem) => void;
}

type AuthView = 'login' | 'register' | 'forgot';
type HubTab = 'orders' | 'favourites' | 'addresses' | 'loyalty' | 'profile';

export const CustomerAccountModal: React.FC<CustomerAccountModalProps> = ({
  open,
  onClose,
  onReorderOrder,
  onQuickAddProduct,
}) => {
  const {
    store,
    customerUser,
    customerOrders,
    customerLoyaltyHistory,
    customerNotifications,
    loginCustomer,
    registerCustomer,
    logoutCustomer,
    verifyCustomerEmail,
    updateCustomerProfile,
    toggleFavourite,
    addCustomerAddress,
    deleteCustomerAddress,
  } = useStore();

  const [authView, setAuthView] = useState<AuthView>('login');
  const [hubTab, setHubTab] = useState<HubTab>('orders');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Auth form fields
  const [email, setEmail] = useState('ananya@studio.in');
  const [password, setPassword] = useState('chai1234');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Forgot/Reset password
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');

  // Verify email code
  const [verifyCodeInput, setVerifyCodeInput] = useState('');

  // Profile fields
  const [profName, setProfName] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profBirthday, setProfBirthday] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);

  // New Address Form
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [addrCity, setAddrCity] = useState('Bengaluru');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrPhone, setAddrPhone] = useState('');

  useModalEffects(open, onClose);

  useEffect(() => {
    if (customerUser) {
      setProfName(customerUser.name || '');
      setProfPhone(customerUser.phone || '');
      setProfBirthday(customerUser.birthday || '');
      setAddrPhone(customerUser.phone || '');
    }
  }, [customerUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrMsg(null);
    try {
      await loginCustomer(email, password);
      setInfoMsg('Welcome back! Your saved cart, addresses & Chai Coins are synced.');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrMsg(null);
    try {
      await registerCustomer({ name, email, phone, password, referralCode });
      setInfoMsg('Account created! Verify your email to unlock full Tapri perks.');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrMsg(null);
    try {
      const res = await apiClient.forgotPassword(resetEmail);
      setInfoMsg(
        res.devResetCode
          ? `${res.message} Dev/Test Code: ${res.devResetCode}`
          : res.message
      );
      if (res.devResetCode) setResetCode(res.devResetCode);
      setResetStep('confirm');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Unable to send reset code.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrMsg(null);
    try {
      await apiClient.resetPassword(resetEmail, resetCode, newPassword);
      setInfoMsg('Password updated! Sign in with your new password.');
      setEmail(resetEmail);
      setPassword(newPassword);
      setAuthView('login');
      setResetStep('request');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrMsg(null);
    try {
      await addCustomerAddress({
        label: addrLabel,
        recipientName: customerUser?.name || 'Guest',
        phone: addrPhone || customerUser?.phone || '+91',
        line1: addrLine1,
        landmark: addrLandmark,
        city: addrCity,
        pincode: addrPincode,
        isDefault: (customerUser?.addresses?.length || 0) === 0,
      });
      setAddrLine1('');
      setAddrLandmark('');
      setAddrPincode('');
      setInfoMsg('Delivery address saved.');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Could not save address.');
    } finally {
      setBusy(false);
    }
  };

  const favProducts = store.menuItems.filter((m) =>
    (customerUser?.favourites || []).includes(m.id)
  );

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Customer Account & Orders Hub"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1E120C]/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.28, ease: SOLEN_EASE }}
            className="relative z-10 w-full max-w-3xl h-full sm:h-auto sm:max-h-[88vh] sm:rounded-[2rem] bg-white text-[#15241E] border border-[#144734]/15 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-[#144734] text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E68A24] text-[#3B2418] font-bold flex items-center justify-center">
                  {customerUser ? (
                    customerUser.name.slice(0, 2).toUpperCase()
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="font-serif text-xl font-semibold">
                    {customerUser
                      ? `नमस्ते, ${customerUser.name}`
                      : `${store.brand.name} Customer Account`}
                  </h2>
                  <p className="text-xs text-[#F5EBDD]/70">
                    {customerUser
                      ? `${customerUser.loyaltyPoints} Chai Coins · ${customerUser.membershipLevel}`
                      : 'Sign in for saved carts, addresses, 1-click reorder & Chai Coins'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {customerUser && (
                  <button
                    type="button"
                    onClick={() => {
                      logoutCustomer();
                      setInfoMsg(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close account hub"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            {!customerUser ? (
              <div className="p-6 sm:p-8 overflow-y-auto space-y-5">
                <div className="flex gap-2 p-1 rounded-full bg-[#F5EBDD] border border-[#6F4028]/15 max-w-sm mx-auto">
                  {(
                    [
                      { id: 'login', label: 'Sign In' },
                      { id: 'register', label: 'Create Account' },
                      { id: 'forgot', label: 'Reset Password' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setAuthView(t.id);
                        setErrMsg(null);
                        setInfoMsg(null);
                      }}
                      className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                        authView === t.id
                          ? 'bg-[#3B2418] text-[#FFF9F0]'
                          : 'text-[#6F4028]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {infoMsg && (
                  <p className="p-3 rounded-xl bg-[#294B35]/10 border border-[#294B35]/25 text-xs font-medium text-[#294B35]">
                    {infoMsg}
                  </p>
                )}
                {errMsg && (
                  <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                    {errMsg}
                  </p>
                )}

                {authView === 'login' && (
                  <form onSubmit={handleLogin} className="max-w-md mx-auto space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white border border-[#6F4028]/20 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white border border-[#6F4028]/20 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-3.5 rounded-full bg-[#3B2418] hover:bg-[#6F4028] text-[#FFF9F0] text-sm font-bold cursor-pointer"
                    >
                      {busy ? 'Signing in...' : 'Sign In to My Chai Account'}
                    </button>
                    <div className="p-3.5 rounded-2xl bg-[#F5EBDD] border border-[#6F4028]/15 text-xs flex items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-[10px] uppercase text-[#6F4028]">
                          Demo Verified Buyer Account
                        </p>
                        <p className="font-mono font-semibold text-[#3B2418]">
                          ananya@studio.in · chai1234
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail('ananya@studio.in');
                          setPassword('chai1234');
                        }}
                        className="text-xs font-semibold text-[#E68A24] hover:underline cursor-pointer"
                      >
                        Fill
                      </button>
                    </div>
                  </form>
                )}

                {authView === 'register' && (
                  <form onSubmit={handleRegister} className="max-w-md mx-auto space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full Name *"
                        className="px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-sm"
                      />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Mobile (+91...)"
                        className="px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-sm"
                      />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address *"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-sm"
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create Password (min 6 chars) *"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-sm"
                    />
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="Referral Code (optional, e.g., ananya-chai)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-sm font-mono"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-3.5 rounded-full bg-[#E68A24] hover:bg-[#D9A441] text-[#3B2418] text-sm font-bold cursor-pointer"
                    >
                      {busy
                        ? 'Creating Account...'
                        : `Create Account & Earn +${store.rewards.welcomeBonusBeans} Coins`}
                    </button>
                  </form>
                )}

                {authView === 'forgot' && (
                  <div className="max-w-md mx-auto space-y-4">
                    {resetStep === 'request' ? (
                      <form onSubmit={handleForgotRequest} className="space-y-3.5">
                        <p className="text-xs text-[#6F4028]">
                          Enter your registered email to receive a password reset code.
                        </p>
                        <input
                          type="email"
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full px-4 py-3 rounded-xl bg-white border border-[#6F4028]/20 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          className="w-full py-3 rounded-full bg-[#3B2418] text-[#FFF9F0] text-sm font-semibold cursor-pointer inline-flex items-center justify-center gap-2"
                        >
                          <KeyRound className="w-4 h-4 text-[#E68A24]" />
                          <span>Send Reset Code</span>
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleResetConfirm} className="space-y-3.5">
                        <input
                          type="text"
                          required
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          placeholder="6-digit Reset Code"
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-sm font-mono"
                        />
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New Password (min 6 chars)"
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#6F4028]/20 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          className="w-full py-3 rounded-full bg-[#E68A24] text-[#3B2418] text-sm font-bold cursor-pointer"
                        >
                          Confirm New Password
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Email Verification Banner if unverified */}
                {!customerUser.emailVerified && (
                  <div className="px-6 py-3 bg-[#E68A24]/15 border-b border-[#E68A24]/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <MailCheck className="w-4 h-4 text-[#6F4028]" />
                      <span>
                        Verify your email
                        {customerUser.verificationCodePreview
                          ? ` (Code: ${customerUser.verificationCodePreview})`
                          : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={verifyCodeInput}
                        onChange={(e) => setVerifyCodeInput(e.target.value)}
                        placeholder="6-digit code"
                        className="w-28 px-2.5 py-1 rounded-lg bg-white border border-[#6F4028]/25 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          setErrMsg(null);
                          try {
                            await verifyCustomerEmail(verifyCodeInput);
                            setInfoMsg('Email verified successfully!');
                          } catch (e) {
                            setErrMsg(e instanceof Error ? e.message : 'Invalid code');
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-[#294B35] text-[#FFF9F0] font-semibold cursor-pointer"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                )}

                {/* Hub Navigation Tabs */}
                <div className="px-5 py-2.5 bg-[#F5EBDD] border-b border-[#6F4028]/15 flex gap-1.5 overflow-x-auto shrink-0">
                  {(
                    [
                      { id: 'orders', label: `Orders (${customerOrders.length})`, icon: ShoppingBag },
                      { id: 'favourites', label: `Favourites (${favProducts.length})`, icon: Heart },
                      { id: 'addresses', label: `Addresses (${customerUser.addresses.length})`, icon: MapPin },
                      { id: 'loyalty', label: `Chai Coins (${customerUser.loyaltyPoints})`, icon: Sparkles },
                      { id: 'profile', label: 'Profile & Alerts', icon: Bell },
                    ] as const
                  ).map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setHubTab(t.id);
                          setErrMsg(null);
                          setInfoMsg(null);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                          hubTab === t.id
                            ? 'bg-[#3B2418] text-[#FFF9F0]'
                            : 'text-[#6F4028] hover:bg-[#FFF9F0]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Panel */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {infoMsg && (
                    <p className="p-3 rounded-xl bg-[#294B35]/10 text-[#294B35] text-xs font-medium">
                      {infoMsg}
                    </p>
                  )}
                  {errMsg && (
                    <p className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium">
                      {errMsg}
                    </p>
                  )}

                  {/* Orders History + Reorder + Receipt/Invoice */}
                  {hubTab === 'orders' && (
                    <div className="space-y-3">
                      {customerOrders.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-[#F5EBDD]/60 text-center text-sm text-[#6F4028]">
                          No orders yet! Add your favourite Masala Chai or Filter Coffee from the menu.
                        </div>
                      ) : (
                        customerOrders.map((ord) => (
                          <div
                            key={ord.id}
                            className="p-4 rounded-2xl bg-white border border-[#6F4028]/15 space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-[#3B2418] text-[#D9A441]">
                                  {ord.orderNumber}
                                </span>
                                <span className="text-xs font-semibold capitalize px-2.5 py-0.5 rounded-full bg-[#F5EBDD] text-[#6F4028]">
                                  {ORDER_STATUS_META[ord.status]?.label || ord.status}
                                </span>
                                <span className="text-[11px] font-mono text-[#6F4028]">
                                  {ord.orderType.toUpperCase()}
                                </span>
                              </div>
                              <span className="font-mono text-sm font-bold text-[#3B2418]">
                                ₹{ord.totalPayable.toFixed(2)}
                              </span>
                            </div>

                            <div className="text-xs text-[#6F4028] space-y-0.5">
                              {ord.items.map((it, idx) => (
                                <p key={`${it.itemId}-${idx}`}>
                                  {it.quantity}× <strong>{it.name}</strong> ({it.size},{' '}
                                  {it.temperature}, {it.sugarPreference}) — ₹
                                  {it.price * it.quantity}
                                </p>
                              ))}
                            </div>

                            <div className="pt-2 border-t border-[#6F4028]/10 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] text-[#6F4028]">
                                {new Date(ord.createdAt).toLocaleString('en-IN')} · Paid via{' '}
                                {ord.paymentMethod.replace('razorpay_', 'Razorpay ').toUpperCase()}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onReorderOrder(ord);
                                    onClose();
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#E68A24] text-[#3B2418] text-xs font-bold cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" /> Reorder
                                </button>
                                <button
                                  type="button"
                                  onClick={() => printOrderReceipt(ord, store.brand)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F5EBDD] text-[#3B2418] text-xs font-semibold cursor-pointer"
                                >
                                  <Printer className="w-3 h-3" /> Receipt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => downloadOrderInvoice(ord, store.brand)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F5EBDD] text-[#3B2418] text-xs font-semibold cursor-pointer"
                                >
                                  <Download className="w-3 h-3" /> Invoice
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Favourites */}
                  {hubTab === 'favourites' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {favProducts.length === 0 ? (
                        <div className="sm:col-span-2 p-8 rounded-2xl bg-[#F5EBDD]/60 text-center text-sm text-[#6F4028]">
                          Tap the heart icon on any chai or coffee to save your favourites here.
                        </div>
                      ) : (
                        favProducts.map((item) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-2xl bg-white border border-[#6F4028]/15 flex items-center gap-3"
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-14 h-14 rounded-xl object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-serif font-semibold text-sm truncate">
                                {item.name}
                              </p>
                              <p className="font-mono text-xs text-[#6F4028]">
                                ₹{item.price}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onQuickAddProduct(item)}
                                  className="px-2.5 py-1 rounded-full bg-[#3B2418] text-[#FFF9F0] text-[11px] font-semibold cursor-pointer"
                                >
                                  + Add to Tray
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleFavourite(item.id)}
                                  className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Saved Delivery Addresses */}
                  {hubTab === 'addresses' && (
                    <div className="space-y-4">
                      <div className="space-y-2.5">
                        {customerUser.addresses.map((addr) => (
                          <div
                            key={addr.id}
                            className="p-4 rounded-2xl bg-white border border-[#6F4028]/15 flex items-start justify-between gap-3"
                          >
                            <div>
                              <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-[#F5EBDD] text-[#6F4028] font-semibold">
                                {addr.label}
                              </span>
                              <p className="text-sm font-semibold mt-1">
                                {addr.line1}
                              </p>
                              <p className="text-xs text-[#6F4028]">
                                {addr.landmark ? `${addr.landmark}, ` : ''}
                                {addr.city} - {addr.pincode} · {addr.phone}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteCustomerAddress(addr.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-full cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <form
                        onSubmit={handleAddAddress}
                        className="p-4 rounded-2xl bg-[#F5EBDD]/70 border border-[#6F4028]/15 space-y-3"
                      >
                        <p className="text-xs font-bold uppercase font-mono text-[#6F4028]">
                          + Add New Delivery Address
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <select
                            value={addrLabel}
                            onChange={(e) => setAddrLabel(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-white border border-[#6F4028]/20 text-xs"
                          >
                            <option>Home</option>
                            <option>Office / Studio</option>
                            <option>Other</option>
                          </select>
                          <input
                            type="tel"
                            required
                            value={addrPhone}
                            onChange={(e) => setAddrPhone(e.target.value)}
                            placeholder="Delivery Phone *"
                            className="px-3 py-2 rounded-xl bg-white border border-[#6F4028]/20 text-xs"
                          />
                          <input
                            type="text"
                            required
                            value={addrPincode}
                            onChange={(e) => setAddrPincode(e.target.value)}
                            placeholder="Pincode (e.g., 560038) *"
                            className="px-3 py-2 rounded-xl bg-white border border-[#6F4028]/20 text-xs font-mono"
                          />
                        </div>
                        <input
                          type="text"
                          required
                          value={addrLine1}
                          onChange={(e) => setAddrLine1(e.target.value)}
                          placeholder="House / Flat / Street Address *"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#6F4028]/20 text-xs"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            value={addrLandmark}
                            onChange={(e) => setAddrLandmark(e.target.value)}
                            placeholder="Landmark (optional)"
                            className="px-3 py-2 rounded-xl bg-white border border-[#6F4028]/20 text-xs"
                          />
                          <input
                            type="text"
                            required
                            value={addrCity}
                            onChange={(e) => setAddrCity(e.target.value)}
                            placeholder="City *"
                            className="px-3 py-2 rounded-xl bg-white border border-[#6F4028]/20 text-xs"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#3B2418] text-[#FFF9F0] text-xs font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#E68A24]" /> Save Address
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Loyalty Points & Referral Ledger */}
                  {hubTab === 'loyalty' && (
                    <div className="space-y-4">
                      <div className="p-5 rounded-3xl bg-[#3B2418] text-[#FFF9F0] flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-[#D9A441]">
                            Available Chai Coins Balance
                          </p>
                          <p className="font-serif text-4xl font-semibold mt-1">
                            {customerUser.loyaltyPoints}{' '}
                            <span className="text-base font-sans text-[#E68A24]">
                              Coins (≈ ₹
                              {Math.round(
                                customerUser.loyaltyPoints *
                                  store.commerce.pointRedemptionValueInr
                              )}
                              )
                            </span>
                          </p>
                          <p className="text-xs text-[#F5EBDD]/75 mt-1">
                            Redeemable directly inside your Chai &amp; Kaapi Tray checkout!
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/10 border border-[#D9A441]/30">
                          <p className="font-mono text-[10px] uppercase text-[#D9A441]">
                            Your Referral Code
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-sm font-bold">
                              {customerUser.referralCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard
                                  ?.writeText(customerUser.referralCode)
                                  .catch(() => {});
                                setCopiedRef(true);
                                setTimeout(() => setCopiedRef(false), 1800);
                              }}
                              className="p-1.5 rounded-full bg-[#E68A24] text-[#3B2418] cursor-pointer"
                            >
                              {copiedRef ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="font-mono text-[11px] uppercase tracking-wider text-[#6F4028]">
                          Reward Transaction History
                        </p>
                        {customerLoyaltyHistory.map((tx) => (
                          <div
                            key={tx.id}
                            className="p-3.5 rounded-2xl bg-white border border-[#6F4028]/12 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-semibold text-[#3B2418]">
                                {tx.description}
                              </p>
                              <p className="text-[11px] text-[#6F4028]">
                                {new Date(tx.createdAt).toLocaleString('en-IN')}
                              </p>
                            </div>
                            <span
                              className={`font-mono font-bold ${
                                tx.pointsDelta >= 0
                                  ? 'text-[#294B35]'
                                  : 'text-rose-600'
                              }`}
                            >
                              {tx.pointsDelta >= 0
                                ? `+${tx.pointsDelta}`
                                : tx.pointsDelta}{' '}
                              Coins
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Profile Settings & Notifications */}
                  {hubTab === 'profile' && (
                    <div className="space-y-5">
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await updateCustomerProfile({
                            name: profName,
                            phone: profPhone,
                            birthday: profBirthday,
                          });
                          setInfoMsg('Profile saved! Birthday bonus Coins active.');
                        }}
                        className="p-4 rounded-2xl bg-white border border-[#6F4028]/15 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase font-mono text-[#6F4028]">
                            Account Profile
                          </p>
                          {customerUser.emailVerified && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#294B35]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified Email
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] text-[#6F4028] mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={profName}
                              onChange={(e) => setProfName(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#FFF9F0] border border-[#6F4028]/20 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#6F4028] mb-1">
                              Phone
                            </label>
                            <input
                              type="tel"
                              value={profPhone}
                              onChange={(e) => setProfPhone(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#FFF9F0] border border-[#6F4028]/20 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#6F4028] mb-1">
                              Birthday (+{store.commerce.birthdayBonusPoints} Coins)
                            </label>
                            <input
                              type="date"
                              value={profBirthday}
                              onChange={(e) => setProfBirthday(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#FFF9F0] border border-[#6F4028]/20 text-xs font-mono"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-full bg-[#3B2418] text-[#FFF9F0] text-xs font-semibold cursor-pointer"
                        >
                          Save Profile
                        </button>
                      </form>

                      <div className="space-y-2">
                        <p className="font-mono text-[11px] uppercase tracking-wider text-[#6F4028]">
                          Your Notifications ({customerNotifications.length})
                        </p>
                        {customerNotifications.length === 0 ? (
                          <p className="text-xs text-[#6F4028] p-4 rounded-2xl bg-[#F5EBDD]/50">
                            Order status &amp; reward notifications will appear here in real time.
                          </p>
                        ) : (
                          customerNotifications.map((n) => (
                            <div
                              key={n.id}
                              className="p-3.5 rounded-2xl bg-white border border-[#6F4028]/12"
                            >
                              <p className="text-xs font-bold text-[#3B2418]">
                                {n.title}
                              </p>
                              <p className="text-xs text-[#6F4028] mt-0.5">
                                {n.message}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
