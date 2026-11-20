import {
  BeverageSizeName,
  CustomerOrder,
  MenuItem,
  OrderStatus,
  OrderType,
  ProductSizeOption,
  BrandSettings,
} from '../types/store';

export const DEFAULT_SIZES: ProductSizeOption[] = [
  { name: 'Small', volumeLabel: '120 ml', priceDelta: -10 },
  { name: 'Medium', volumeLabel: '180 ml', priceDelta: 0 },
  { name: 'Large', volumeLabel: '260 ml', priceDelta: 25 },
];

export const SUGAR_OPTIONS = [
  'Regular Sugar',
  'Less Sugar (Kam Cheeni)',
  'No Sugar (Bina Cheeni)',
  'Organic Jaggery (Gud)',
];

export const STRENGTH_OPTIONS = [
  'Standard',
  'Kadak (Extra Strong)',
  'Light & Milky',
  'No Milk / Black',
];

export function getItemSizes(item: MenuItem): ProductSizeOption[] {
  if (item.sizes && item.sizes.length > 0) return item.sizes;
  if (item.id === 'cutting-chai') {
    return [
      { name: 'Small', volumeLabel: '90 ml Cutting', priceDelta: 0 },
      { name: 'Medium', volumeLabel: '150 ml Full Glass', priceDelta: 15 },
      { name: 'Large', volumeLabel: '220 ml Jumbo Glass', priceDelta: 30 },
    ];
  }
  if (item.id === 'espresso') {
    return [
      { name: 'Small', volumeLabel: '30 ml Single', priceDelta: -20 },
      { name: 'Medium', volumeLabel: '60 ml Double', priceDelta: 0 },
      { name: 'Large', volumeLabel: '90 ml Lungo', priceDelta: 20 },
    ];
  }
  return DEFAULT_SIZES;
}

export function getUnitPriceForSize(
  item: MenuItem,
  size: BeverageSizeName
): number {
  const sizes = getItemSizes(item);
  const found = sizes.find((s) => s.name === size);
  return Math.max(20, Math.round(item.price + (found?.priceDelta ?? 0)));
}

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatInrExact(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded)
    ? `₹${rounded.toLocaleString('en-IN')}`
    : `₹${rounded.toFixed(2)}`;
}

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; hiLabel: string; colorClass: string }
> = {
  order_placed: {
    label: 'Order Placed',
    hiLabel: 'ऑर्डर प्राप्त',
    colorClass: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  },
  order_accepted: {
    label: 'Order Accepted',
    hiLabel: 'ऑर्डर स्वीकृत',
    colorClass: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
  },
  preparing: {
    label: 'Preparing',
    hiLabel: 'बन रहा है',
    colorClass: 'bg-[#E68A24]/25 text-[#FFD39E] border-[#E68A24]/50',
  },
  ready_for_pickup: {
    label: 'Ready for Pickup',
    hiLabel: 'पिकअप तैयार',
    colorClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    hiLabel: 'डिलीवरी पर',
    colorClass: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40',
  },
  delivered: {
    label: 'Delivered / Completed',
    hiLabel: 'पूर्ण हुआ',
    colorClass: 'bg-[#294B35] text-[#FFF9F0] border-[#D9A441]/40',
  },
  cancelled: {
    label: 'Cancelled',
    hiLabel: 'रद्द',
    colorClass: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
  },
};

export function getOrderProgressionSteps(orderType: OrderType): OrderStatus[] {
  if (orderType === 'delivery') {
    return [
      'order_placed',
      'order_accepted',
      'preparing',
      'out_for_delivery',
      'delivered',
    ];
  }
  return [
    'order_placed',
    'order_accepted',
    'preparing',
    'ready_for_pickup',
    'delivered',
  ];
}

