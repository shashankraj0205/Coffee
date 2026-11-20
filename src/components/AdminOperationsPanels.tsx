import React, { useState } from 'react';
import {
  Printer,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Plus,
  Tag,
  MessageSquare,
  Bell,
  CheckCircle2,
  ChefHat,
  Package,
} from 'lucide-react';
import { OrderStatus } from '../types/store';
import { useStore } from '../context/StoreContext';
import { ORDER_STATUS_META, printOrderReceipt, formatInrExact } from '../utils/commerce';

const ALL_ORDER_STATUSES: OrderStatus[] = [
  'order_placed',
  'order_accepted',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export const AdminOrdersAndKdsPanel: React.FC<{ notify: (m: string) => void }> = ({
  notify,
}) => {
  const { store, updateOrderStatus, refundOrder, deleteOrder } = useStore();
  const [viewMode, setViewMode] = useState<'kds' | 'all'>('kds');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  const kdsQueue = store.orders.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status)
  );
  const filtered =
    statusFilter === 'all'
      ? store.orders
      : store.orders.filter((o) => o.status === statusFilter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl font-medium">
            Kitchen Display System (KDS) &amp; Order Manager
          </h3>
          <p className="text-xs text-[#FAF8F5]/60 mt-0.5">
            Accept, brew, dispatch pickup/delivery/table orders, print receipts &amp; issue refunds.
          </p>
        </div>
        <div className="inline-flex p-1 rounded-full bg-white/[0.06] border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('kds')}
            className={`px-3.5 py-1.5 rounded-full font-semibold cursor-pointer inline-flex items-center gap-1.5 ${
              viewMode === 'kds'
                ? 'bg-[#E68A24] text-[#3B2418]'
                : 'text-[#FAF8F5]/70'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" /> Live Kitchen ({kdsQueue.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3.5 py-1.5 rounded-full font-semibold cursor-pointer ${
              viewMode === 'all'
                ? 'bg-[#E68A24] text-[#3B2418]'
                : 'text-[#FAF8F5]/70'
            }`}
          >
            All Orders ({store.orders.length})
          </button>
        </div>
      </div>

      {viewMode === 'kds' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kdsQueue.length === 0 ? (
            <div className="md:col-span-2 p-10 rounded-3xl bg-white/[0.03] border border-white/10 text-center text-sm text-[#FAF8F5]/60">
              All chai kettles clear! No active pending orders in queue.
            </div>
          ) : (
            kdsQueue.map((ord) => (
              <div
                key={ord.id}
                className="p-5 rounded-3xl bg-white/[0.05] border-2 border-[#E68A24]/40 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-lg bg-[#E68A24] text-[#3B2418]">
                      {ord.orderNumber}
                    </span>
                    <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded bg-white/10">
                      {ord.orderType}
                      {ord.tableNumber ? ` · ${ord.tableNumber}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => printOrderReceipt(ord, store.brand)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
                    title="Print Kitchen Ticket / Receipt"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-[#FAF8F5]/75">
                  <strong>{ord.customerName}</strong> · {ord.customerPhone || ord.customerEmail}
                  {ord.scheduledFor && (
                    <span className="ml-2 text-[#D9A441] font-mono">
                      Scheduled: {ord.scheduledFor}
                    </span>
                  )}
                </p>

                <div className="space-y-1.5 p-3 rounded-2xl bg-black/25 text-xs">
                  {ord.items.map((it, idx) => (
                    <div key={idx}>
                      <span className="font-bold text-[#D9A441]">
                        {it.quantity}× {it.name}
                      </span>{' '}
                      <span className="text-[#FAF8F5]/70">
                        ({it.size}, {it.temperature}, {it.sugarPreference}, {it.milkStrength})
                      </span>
                      {it.specialInstructions && (
                        <p className="text-[11px] text-[#E68A24] italic">
                          Note: {it.specialInstructions}
                        </p>
                      )}
                    </div>
                  ))}
                  {ord.pickupNote && (
                    <p className="pt-1 border-t border-white/10 text-[11px] text-[#D9A441]">
                      Bar Note: “{ord.pickupNote}”
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {ALL_ORDER_STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={async () => {
                        await updateOrderStatus(ord.id, st);
                        notify(`#${ord.orderNumber} → ${ORDER_STATUS_META[st].label}`);
                      }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold cursor-pointer border ${
                        ord.status === st
                          ? 'bg-[#A8D5AB] text-[#140F0C] border-[#A8D5AB]'
                          : 'bg-white/[0.04] border-white/15 text-[#FAF8F5]/70 hover:bg-white/10'
                      }`}
                    >
                      {ORDER_STATUS_META[st].label}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                statusFilter === 'all' ? 'bg-[#E68A24] text-[#3B2418]' : 'bg-white/10'
              }`}
            >
              All ({store.orders.length})
            </button>
            {ALL_ORDER_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                  statusFilter === st ? 'bg-[#E68A24] text-[#3B2418]' : 'bg-white/10'
                }`}
              >
                {ORDER_STATUS_META[st].label}
              </button>
            ))}
          </div>

          {filtered.map((ord) => (
            <div
              key={ord.id}
              className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E68A24]/20 text-[#D9A441]">
                    {ord.orderNumber}
                  </span>
                  <span className="font-semibold text-sm">{ord.customerName}</span>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-white/10">
                    {ord.orderType} · {ord.paymentMethod.replace('razorpay_', 'RZP ')} ({ord.paymentStatus})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">
                    {formatInrExact(ord.totalPayable)}
                  </span>
                  <button
                    type="button"
                    onClick={() => printOrderReceipt(ord, store.brand)}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
                    title="Print Receipt"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                  {ord.paymentStatus === 'paid' && (
                    <button
                      type="button"
                      onClick={async () => {
                        await refundOrder(ord.id);
                        notify(`Refund issued for #${ord.orderNumber}`);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 text-[10px] font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Refund
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteOrder(ord.id);
                      notify(`Deleted #${ord.orderNumber}`);
                    }}
                    className="p-1.5 rounded-full bg-rose-500/20 text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-[#FAF8F5]/75">
                {ord.items.map((i) => `${i.quantity}× ${i.name} (${i.size})`).join(' · ')}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ALL_ORDER_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={async () => {
                      await updateOrderStatus(ord.id, st);
                      notify(`#${ord.orderNumber} → ${ORDER_STATUS_META[st].label}`);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold cursor-pointer border ${
                      ord.status === st
                        ? 'bg-[#A8D5AB] text-[#140F0C] border-[#A8D5AB]'
                        : 'bg-white/[0.04] border-white/10 text-[#FAF8F5]/65'
                    }`}
                  >
                    {ORDER_STATUS_META[st].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AdminInventoryPanel: React.FC<{ notify: (m: string) => void }> = ({
  notify,
}) => {
  const { store, adjustIngredient } = useStore();
  const lowItems = store.ingredients.filter(
    (i) => i.stockQty <= i.lowStockThreshold
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl font-medium flex items-center gap-2">
            <Package className="w-5 h-5 text-[#E68A24]" />
            Ingredient Inventory &amp; Stock Consumption
          </h3>
          <p className="text-xs text-[#FAF8F5]/60 mt-0.5">
            Automatically deducts tea leaves, coffee beans, milk, ginger, cardamom, saffron &amp; clay kulhads from live orders.
          </p>
        </div>
        {lowItems.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4" />
            {lowItems.length} Low-Stock Alert(s)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {store.ingredients.map((ing) => {
          const isLow = ing.stockQty <= ing.lowStockThreshold;
          const pct = Math.min(
            100,
            Math.round((ing.stockQty / Math.max(1, ing.lowStockThreshold * 4)) * 100)
          );
          return (
            <div
              key={ing.id}
              className={`p-4 rounded-2xl border space-y-3 ${
                isLow
                  ? 'bg-rose-500/10 border-rose-400/40'
                  : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{ing.name}</p>
                  <p className="text-[11px] text-[#FAF8F5]/60">
                    Alert below {ing.lowStockThreshold} {ing.unit} · ₹{ing.costPerUnit}/{ing.unit}
                  </p>
                </div>
                <span
                  className={`font-mono text-sm font-bold ${
                    isLow ? 'text-rose-300' : 'text-[#D9A441]'
                  }`}
                >
                  {ing.stockQty} {ing.unit}
                </span>
              </div>

              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  style={{ width: `${pct}%` }}
                  className={`h-full rounded-full ${isLow ? 'bg-rose-400' : 'bg-[#A8D5AB]'}`}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[50, 250, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={async () => {
                      const step = ing.unit === 'pcs' || ing.unit === 'pinches' ? Math.round(amt / 10) : amt;
                      await adjustIngredient(
                        ing.id,
                        step,
                        `Manual restock (+${step} ${ing.unit})`
                      );
                      notify(`Restocked ${ing.name} (+${step} ${ing.unit})`);
                    }}
                    className="px-2.5 py-1 rounded-full bg-[#294B35] hover:bg-[#356145] text-[11px] font-mono font-semibold cursor-pointer"
                  >
                    +{ing.unit === 'pcs' || ing.unit === 'pinches' ? Math.round(amt / 10) : amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={async () => {
                    const step = ing.unit === 'pcs' || ing.unit === 'pinches' ? 5 : 50;
                    await adjustIngredient(ing.id, -step, 'Manual wastage/check adjustment');
                    notify(`Adjusted ${ing.name} (-${step} ${ing.unit})`);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-mono cursor-pointer ml-auto"
                >
                  -{ing.unit === 'pcs' || ing.unit === 'pinches' ? 5 : 50}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Audit Log */}
      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 space-y-2.5">
        <h4 className="font-serif text-lg font-medium">Recent Inventory Audit History</h4>
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {store.inventoryLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.06]"
            >
              <div className="min-w-0 pr-3">
                <span className="font-semibold">{log.ingredientName}</span>{' '}
                <span className="text-[#FAF8F5]/60">· {log.reason}</span>
              </div>
              <span
                className={`font-mono font-bold shrink-0 ${
                  log.changeQty >= 0 ? 'text-[#A8D5AB]' : 'text-[#E68A24]'
                }`}
              >
                {log.changeQty >= 0 ? `+${log.changeQty}` : log.changeQty}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminCouponsAndCommercePanel: React.FC<{ notify: (m: string) => void }> = ({
  notify,
}) => {
  const { store, updateSettings, createCoupon, toggleCoupon, deleteCoupon } = useStore();
  const [comm, setComm] = useState(store.commerce);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(15);
  const [minOrderValue, setMinOrderValue] = useState(120);
  const [maxDiscount, setMaxDiscount] = useState(60);
  const [isFestival, setIsFestival] = useState(false);

  return (
    <div className="space-y-6">
      {/* Taxes, Delivery, Payment & Loyalty Config */}
      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-serif text-xl font-medium">
              Taxes (GST), Delivery, Payment &amp; Loyalty Rules
            </h3>
            <p className="text-xs text-[#FAF8F5]/60">
              All cart &amp; checkout totals are computed and validated server-side from these settings.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await updateSettings({ commerce: comm });
              notify('Saved GST, delivery, payment & loyalty rules');
            }}
            className="px-4 py-2 rounded-full bg-[#E68A24] text-[#3B2418] text-xs font-bold cursor-pointer"
          >
            Save Commerce Settings
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[#FAF8F5]/70 mb-1">GST Tax (%)</label>
            <input
              type="number"
              min={0}
              max={28}
              value={comm.taxRatePercent}
              onChange={(e) => setComm({ ...comm, taxRatePercent: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.07] border border-white/15 font-mono"
            />
          </div>
          <div>
            <label className="block text-[#FAF8F5]/70 mb-1">Delivery Fee (₹)</label>
            <input
              type="number"
              min={0}
              value={comm.deliveryCharge}
              onChange={(e) => setComm({ ...comm, deliveryCharge: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.07] border border-white/15 font-mono"
            />
          </div>
          <div>
            <label className="block text-[#FAF8F5]/70 mb-1">Free Delivery Above (₹)</label>
            <input
              type="number"
              min={0}
              value={comm.freeDeliveryAbove}
              onChange={(e) => setComm({ ...comm, freeDeliveryAbove: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.07] border border-white/15 font-mono"
            />
          </div>
          <div>
            <label className="block text-[#FAF8F5]/70 mb-1">Coins per ₹100</label>
            <input
              type="number"
              min={1}
              value={comm.loyaltyPointsPer100}
              onChange={(e) => setComm({ ...comm, loyaltyPointsPer100: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.07] border border-white/15 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer">
            <span>Enable Razorpay (UPI / Card / NetBanking)</span>
            <input
              type="checkbox"
              checked={comm.razorpayEnabled}
              onChange={(e) => setComm({ ...comm, razorpayEnabled: e.target.checked })}
              className="accent-[#E68A24]"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer">
            <span>Enable Cash on Delivery / Pay at Counter</span>
            <input
              type="checkbox"
              checked={comm.codEnabled}
              onChange={(e) => setComm({ ...comm, codEnabled: e.target.checked })}
              className="accent-[#E68A24]"
            />
          </label>
        </div>
      </div>

      {/* Dynamic Coupon Manager */}
      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 space-y-4">
        <h3 className="font-serif text-xl font-medium flex items-center gap-2">
          <Tag className="w-5 h-5 text-[#E68A24]" /> Coupons &amp; Festival Offers
        </h3>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!code.trim()) return;
            await createCoupon({
              code: code.trim().toUpperCase(),
              title: title.trim() || `${code.toUpperCase()} Offer`,
              discountType,
              discountValue,
              minOrderValue,
              maxDiscount,
              isFestival,
            });
            setCode('');
            setTitle('');
            notify('Created new coupon offer');
          }}
          className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs"
        >
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE (e.g., MONSOON25)"
            className="col-span-2 px-3 py-2 rounded-xl bg-white/[0.07] border border-white/15 font-mono uppercase"
          />
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
            className="px-2.5 py-2 rounded-xl bg-[#251D19] border border-white/15"
          >
            <option value="percentage">% Off</option>
            <option value="fixed">₹ Fixed</option>
          </select>
          <input
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            placeholder="Value"
            className="px-3 py-2 rounded-xl bg-white/[0.07] border border-white/15 font-mono"
          />
          <input
            type="number"
            value={minOrderValue}
            onChange={(e) => setMinOrderValue(Number(e.target.value))}
            placeholder="Min ₹"
            className="px-3 py-2 rounded-xl bg-white/[0.07] border border-white/15 font-mono"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-[#E68A24] text-[#3B2418] font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Offer display title"
            className="col-span-3 px-3 py-2 rounded-xl bg-white/[0.07] border border-white/15"
          />
          <input
            type="number"
            value={maxDiscount}
            onChange={(e) => setMaxDiscount(Number(e.target.value))}
            placeholder="Max cap ₹"
            className="col-span-1 px-3 py-2 rounded-xl bg-white/[0.07] border border-white/15 font-mono"
          />
          <label className="col-span-2 flex items-center gap-2 px-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFestival}
              onChange={(e) => setIsFestival(e.target.checked)}
              className="accent-[#E68A24]"
            />
            <span>Festival Promo Tag</span>
          </label>
        </form>

        <div className="space-y-2">
          {store.coupons.map((c) => (
            <div
              key={c.id}
              className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div>
                <span className="font-mono font-bold text-[#D9A441] mr-2">
                  {c.code}
                </span>
                <span className="font-semibold">{c.title}</span>
                <p className="text-[11px] text-[#FAF8F5]/60 mt-0.5">
                  {c.discountType === 'percentage'
                    ? `${c.discountValue}% off`
                    : `₹${c.discountValue} off`}{' '}
                  · Min ₹{c.minOrderValue} · Used {c.timesUsed}×
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await toggleCoupon(c.id, !c.active);
                    notify(`${c.code} ${!c.active ? 'activated' : 'paused'}`);
                  }}
                  className={`px-3 py-1 rounded-full font-semibold cursor-pointer ${
                    c.active
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-white/10 text-[#FAF8F5]/55'
                  }`}
                >
                  {c.active ? 'Active' : 'Paused'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteCoupon(c.id);
                    notify(`Deleted coupon ${c.code}`);
                  }}
                  className="p-1.5 rounded-full bg-rose-500/20 text-rose-300 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminReviewsSupportPanel: React.FC<{ notify: (m: string) => void }> = ({
  notify,
}) => {
  const {
    store,
    moderateReview,
    deleteReview,
    updateSupportTicket,
    markAdminNotificationsRead,
  } = useStore();
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      {/* Admin Notifications */}
      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl font-medium flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#E68A24]" /> Admin Alerts &amp; Notifications
          </h3>
          <button
            type="button"
            onClick={async () => {
              await markAdminNotificationsRead();
              notify('Marked all alerts as read');
            }}
            className="text-xs font-semibold text-[#D9A441] hover:underline cursor-pointer"
          >
            Mark All Read
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {store.notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3 rounded-xl border text-xs ${
                n.read
                  ? 'bg-white/[0.02] border-white/[0.06] opacity-70'
                  : 'bg-[#E68A24]/15 border-[#E68A24]/40'
              }`}
            >
              <p className="font-semibold">{n.title}</p>
              <p className="text-[#FAF8F5]/75 mt-0.5">{n.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Verified Reviews Moderation */}
      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 space-y-3">
        <h3 className="font-serif text-xl font-medium">
          Product Reviews Moderation ({store.reviews.length})
        </h3>
        <div className="space-y-3">
          {store.reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold">{rev.userName}</span> on{' '}
                  <span className="text-[#D9A441] font-semibold">
                    {rev.productName || rev.productId}
                  </span>{' '}
                  <span className="text-[#E68A24]">{'★'.repeat(rev.rating)}</span>
                  {rev.reported && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-200 text-[10px]">
                      Reported
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      await moderateReview(rev.id, {
                        status: rev.status === 'approved' ? 'hidden' : 'approved',
                        reported: false,
                      });
                      notify('Review visibility updated');
                    }}
                    className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
                  >
                    {rev.status === 'approved' ? 'Hide' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteReview(rev.id);
                      notify('Review deleted');
                    }}
                    className="p-1.5 rounded-full bg-rose-500/20 text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[#FAF8F5]/80">“{rev.comment}”</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyDrafts[rev.id] ?? rev.adminReply ?? ''}
                  onChange={(e) =>
                    setReplyDrafts({ ...replyDrafts, [rev.id]: e.target.value })
                  }
                  placeholder="Write official café reply..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.07] border border-white/10 text-xs"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await moderateReview(rev.id, {
                      adminReply: replyDrafts[rev.id] ?? rev.adminReply ?? '',
                    });
                    notify('Saved official reply');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#E68A24] text-[#3B2418] font-bold cursor-pointer"
                >
                  Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Support Inbox */}
      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 space-y-3">
        <h3 className="font-serif text-xl font-medium flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#A8D5AB]" /> Customer Support Inbox (
          {store.supportTickets.length})
        </h3>
        {store.supportTickets.map((t) => (
          <div
            key={t.id}
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-start justify-between gap-3 text-xs"
          >
            <div className="space-y-1 max-w-xl">
              <p className="font-semibold">
                {t.subject} · <span className="text-[#D9A441]">{t.name}</span> ({t.email})
              </p>
              <p className="text-[#FAF8F5]/75">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const next = t.status === 'resolved' ? 'open' : 'resolved';
                await updateSupportTicket(t.id, next, 'Handled by café desk');
                notify(`Ticket marked ${next}`);
              }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-semibold cursor-pointer ${
                t.status === 'resolved'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-[#E68A24] text-[#3B2418]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t.status === 'resolved' ? 'Resolved' : 'Mark Resolved'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
