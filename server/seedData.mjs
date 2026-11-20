import { createDefaultState } from './defaultData.mjs';

export function buildFullSeedData() {
  const base = createDefaultState();

  const ingredients = [
    { id: 'ing-tea-leaves', name: 'Assam CTC & Estate Tea Leaves', unit: 'g', stock_qty: 4200, low_stock_threshold: 600, cost_per_unit: 0.65 },
    { id: 'ing-coffee-beans', name: 'Chikmagalur & Coorg Coffee Beans', unit: 'g', stock_qty: 3600, low_stock_threshold: 500, cost_per_unit: 1.2 },
    { id: 'ing-milk', name: 'Fresh Full-Cream Farm Milk', unit: 'ml', stock_qty: 24000, low_stock_threshold: 4000, cost_per_unit: 0.07 },
    { id: 'ing-sugar', name: 'Organic Cane Sugar & Gud', unit: 'g', stock_qty: 5500, low_stock_threshold: 800, cost_per_unit: 0.06 },
    { id: 'ing-ginger', name: 'Fresh Wayanad Ginger', unit: 'g', stock_qty: 1400, low_stock_threshold: 250, cost_per_unit: 0.18 },
    { id: 'ing-cardamom', name: 'Idukki Green Cardamom Pods', unit: 'g', stock_qty: 420, low_stock_threshold: 120, cost_per_unit: 2.8 },
    { id: 'ing-saffron', name: 'Pampore Kashmiri Saffron', unit: 'pinches', stock_qty: 95, low_stock_threshold: 30, cost_per_unit: 14 },
    { id: 'ing-tulsi', name: 'Fresh Organic Tulsi Leaves', unit: 'g', stock_qty: 320, low_stock_threshold: 80, cost_per_unit: 0.4 },
    { id: 'ing-lemon', name: 'Fresh Kagzi Lemons', unit: 'pcs', stock_qty: 75, low_stock_threshold: 20, cost_per_unit: 5 },
    { id: 'ing-cocoa', name: 'Idukki 70% Dark Cocoa', unit: 'g', stock_qty: 850, low_stock_threshold: 180, cost_per_unit: 1.5 },
    { id: 'ing-kulhad', name: 'Kiln-Fired Terracotta Kulhads', unit: 'pcs', stock_qty: 180, low_stock_threshold: 45, cost_per_unit: 6 },
  ];

  const products = base.menuItems.map((item) => {
    const isColdDefault = item.id === 'cold-coffee' || item.id === 'iced-coffee';
    const supportsCold =
      isColdDefault ||
      ['lemon-tea', 'green-tea', 'cafe-latte', 'mocha', 'black-coffee'].includes(item.id);
    const supportsHot = !isColdDefault;

    const sizes =
      item.id === 'cutting-chai'
        ? [
            { name: 'Small', volumeLabel: '90 ml Cutting', priceDelta: 0 },
            { name: 'Medium', volumeLabel: '150 ml Full Glass', priceDelta: 15 },
            { name: 'Large', volumeLabel: '220 ml Jumbo Glass', priceDelta: 30 },
          ]
        : item.id === 'espresso'
          ? [
              { name: 'Small', volumeLabel: '30 ml Single', priceDelta: -20 },
              { name: 'Medium', volumeLabel: '60 ml Double', priceDelta: 0 },
              { name: 'Large', volumeLabel: '90 ml Lungo', priceDelta: 20 },
            ]
          : [
              { name: 'Small', volumeLabel: '120 ml', priceDelta: -10 },
              { name: 'Medium', volumeLabel: '180 ml', priceDelta: 0 },
              { name: 'Large', volumeLabel: '260 ml', priceDelta: 25 },
            ];

    const recipe =
      item.category === 'tea'
        ? {
            'ing-tea-leaves': 6,
            'ing-milk':
              ['lemon-tea', 'green-tea', 'kashmiri-kahwa'].includes(item.id) ? 0 : 120,
            'ing-sugar': 10,
            ...(item.id.includes('masala') || item.id.includes('adrak') || item.id === 'cutting-chai'
              ? { 'ing-ginger': 5 }
              : {}),
            ...(item.id.includes('masala') || item.id.includes('elaichi') || item.id.includes('kesar') || item.id === 'kashmiri-kahwa'
              ? { 'ing-cardamom': 2 }
              : {}),
            ...(item.id.includes('kesar') || item.id === 'kashmiri-kahwa'
              ? { 'ing-saffron': 1 }
              : {}),
            ...(item.id.includes('kulhad') || item.id.includes('tandoori')
              ? { 'ing-kulhad': 1 }
              : {}),
            ...(item.id === 'tulsi-chai' ? { 'ing-tulsi': 4 } : {}),
            ...(item.id === 'lemon-tea' ? { 'ing-lemon': 1 } : {}),
          }
        : {
            'ing-coffee-beans': item.id === 'instant-coffee' ? 8 : 16,
            'ing-milk': ['espresso', 'black-coffee'].includes(item.id) ? 0 : 140,
            'ing-sugar': ['espresso', 'black-coffee'].includes(item.id) ? 0 : 10,
            ...(item.id === 'mocha' ? { 'ing-cocoa': 12 } : {}),
          };

    return {
      ...item,
      name:
        item.id === 'adrak-chai'
          ? 'Adrak Chai'
          : item.id === 'elaichi-chai'
            ? 'Elaichi Chai'
            : item.id === 'kesar-chai'
              ? 'Kesar Chai'
              : item.id === 'tulsi-chai'
                ? 'Tulsi Tea'
                : item.name,
      supportsHot,
      supportsCold,
      defaultTemp: isColdDefault ? 'cold' : 'hot',
      sizes,
      recipe,
      ingredients:
        item.category === 'tea'
          ? ['Assam / Estate Indian Tea Leaves', 'Filtered Water', 'Fresh Milk (if milk chai)', 'Whole Indian Spices']
          : ['Chikmagalur / Coorg Estate Coffee Beans', 'Filtered Water', 'Fresh Milk (where applicable)'],
      preparationSteps:
        item.category === 'tea'
          ? 'Freshly crushed whole spices simmered with tea leaves in brass patila, strained hot into your chosen vessel.'
          : 'Freshly ground single-estate Indian coffee extracted to order and blended smooth.',
      isBestseller: [
        'masala-chai',
        'kulhad-chai',
        'tandoori-chai',
        'south-indian-filter-coffee',
        'cold-coffee',
      ].includes(item.id),
      isNewArrival: ['kashmiri-kahwa', 'kesar-chai', 'iced-coffee'].includes(item.id),
      ratingAvg: item.featured ? 4.9 : 4.7,
      reviewCount: item.featured ? 2 : 1,
      popularityScore: item.featured ? 96 : Math.max(55, 86 - item.sortOrder),
    };
  });

  const coupons = [
    {
      id: 'cpn-first',
      code: 'FIRSTCHAI',
      title: '20% Off First Order',
      description: 'Welcome offer for new chai & coffee sippers (up to ₹60 off).',
      discountType: 'percentage',
      discountValue: 20,
      minOrderValue: 80,
      maxDiscount: 60,
      firstOrderOnly: true,
      singleUse: true,
      isFestival: false,
      expiresAt: '2027-12-31',
      usageLimit: 1000,
      timesUsed: 42,
      active: true,
    },
    {
      id: 'cpn-festival',
      code: 'FESTIVAL20',
      title: 'Festival Chai Celebration',
      description: 'Flat 20% off on orders above ₹150 (max ₹80 off).',
      discountType: 'percentage',
      discountValue: 20,
      minOrderValue: 150,
      maxDiscount: 80,
      firstOrderOnly: false,
      singleUse: false,
      isFestival: true,
      expiresAt: '2027-12-31',
      usageLimit: 500,
      timesUsed: 18,
      active: true,
    },
    {
      id: 'cpn-kaapi',
      code: 'KAAPI50',
      title: '₹50 Off Filter Kaapi & Cold Coffee',
      description: 'Instant ₹50 discount on orders ₹220 and above.',
      discountType: 'fixed',
      discountValue: 50,
      minOrderValue: 220,
      maxDiscount: 50,
      firstOrderOnly: false,
      singleUse: false,
      isFestival: false,
      expiresAt: '2027-12-31',
      usageLimit: 500,
      timesUsed: 27,
      active: true,
    },
  ];

  const commerce = {
    taxRatePercent: 5,
    deliveryCharge: 35,
    freeDeliveryAbove: 299,
    codEnabled: true,
    razorpayEnabled: true,
    razorpayMode: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? 'live' : 'sandbox',
    razorpayKeyIdConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    loyaltyPointsPer100: 25,
    pointRedemptionValueInr: 0.5,
    maxRedeemPercentOfSubtotal: 30,
    minPointsToRedeem: 50,
    birthdayBonusPoints: 150,
    autoDeductInventoryOn: 'order_placed',
  };

  return {
    brand: {
      ...base.brand,
      announcementEnabled: true,
      announcementText:
        'नमस्ते! Use code FIRSTCHAI for 20% off your first chai or filter coffee order · Free delivery above ₹299.',
      whatsappPhone: process.env.WHATSAPP_BUSINESS_PHONE || '+918041238900',
    },
    availability: {
      ...base.availability,
      pickupEnabled: true,
      deliveryEnabled: true,
      tableQrEnabled: true,
    },
    commerce,
    display: base.display,
    rewards: base.rewards,
    locations: base.locations,
    testimonials: base.testimonials,
    pricingTiers: base.pricingTiers,
    faqs: base.faqs,
    products,
    ingredients,
    coupons,
  };
}