export function buildReceiptHtml(
  order: CustomerOrder,
  brand: BrandSettings
): string {
  const rows = order.items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px dashed #d8c8b6;">
          <strong>${it.quantity}× ${it.name}</strong><br/>
          <span style="font-size:11px;color:#6F4028;">${it.size} · ${it.temperature.toUpperCase()} · ${it.sugarPreference} · ${it.milkStrength}</span>
          ${it.specialInstructions ? `<br/><span style="font-size:11px;color:#E68A24;">Note: ${it.specialInstructions}</span>` : ''}
        </td>
        <td style="padding:8px 0;text-align:right;border-bottom:1px dashed #d8c8b6;font-family:monospace;">₹${(it.price * it.quantity).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${order.orderNumber} — ${brand.name}</title>
  <style>
    body { font-family: 'Shantell Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#FCFAF7; color:#15241E; margin:0; padding:24px; }
    .card { max-width:440px; margin:0 auto; background:#fff; border:1px solid #d8c8b6; border-radius:16px; padding:24px; }
    h1 { margin:0; font-size:22px; color:#3B2418; }
    .muted { color:#6F4028; font-size:12px; }
    table { width:100%; border-collapse:collapse; margin-top:16px; font-size:13px; }
    .totals td { padding:5px 0; font-size:13px; }
    .grand td { padding-top:10px; border-top:2px solid #3B2418; font-size:16px; font-weight:700; }
    .badge { display:inline-block; background:#F5EBDD; color:#3B2418; padding:3px 10px; border-radius:99px; font-size:11px; font-weight:600; margin-top:8px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${brand.name}</h1>
    <div class="muted">${brand.footerSublabel} · Pure Tea &amp; Coffee Only</div>
    <div class="badge">Tax Invoice · Order #${order.orderNumber}</div>
    <p class="muted" style="margin-top:12px;">
      <strong>Date:</strong> ${new Date(order.createdAt).toLocaleString('en-IN')}<br/>
      <strong>Customer:</strong> ${order.customerName} ${order.customerPhone ? `(${order.customerPhone})` : ''}<br/>
      <strong>Fulfillment:</strong> ${order.orderType.toUpperCase()}${order.tableNumber ? ` · Table ${order.tableNumber}` : ''}${order.scheduledFor ? ` · Scheduled ${order.scheduledFor}` : ''}<br/>
      <strong>Payment:</strong> ${order.paymentMethod.replace('razorpay_', 'Razorpay ').toUpperCase()} (${order.paymentStatus.toUpperCase()})
    </p>
    ${order.deliveryAddress ? `<p class="muted"><strong>Delivery To:</strong> ${order.deliveryAddress.line1}, ${order.deliveryAddress.city} - ${order.deliveryAddress.pincode}</p>` : ''}
    <table>${rows}</table>
    <table class="totals">
      <tr><td>Subtotal</td><td style="text-align:right;font-family:monospace;">₹${order.subtotal.toFixed(2)}</td></tr>
      ${order.discountAmount > 0 ? `<tr><td>Coupon (${order.couponCode || 'Promo'})</td><td style="text-align:right;font-family:monospace;color:#294B35;">-₹${order.discountAmount.toFixed(2)}</td></tr>` : ''}
      ${order.loyaltyDiscount > 0 ? `<tr><td>Chai Coins Redeemed (${order.loyaltyRedeemedPoints})</td><td style="text-align:right;font-family:monospace;color:#294B35;">-₹${order.loyaltyDiscount.toFixed(2)}</td></tr>` : ''}
      <tr><td>GST Tax</td><td style="text-align:right;font-family:monospace;">₹${order.taxAmount.toFixed(2)}</td></tr>
      ${order.deliveryFee > 0 ? `<tr><td>Delivery Charge</td><td style="text-align:right;font-family:monospace;">₹${order.deliveryFee.toFixed(2)}</td></tr>` : ''}
      <tr class="grand"><td>Total Payable</td><td style="text-align:right;font-family:monospace;">₹${order.totalPayable.toFixed(2)}</td></tr>
    </table>
    <p class="muted" style="margin-top:16px;text-align:center;">
      Chai Coins Earned: +${order.totalBeans} · Thank you for sipping with ${brand.name}! नमस्ते
    </p>
  </div>
</body>
</html>`;
}

export function printOrderReceipt(order: CustomerOrder, brand: BrandSettings) {
  const html = buildReceiptHtml(order, brand);
  const w = window.open('', '_blank', 'width=520,height=740');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  window.setTimeout(() => {
    w.print();
  }, 250);
}

export function downloadOrderInvoice(order: CustomerOrder, brand: BrandSettings) {
  const html = buildReceiptHtml(order, brand);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice-${order.orderNumber}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escapeCell = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
