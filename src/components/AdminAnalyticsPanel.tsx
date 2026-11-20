import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Download,
  Coffee,
  Flame,
  Users,
  ShoppingBag,
  Clock,
  Tag,
  CreditCard,
} from 'lucide-react';
import { AnalyticsSummary } from '../types/store';
import { useStore } from '../context/StoreContext';
import { downloadCsv, formatInrExact } from '../utils/commerce';

export const AdminAnalyticsPanel: React.FC = () => {
  const { store, getAnalytics } = useStore();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAnalytics(period)
      .then((data) => {
        if (active) setAnalytics(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, store.orders.length, getAnalytics]);

  const handleExportOrdersCsv = () => {
    const rows = store.orders.map((o) => ({
      OrderNumber: o.orderNumber,
      Date: new Date(o.createdAt).toISOString(),
      Customer: o.customerName,
      Email: o.customerEmail,
      Type: o.orderType,
      Status: o.status,
      PaymentMethod: o.paymentMethod,
      PaymentStatus: o.paymentStatus,
      SubtotalINR: o.subtotal,
      DiscountINR: o.discountAmount,
      LoyaltyDiscountINR: o.loyaltyDiscount,
      TaxINR: o.taxAmount,
      DeliveryINR: o.deliveryFee,
      TotalPayableINR: o.totalPayable,
      Coupon: o.couponCode || '',
    }));
    downloadCsv(`kulhad-kaapi-orders-${period}.csv`, rows);
  };

  const handleExportInventoryCsv = () => {
    const rows = store.ingredients.map((i) => ({
      Ingredient: i.name,
      StockQty: i.stockQty,
      Unit: i.unit,
      LowStockThreshold: i.lowStockThreshold,
      Status: i.stockQty <= i.lowStockThreshold ? 'LOW_STOCK' : 'OK',
      CostPerUnitINR: i.costPerUnit,
      UpdatedAt: i.updatedAt,
    }));
    downloadCsv('kulhad-kaapi-inventory-report.csv', rows);
  };

  if (loading || !analytics) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 rounded-2xl bg-white/[0.06]" />
          ))}
        </div>
        <div className="h-56 rounded-3xl bg-white/[0.05]" />
      </div>
    );
  }

  const maxRev = Math.max(100, ...analytics.revenueSeries.map((s) => s.revenue));
  const maxPeak = Math.max(1, ...analytics.peakHours.map((p) => p.orders));
  const totalBevRev = Math.max(
    1,
    analytics.teaSalesRevenue + analytics.coffeeSalesRevenue
  );
  const teaPct = Math.round((analytics.teaSalesRevenue / totalBevRev) * 100);
  const coffeePct = 100 - teaPct;

  return (
    <div className="space-y-6">
      {/* Header + Period Selector + CSV Exports */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl font-medium">
            Business Analytics &amp; Executive Reports
          </h3>
          <p className="text-xs text-[#FAF8F5]/60 mt-0.5">
            Real-time SQLite revenue analytics, Tea vs Coffee mix, peak hours &amp; CSV exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-0.5 rounded-full bg-white/[0.06] border border-white/10 text-xs">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-full capitalize cursor-pointer ${
                  period === p
                    ? 'bg-[#E68A24] text-[#3B2418] font-bold'
                    : 'text-[#FAF8F5]/70'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExportOrdersCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#D9A441]" />
            Orders CSV
          </button>
          <button
            type="button"
            onClick={handleExportInventoryCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#A8D5AB]" />
            Inventory CSV
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/[0.05] border border-[#D9A441]/25">
          <p className="font-mono text-[10px] uppercase text-[#D9A441]">Total Sales</p>
          <p className="font-serif text-2xl font-semibold mt-1">
            {formatInrExact(analytics.totalSales)}
          </p>
          <p className="text-[11px] text-[#A8D5AB] mt-0.5">
            Today: {formatInrExact(analytics.todayRevenue)}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10">
          <p className="font-mono text-[10px] uppercase text-[#FAF8F5]/55">
            Orders Pipeline
          </p>
          <p className="font-serif text-2xl font-semibold mt-1">
            {analytics.totalOrders}{' '}
            <span className="text-xs font-sans text-[#E68A24]">
              ({analytics.pendingOrders} active)
            </span>
          </p>
          <p className="text-[11px] text-[#FAF8F5]/60 mt-0.5">
            {analytics.completedOrders} completed · {analytics.cancelledOrders} cancelled
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10">
          <p className="font-mono text-[10px] uppercase text-[#FAF8F5]/55">
            Avg Order Value
          </p>
          <p className="font-serif text-2xl font-semibold mt-1">
            {formatInrExact(analytics.avgOrderValue)}
          </p>
          <p className="text-[11px] text-[#FAF8F5]/60 mt-0.5">
            Retention: {analytics.retentionRatePercent}% repeat sippers
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10">
          <p className="font-mono text-[10px] uppercase text-[#FAF8F5]/55">
            Active Customers
          </p>
          <p className="font-serif text-2xl font-semibold mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#E68A24]" />
            {analytics.activeCustomers}
          </p>
          <p className="text-[11px] text-[#FAF8F5]/60 mt-0.5">
            {analytics.teaCupsSold + analytics.coffeeCupsSold} total cups poured
          </p>
        </div>
      </div>

      {/* Revenue Bar Chart + Tea vs Coffee Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 p-5 rounded-3xl bg-white/[0.04] border border-white/[0.09] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-lg font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#E68A24]" />
              Revenue Trend ({period})
            </h4>
            <span className="font-mono text-[11px] text-[#FAF8F5]/55">₹ INR</span>
          </div>
          <div className="h-44 flex items-end justify-between gap-2 pt-4">
            {analytics.revenueSeries.map((pt) => {
              const hPct = Math.max(8, Math.round((pt.revenue / maxRev) * 100));
              return (
                <div
                  key={pt.label}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                >
                  <span className="font-mono text-[10px] text-[#D9A441]">
                    {pt.revenue > 0 ? `₹${pt.revenue}` : '—'}
                  </span>
                  <div className="w-full max-w-[44px] flex-1 flex items-end">
                    <div
                      style={{ height: `${hPct}%` }}
                      className="w-full rounded-t-xl bg-gradient-to-t from-[#6F4028] to-[#E68A24] transition-all duration-500"
                      title={`${pt.label}: ₹${pt.revenue} (${pt.orders} orders)`}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-[#FAF8F5]/65">
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tea vs Coffee + Peak Hours */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.09] space-y-3">
            <h4 className="font-serif text-lg font-medium">
              Tea (Chai) vs Coffee Sales
            </h4>
            <div className="h-3.5 rounded-full overflow-hidden flex bg-white/10">
              <div
                style={{ width: `${teaPct}%` }}
                className="bg-[#294B35] h-full"
                title={`Tea: ${teaPct}%`}
              />
              <div
                style={{ width: `${coffeePct}%` }}
                className="bg-[#E68A24] h-full"
                title={`Coffee: ${coffeePct}%`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-xl bg-[#294B35]/30 border border-[#294B35]">
                <p className="flex items-center gap-1 font-semibold text-[#A8D5AB]">
                  <Flame className="w-3.5 h-3.5" /> Tea ({teaPct}%)
                </p>
                <p className="font-mono text-sm font-bold mt-1">
                  ₹{analytics.teaSalesRevenue}
                </p>
                <p className="text-[11px] opacity-70">
                  {analytics.teaCupsSold} cups sold
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#E68A24]/15 border border-[#E68A24]/35">
                <p className="flex items-center gap-1 font-semibold text-[#D9A441]">
                  <Coffee className="w-3.5 h-3.5" /> Coffee ({coffeePct}%)
                </p>
                <p className="font-mono text-sm font-bold mt-1">
                  ₹{analytics.coffeeSalesRevenue}
                </p>
                <p className="text-[11px] opacity-70">
                  {analytics.coffeeCupsSold} cups sold
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.09] space-y-2.5">
            <h4 className="font-serif text-base font-medium flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#D9A441]" /> Peak Ordering Hours
            </h4>
            {analytics.peakHours.map((ph) => (
              <div key={ph.hour} className="flex items-center gap-2.5 text-xs">
                <span className="w-16 font-mono text-[10px] text-[#FAF8F5]/70">
                  {ph.hour}
                </span>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    style={{ width: `${Math.round((ph.orders / maxPeak) * 100)}%` }}
                    className="h-full bg-[#D9A441] rounded-full"
                  />
                </div>
                <span className="w-6 text-right font-mono text-[11px]">
                  {ph.orders}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Best Selling, Least Selling, Payment Methods & Coupon Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.09] space-y-2.5">
          <h4 className="font-serif text-base font-medium flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-[#E68A24]" /> Most Popular Beverages
          </h4>
          {analytics.bestSelling.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between text-xs py-1 border-b border-white/[0.06]"
            >
              <span className="truncate">{b.name}</span>
              <span className="font-mono text-[#D9A441] shrink-0">
                {b.cups} cups · ₹{b.revenue}
              </span>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.09] space-y-2.5">
          <h4 className="font-serif text-base font-medium">
            Least Ordered (Promote These)
          </h4>
          {analytics.leastSelling.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between text-xs py-1 border-b border-white/[0.06]"
            >
              <span className="truncate">{b.name}</span>
              <span className="font-mono text-[#FAF8F5]/55 shrink-0">
                {b.cups} cups
              </span>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.09] space-y-4">
          <div className="space-y-2">
            <h4 className="font-serif text-base font-medium flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#A8D5AB]" /> Payment Methods
            </h4>
            {analytics.paymentBreakdown.map((pm) => (
              <div key={pm.method} className="flex justify-between text-xs">
                <span className="uppercase font-mono text-[11px]">
                  {pm.method.replace('razorpay_', 'RZP ')}
                </span>
                <span className="font-mono text-[#D9A441]">
                  {pm.count}× · ₹{pm.amount}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2">
            <h4 className="font-serif text-base font-medium flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-[#E68A24]" /> Coupon Performance
            </h4>
            {analytics.couponStats.length === 0 ? (
              <p className="text-xs text-[#FAF8F5]/50">No coupons redeemed yet.</p>
            ) : (
              analytics.couponStats.map((cp) => (
                <div key={cp.code} className="flex justify-between text-xs">
                  <span className="font-mono font-semibold">{cp.code}</span>
                  <span className="font-mono text-[#A8D5AB]">
                    {cp.uses} uses (-₹{cp.discountTotal})
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
