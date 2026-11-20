import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Check,
  Sparkles,
  MapPin,
  Flame,
  Snowflake,
  X,
  Clock,
  Ban,
  Search,
  Star,
  Heart,
  Share2,
  SlidersHorizontal,
  Flag,
  CheckCircle2,
  Edit3,
  PlusCircle,
} from 'lucide-react';
import {
  BeverageSizeName,
  BeverageTemp,
  CartCustomization,
  MenuCategory,
  MenuItem,
} from '../types/store';
import { FadeIn, SOLEN_EASE } from './MotionPrimitives';
import { AnimatedPrice, SplitWordReveal } from './KineticTypography';
import { useStore } from '../context/StoreContext';
import { useModalEffects } from '../utils/useModalEffects';
import {
  getItemSizes,
  getUnitPriceForSize,
  SUGAR_OPTIONS,
  STRENGTH_OPTIONS,
} from '../utils/commerce';
import { UI_COPY } from '../utils/i18n';

interface ProductShowcaseProps {
  onAddToBag: (item: MenuItem, custom?: Partial<CartCustomization>) => void;
  externalSelectedProduct?: MenuItem | null;
  onClearExternalSelected?: () => void;
  onAdminEditProduct?: (item: MenuItem) => void;
  onAdminOpenProducts?: () => void;
}

export const ProductShowcase: React.FC<ProductShowcaseProps> = ({
  onAddToBag,
  externalSelectedProduct,
  onClearExternalSelected,
  onAdminEditProduct,
  onAdminOpenProducts,
}) => {
  const {
    store,
    loading,
    language,
    shopStatus,
    adminUser,
    customerUser,
    customerOrders,
    toggleFavourite,
    recordRecentlyViewed,
    recentlyViewedIds,
    submitReview,
    reportReview,
  } = useStore();
  const copy = UI_COPY[language];

  // Search, Filter & Sort Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('all');
  const [tempFilter, setTempFilter] = useState<'all' | 'hot' | 'cold'>('all');
  const [priceCap, setPriceCap] = useState<number>(250);
  const [sortBy, setSortBy] = useState<
    'popular' | 'price_asc' | 'price_desc' | 'rating'
  >('popular');

  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // Customization State inside Beverage Modal
  const [custSize, setCustSize] = useState<BeverageSizeName>('Medium');
  const [custTemp, setCustTemp] = useState<BeverageTemp>('hot');
  const [custSugar, setCustSugar] = useState<string>(SUGAR_OPTIONS[0]);
  const [custStrength, setCustStrength] = useState<string>(STRENGTH_OPTIONS[0]);
  const [custNotes, setCustNotes] = useState<string>('');
  const [sharedCopied, setSharedCopied] = useState(false);

  // Review Form inside Beverage Modal
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');
  const [revFeedback, setRevFeedback] = useState<string | null>(null);
  const [revError, setRevError] = useState<string | null>(null);
  const [revSubmitting, setRevSubmitting] = useState(false);

  useEffect(() => {
    if (externalSelectedProduct) {
      openItemDetail(externalSelectedProduct);
      onClearExternalSelected?.();
    }
  }, [externalSelectedProduct]);

  const openItemDetail = (item: MenuItem) => {
    setSelectedItem(item);
    recordRecentlyViewed(item.id);
    setCustSize('Medium');
    setCustTemp(item.defaultTemp === 'cold' ? 'cold' : 'hot');
    setCustSugar(SUGAR_OPTIONS[0]);
    setCustStrength(
      item.id === 'black-coffee' || item.id === 'espresso' || item.id === 'lemon-tea'
        ? 'No Milk / Black'
        : STRENGTH_OPTIONS[0]
    );
    setCustNotes('');
    setRevFeedback(null);
    setRevError(null);
  };

  useModalEffects(Boolean(selectedItem), () => setSelectedItem(null));

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = [...store.menuItems]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((item) => item.displayed)
      .filter((item) =>
        store.display.showSoldOutItems
          ? true
          : item.available && item.stockCount > 0
      )
      .filter((item) => (tempFilter === 'all' ? true : tempFilter === 'hot' ? item.supportsHot !== false : Boolean(item.supportsCold)))
      .filter((item) => item.price <= priceCap)
      .filter((item) => {
        if (!q) return true;
        const hay = [
          item.name,
          item.hindiName || '',
          item.subtitle,
          item.category,
          item.origin,
          item.servingStyle || '',
          item.description,
          ...(item.notes || []),
          ...(item.ingredients || []),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });

    if (sortBy === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') list.sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating')
      list.sort((a, b) => (b.ratingAvg || 4.8) - (a.ratingAvg || 4.8));
    else list.sort((a, b) => (b.popularityScore || 80) - (a.popularityScore || 80));

    return list.slice(0, Math.max(1, store.display.maxDisplayItems || 24));
  }, [
    store.menuItems,
    store.display.showSoldOutItems,
    store.display.maxDisplayItems,
    searchQuery,
    tempFilter,
    priceCap,
    sortBy,
  ]);

  const teaItems = visibleItems.filter((i) => i.category === 'tea');
  const coffeeItems = visibleItems.filter((i) => i.category === 'coffee');

  const recentlyViewedItems = useMemo(
    () =>
      recentlyViewedIds
        .map((id) => store.menuItems.find((m) => m.id === id && m.displayed))
        .filter(Boolean) as MenuItem[],
    [recentlyViewedIds, store.menuItems]
  );

  // Personalized Suggestions: Recently Ordered (if signed in) + Complementary Indian Pairings
  const recentlyOrderedItems = useMemo(() => {
    const ids = new Set<string>();
    for (const o of customerOrders) {
      for (const it of o.items) ids.add(it.itemId);
    }
    return Array.from(ids)
      .map((id) =>
        store.menuItems.find((m) => m.id === id && m.displayed && m.available)
      )
      .filter(Boolean)
      .slice(0, 4) as MenuItem[];
  }, [customerOrders, store.menuItems]);

  const recommendedItems = useMemo(() => {
    const hour = new Date().getHours();
    const preferredIds =
      hour < 12
        ? ['masala-chai', 'south-indian-filter-coffee', 'adrak-chai', 'cappuccino']
        : hour < 17
          ? ['cold-coffee', 'cutting-chai', 'iced-coffee', 'lemon-tea']
          : ['tandoori-chai', 'kulhad-chai', 'kashmiri-kahwa', 'kesar-chai'];
    return preferredIds
      .map((id) =>
        store.menuItems.find((m) => m.id === id && m.displayed && m.available)
      )
      .filter(Boolean) as MenuItem[];
  }, [store.menuItems]);

  const handleQuickAdd = (
    item: MenuItem,
    custom?: Partial<CartCustomization>
  ) => {
    if (!item.available || item.stockCount <= 0 || !shopStatus.canOrder) return;
    onAddToBag(item, custom);
    setJustAddedId(item.id);
    window.setTimeout(() => {
      setJustAddedId((curr) => (curr === item.id ? null : curr));
    }, 1100);
  };

  const handleShareProduct = (item: MenuItem) => {
    const url = `${window.location.origin}/?drink=${encodeURIComponent(item.id)}#menu`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setSharedCopied(true);
    window.setTimeout(() => setSharedCopied(false), 1800);
  };

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !revComment.trim()) return;
    setRevSubmitting(true);
    setRevError(null);
    setRevFeedback(null);
    try {
      await submitReview({
        productId: selectedItem.id,
        rating: revRating,
        comment: revComment,
      });
      setRevComment('');
      setRevFeedback('Dhanyavaad! Your verified review has been published.');
    } catch (err) {
      setRevError(err instanceof Error ? err.message : 'Unable to post review.');
    } finally {
      setRevSubmitting(false);
    }
  };

  const renderCard = (item: MenuItem) => {
    const isAdded = justAddedId === item.id;
    const isTea = item.category === 'tea';
    const isSoldOut = !item.available || item.stockCount <= 0;
    const canOrderItem = !isSoldOut && shopStatus.canOrder;
    const isFav = (customerUser?.favourites || []).includes(item.id);

    return (
      <motion.article
        layout
        key={item.id}
        data-cursor={isSoldOut ? '' : 'VIEW'}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.32, ease: SOLEN_EASE }}
        className={`group h-full rounded-3xl overflow-hidden bg-white border border-[#144734]/12 shadow-[0_8px_24px_rgba(20,71,52,0.05)] hover:shadow-[0_18px_40px_rgba(20,71,52,0.11)] transition-all duration-300 flex flex-col ${
          isSoldOut ? 'opacity-75' : 'hover:-translate-y-1 hover:border-[#C87D28]/45'
        }`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[#F5EBDD]">
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            onClick={() => openItemDetail(item)}
            className={`w-full h-full object-cover transition-transform duration-700 cursor-pointer ${
              isSoldOut ? 'grayscale-[55%]' : 'group-hover:scale-105'
            }`}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#3B2418]/70 via-transparent to-transparent"
          />

          {/* Top Pills + Favourite Heart */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {isSoldOut ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-semibold">
                  <Ban className="w-3 h-3" /> Sold Out
                </span>
              ) : (
                <>
                  {item.isBestseller && (
                    <span className="px-2.5 py-1 rounded-full bg-[#E68A24] text-[#3B2418] text-[10px] font-bold">
                      ★ Bestseller
                    </span>
                  )}
                  {item.isNewArrival && (
                    <span className="px-2.5 py-1 rounded-full bg-[#294B35] text-[#FFF9F0] text-[10px] font-semibold">
                      New Arrival
                    </span>
                  )}
                  {!item.isBestseller && !item.isNewArrival && item.badge && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        isTea
                          ? 'bg-[#294B35] text-[#FFF9F0]'
                          : 'bg-[#FFF9F0]/92 text-[#3B2418]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {adminUser && onAdminEditProduct && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdminEditProduct(item);
                  }}
                  title={`Admin: Edit ${item.name} price, sizes & details`}
                  className="inline-flex items-center gap-1 px-2.5 h-8 rounded-full bg-white/95 hover:bg-[#144734] text-[#144734] hover:text-white border border-[#144734]/20 text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit ₹</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleFavourite(item.id)}
                aria-label={`Favourite ${item.name}`}
                title={customerUser ? 'Save to Favourites' : 'Sign in to save Favourites'}
                className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer ${
                  isFav
                    ? 'bg-rose-500 text-white'
                    : 'bg-black/50 text-white hover:bg-black/75'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
              </button>
            </div>
          </div>

          {/* Bottom Bar inside Image: Rating + Hot/Cold tags */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-[#FFF9F0]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3B2418]/80 backdrop-blur-md text-[11px] font-semibold">
              <Star className="w-3 h-3 fill-[#D9A441] text-[#D9A441]" />
              {(item.ratingAvg || 4.8).toFixed(1)}
            </span>
            <div className="flex items-center gap-1">
              {item.supportsHot !== false && (
                <span className="px-2 py-0.5 rounded-full bg-[#E68A24]/90 text-[#3B2418] text-[10px] font-bold">
                  Hot
                </span>
              )}
              {item.supportsCold && (
                <span className="px-2 py-0.5 rounded-full bg-sky-200/95 text-[#1B2A38] text-[10px] font-bold">
                  Cold
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="font-serif text-xl font-semibold cafe-heading leading-snug">
                    {item.name}
                  </h3>
                  {item.hindiName && (
                    <span className="font-devanagari text-xs font-medium text-[#E68A24]">
                      {item.hindiName}
                    </span>
                  )}
                </div>
                <p className="text-xs cafe-muted mt-0.5">{item.subtitle}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-baseline justify-end gap-1.5">
                  {item.originalPrice && item.originalPrice > item.price && (
                    <span className="text-xs line-through text-[#52635B]/65">
                      ₹{item.originalPrice}
                    </span>
                  )}
                  <span className="text-lg font-bold text-[#144734]">
                    ₹{item.price}
                  </span>
                </div>
                {item.originalPrice && item.originalPrice > item.price ? (
                  <p className="text-[10px] font-bold text-emerald-700">
                    Save{' '}
                    {Math.round(
                      ((item.originalPrice - item.price) / item.originalPrice) * 100
                    )}
                    % · +{item.beansEarned} Coins
                  </p>
                ) : (
                  <p className="text-[10px] font-semibold text-[#C87D28]">
                    +{item.beansEarned} Coins
                  </p>
                )}
              </div>
            </div>

            {item.servingStyle && (
              <p className="mt-2 inline-flex items-center gap-1 text-[11px] cafe-muted">
                <MapPin className="w-3 h-3 text-[#E68A24]" />
                {item.servingStyle}
              </p>
            )}

            <p className="mt-2 text-xs cafe-muted leading-relaxed line-clamp-2">
              {item.description}
            </p>
          </div>

          <div className="mt-4 pt-3.5 border-t border-[#6F4028]/15 flex items-center gap-2">
            <button
              type="button"
              onClick={() => openItemDetail(item)}
              className="px-3.5 py-2.5 rounded-full border cafe-card-alt hover:border-[#E68A24] text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#E68A24]" />
              <span>{copy.customizeOrder}</span>
            </button>

            <button
              type="button"
              disabled={!canOrderItem}
              onClick={() => handleQuickAdd(item)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                !canOrderItem
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : isAdded
                    ? 'bg-emerald-600 text-white cursor-pointer'
                    : 'bg-[#144734] hover:bg-[#0F3829] text-white cursor-pointer'
              }`}
            >
              {isSoldOut ? (
                <span>Sold Out</span>
              ) : !shopStatus.canOrder ? (
                <span>Schedule</span>
              ) : isAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-[#F0C97A]" />
                  <span>Add ₹{item.price}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.article>
    );
  };

  const modalReviews = selectedItem
    ? (store.reviews || []).filter(
        (r) => r.productId === selectedItem.id && r.status === 'approved'
      )
    : [];

  const selectedUnitPrice = selectedItem
    ? getUnitPriceForSize(selectedItem, custSize)
    : 0;

  return (
    <section
      id="menu"
      className="py-20 lg:py-28 indian-jaali-bg border-y border-[#6F4028]/15"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Admin Live Quick-Manage Products Banner when Admin is signed in */}
        {adminUser && onAdminOpenProducts && (
          <div className="mb-6 p-3.5 rounded-2xl bg-[#EAF3EE] border border-[#144734]/25 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-[#144734]">
              Admin Mode Active: Click <strong>“Edit ₹”</strong> on any beverage card to control its price, MRP, sizes, stock &amp; photo, or open the full Product Manager.
            </span>
            <button
              type="button"
              onClick={onAdminOpenProducts}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#144734] hover:bg-[#0F3829] text-white font-bold cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add / Manage All Products</span>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <FadeIn className="max-w-2xl">
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#E68A24] font-semibold mb-3">
              <span className="w-6 h-px bg-[#E68A24]" />
              {copy.menuEyebrow}
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.08] cafe-heading">
              <SplitWordReveal
                key={language}
                text={copy.menuHeadline}
                highlightPhrase={copy.menuHighlight}
                highlightColor="#E68A24"
              />
            </h2>
            <p className="mt-3 text-sm sm:text-base cafe-muted">
              Pick Small, Medium, or Large, Hot or Cold, Regular Sugar or Organic
              Jaggery (Gud).{' '}
              <span className="inline-flex items-center gap-1 font-semibold cafe-heading">
                <Clock className="w-3.5 h-3.5 text-[#E68A24]" />
                {shopStatus.badgeText}
              </span>
            </p>
          </FadeIn>

          {/* Category Switcher */}
          <div
            role="tablist"
            className="inline-flex flex-wrap items-center gap-1 p-1.5 rounded-full cafe-card border shadow-xs self-start lg:self-auto"
          >
            {(
              [
                { id: 'all', label: `${copy.allBeverages} (${visibleItems.length})` },
                { id: 'tea', label: `${copy.indianTea} (${teaItems.length})` },
                { id: 'coffee', label: `${copy.indianCoffee} (${coffeeItems.length})` },
              ] as { id: MenuCategory; label: string }[]
            ).map((cat) => (
              <button
                key={cat.id}
                role="tab"
                type="button"
                aria-selected={activeCategory === cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[#144734] text-white shadow-xs'
                    : 'text-[#52635B] hover:text-[#144734]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Search, Temperature, Price & Sort Bar */}
        <div className="mb-8 p-4 rounded-3xl cafe-card border shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[#E68A24] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl cafe-card-alt cafe-input border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#E68A24]"
            />
          </div>

          {/* Hot / Cold Filter */}
          <div className="md:col-span-3 flex items-center gap-1 p-1 rounded-2xl cafe-card-alt border text-xs">
            {(
              [
                { id: 'all', label: copy.hotAndCold },
                { id: 'hot', label: copy.hotLabel, icon: <Flame className="w-3 h-3" /> },
                { id: 'cold', label: copy.coldLabel, icon: <Snowflake className="w-3 h-3" /> },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTempFilter(t.id)}
                className={`flex-1 py-1.5 px-2 rounded-xl inline-flex items-center justify-center gap-1 font-semibold cursor-pointer ${
                  tempFilter === t.id
                    ? 'bg-[#144734] text-white shadow-2xs'
                    : 'text-[#52635B] hover:text-[#144734]'
                }`}
              >
                {'icon' in t && t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Price Filter */}
          <div className="md:col-span-2 flex items-center gap-2 px-3 py-1.5 rounded-2xl cafe-card-alt border">
            <span className="font-mono text-[11px] cafe-muted shrink-0">
              ≤ ₹{priceCap}
            </span>
            <input
              type="range"
              min={50}
              max={250}
              step={10}
              value={priceCap}
              onChange={(e) => setPriceCap(Number(e.target.value))}
              className="w-full accent-[#E68A24]"
              aria-label="Filter by max price"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as 'popular' | 'price_asc' | 'price_desc' | 'rating'
              )
            }
            aria-label="Sort beverages"
            className="md:col-span-2 px-3 py-2.5 rounded-2xl cafe-card-alt cafe-input border text-xs font-semibold"
          >
            <option value="popular">Sort: Popular</option>
            <option value="rating">Sort: Top Rated</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        {/* Personalized Recommendations, Recently Ordered & Recently Viewed Strip */}
        {!searchQuery && (
          <div className="mb-10 space-y-2.5">
            {(recentlyOrderedItems.length > 0 || recommendedItems.length > 0) && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#E68A24] font-semibold shrink-0">
                  <Sparkles className="w-3 h-3" />
                  {recentlyOrderedItems.length > 0
                    ? copy.recentlyOrdered
                    : copy.recommendedForYou}
                  :
                </span>
                {(recentlyOrderedItems.length > 0
                  ? recentlyOrderedItems
                  : recommendedItems
                ).map((item) => (
                  <button
                    key={`rec-${item.id}`}
                    type="button"
                    onClick={() => openItemDetail(item)}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full cafe-card border hover:border-[#E68A24] text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span>{item.name}</span>
                    <span className="font-mono text-[#E68A24]">₹{item.price}</span>
                  </button>
                ))}
              </div>
            )}

            {recentlyViewedItems.length > 0 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                <span className="font-mono text-[10px] uppercase tracking-wider cafe-muted shrink-0">
                  {copy.recentlyViewed}:
                </span>
                {recentlyViewedItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openItemDetail(item)}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full cafe-card border hover:border-[#E68A24] text-xs font-semibold cursor-pointer"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span>{item.name}</span>
                    <span className="font-mono text-[#E68A24]">₹{item.price}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading Skeleton Screen OR Live Tea & Coffee Menu */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="rounded-3xl overflow-hidden cafe-card border animate-pulse"
              >
                <div className="aspect-[4/3] bg-[#6F4028]/15" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-2/3 rounded-full bg-[#6F4028]/15" />
                  <div className="h-3 w-full rounded-full bg-[#6F4028]/10" />
                  <div className="h-10 w-full rounded-full bg-[#6F4028]/15 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-3xl p-12 text-center cafe-card border">
            <p className="font-serif text-2xl font-semibold cafe-heading">
              No beverages match your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
                setTempFilter('all');
                setPriceCap(250);
              }}
              className="mt-4 px-5 py-2.5 rounded-full bg-[#E68A24] text-[#3B2418] text-xs font-bold cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-16">
            {(activeCategory === 'all' || activeCategory === 'tea') &&
              teaItems.length > 0 && (
                <div>
                  <div className="flex flex-wrap items-end justify-between gap-4 pb-4 mb-7 border-b border-[#6F4028]/25">
                    <div>
                      <span className="font-devanagari text-lg font-semibold text-[#E68A24]">
                        भारतीय चाय संग्रह
                      </span>
                      <h3 className="font-serif text-2xl sm:text-3xl font-semibold cafe-heading">
                        {copy.teaCollectionTitle}
                      </h3>
                    </div>
                    <span className="font-mono text-xs px-3 py-1 rounded-full bg-[#0F382A] text-[#F0C97A] border border-[#D4A359]/30">
                      {teaItems.length} Varieties · Kulhad &amp; Chai Glass
                    </span>
                  </div>
                  <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    <AnimatePresence mode="popLayout">
                      {teaItems.map(renderCard)}
                    </AnimatePresence>
                  </motion.div>
                </div>
              )}

            {(activeCategory === 'all' || activeCategory === 'coffee') &&
              coffeeItems.length > 0 && (
                <div>
                  <div className="flex flex-wrap items-end justify-between gap-4 pb-4 mb-7 border-b border-[#6F4028]/25">
                    <div>
                      <span className="font-devanagari text-lg font-semibold text-[#E68A24]">
                        भारतीय कॉफ़ी संग्रह
                      </span>
                      <h3 className="font-serif text-2xl sm:text-3xl font-semibold cafe-heading">
                        {copy.coffeeCollectionTitle}
                      </h3>
                    </div>
                    <span className="font-mono text-xs px-3 py-1 rounded-full bg-[#F8F4EC] text-[#C87D28] border border-[#C87D28]/30 font-semibold">
                      {coffeeItems.length} Varieties · Davara &amp; Café Mugs
                    </span>
                  </div>
                  <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    <AnimatePresence mode="popLayout">
                      {coffeeItems.map(renderCard)}
                    </AnimatePresence>
                  </motion.div>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Beverage Customization, Ingredients & Verified Reviews Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#1E120C]/75 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.28, ease: SOLEN_EASE }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white text-[#15241E] border border-[#144734]/15 shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <div className="relative h-64 sm:h-72 overflow-hidden bg-[#F1F6F3]">
                <img
                  src={selectedItem.image}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />

                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleShareProduct(selectedItem)}
                    className="px-3 h-9 rounded-full bg-white/95 hover:bg-white text-[#15241E] text-xs font-semibold inline-flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#144734]" />
                    <span>{sharedCopied ? 'Link Copied!' : 'Share'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    aria-label="Close"
                    className="w-9 h-9 rounded-full bg-white/95 hover:bg-white text-[#15241E] flex items-center justify-center shadow-sm cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Title & Ingredients */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2.5">
                      <h3 className="font-serif text-2xl sm:text-3xl font-semibold">
                        {selectedItem.name}
                      </h3>
                      {selectedItem.hindiName && (
                        <span className="font-devanagari text-base text-[#E68A24]">
                          {selectedItem.hindiName}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F5EBDD]">
                      <Star className="w-3.5 h-3.5 fill-[#E68A24] text-[#E68A24]" />
                      {(selectedItem.ratingAvg || 4.8).toFixed(1)} ({modalReviews.length}{' '}
                      reviews)
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#6F4028] leading-relaxed">
                    {selectedItem.description}
                  </p>

                  {/* Ingredients & Preparation */}
                  <div className="mt-4 p-4 rounded-2xl bg-[#F5EBDD]/75 border border-[#6F4028]/12 space-y-2 text-xs">
                    {selectedItem.ingredients && selectedItem.ingredients.length > 0 && (
                      <p>
                        <strong className="text-[#3B2418]">Ingredients: </strong>
                        <span className="text-[#6F4028]">
                          {selectedItem.ingredients.join(' · ')}
                        </span>
                      </p>
                    )}
                    {selectedItem.preparationSteps && (
                      <p>
                        <strong className="text-[#3B2418]">Preparation: </strong>
                        <span className="text-[#6F4028]">
                          {selectedItem.preparationSteps}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Customization Controls */}
                <div className="space-y-4 p-4 rounded-2xl bg-white border border-[#6F4028]/15">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-[#E68A24] font-bold">
                    Customize Your Cup
                  </p>

                  {/* Size */}
                  <div>
                    <p className="text-xs font-semibold mb-2">Choose Size</p>
                    <div className="grid grid-cols-3 gap-2">
                      {getItemSizes(selectedItem).map((sz) => {
                        const szPrice = Math.max(
                          20,
                          Math.round(selectedItem.price + sz.priceDelta)
                        );
                        return (
                          <button
                            key={sz.name}
                            type="button"
                            onClick={() => setCustSize(sz.name)}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                              custSize === sz.name
                                ? 'bg-[#3B2418] text-[#FFF9F0] border-[#3B2418]'
                                : 'bg-[#FFF9F0] text-[#3B2418] border-[#6F4028]/15 hover:border-[#E68A24]'
                            }`}
                          >
                            <div className="text-xs font-bold">{sz.name}</div>
                            <div className="text-[10px] opacity-75">
                              {sz.volumeLabel}
                            </div>
                            <div className="font-mono text-xs font-semibold text-[#E68A24] mt-0.5">
                              ₹{szPrice}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Temperature if both Hot & Cold supported */}
                  {selectedItem.supportsHot !== false && selectedItem.supportsCold && (
                    <div>
                      <p className="text-xs font-semibold mb-2">Temperature</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['hot', 'cold'] as const).map((tp) => (
                          <button
                            key={tp}
                            type="button"
                            onClick={() => setCustTemp(tp)}
                            className={`py-2 rounded-xl border text-xs font-semibold capitalize cursor-pointer ${
                              custTemp === tp
                                ? 'bg-[#3B2418] text-[#FFF9F0] border-[#3B2418]'
                                : 'bg-[#FFF9F0] text-[#6F4028] border-[#6F4028]/15'
                            }`}
                          >
                            {tp === 'hot' ? '🔥 Steaming Hot' : '❄️ Chilled / Iced'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sugar & Milk Strength */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Sugar Preference
                      </label>
                      <select
                        value={custSugar}
                        onChange={(e) => setCustSugar(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFF9F0] border border-[#6F4028]/20 text-xs"
                      >
                        {SUGAR_OPTIONS.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Strength / Milk Style
                      </label>
                      <select
                        value={custStrength}
                        onChange={(e) => setCustStrength(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFF9F0] border border-[#6F4028]/20 text-xs"
                      >
                        {STRENGTH_OPTIONS.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={custNotes}
                    onChange={(e) => setCustNotes(e.target.value)}
                    placeholder="Special instructions (e.g., extra crushed ginger, serve in kulhad)"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FFF9F0] border border-[#6F4028]/20 text-xs"
                  />

                  <div className="pt-2 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-mono text-2xl font-bold text-[#3B2418]">
                        <AnimatedPrice price={selectedUnitPrice} />
                      </p>
                      <p className="text-[11px] text-[#294B35] font-semibold">
                        <Sparkles className="w-3 h-3 inline mr-0.5" />+
                        {selectedItem.beansEarned} Chai Coins
                      </p>
                    </div>
                    <button
                      type="button"
                      data-cursor="ORDER"
                      disabled={
                        !selectedItem.available || selectedItem.stockCount <= 0
                      }
                      onClick={() => {
                        handleQuickAdd(selectedItem, {
                          size: custSize,
                          temperature: custTemp,
                          sugarPreference: custSugar,
                          milkStrength: custStrength,
                          specialInstructions: custNotes,
                        });
                        setSelectedItem(null);
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#3B2418] hover:bg-[#6F4028] disabled:opacity-45 text-[#FFF9F0] text-sm font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-[#E68A24]" />
                      <span>
                        Add Customized Cup · <AnimatedPrice price={selectedUnitPrice} />
                      </span>
                    </button>
                  </div>
                </div>

                {/* Verified Customer Reviews */}
                <div className="space-y-3 pt-2 border-t border-[#6F4028]/15">
                  <h4 className="font-serif text-lg font-semibold">
                    Verified Customer Reviews ({modalReviews.length})
                  </h4>

                  {modalReviews.length === 0 ? (
                    <p className="text-xs text-[#6F4028]">
                      Be the first verified sipper to review {selectedItem.name}.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {modalReviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-3.5 rounded-2xl bg-white border border-[#6F4028]/12 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#3B2418]">
                                {rev.userName}
                              </span>
                              {rev.verifiedPurchase && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#294B35]/12 text-[#294B35] text-[10px] font-semibold">
                                  <CheckCircle2 className="w-3 h-3" /> Verified Purchase
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[#E68A24]">
                                {'★'.repeat(rev.rating)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  reportReview(rev.id, 'Flagged by visitor')
                                }
                                title="Report inappropriate review"
                                className="text-[#6F4028]/50 hover:text-rose-600 cursor-pointer"
                              >
                                <Flag className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[#6F4028] leading-relaxed">
                            {rev.comment}
                          </p>
                          {rev.adminReply && (
                            <p className="p-2 rounded-xl bg-[#F5EBDD] text-[#3B2418] text-[11px]">
                              <strong>{store.brand.name} Reply:</strong>{' '}
                              {rev.adminReply}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit Verified Review Form */}
                  <form
                    onSubmit={handlePostReview}
                    className="p-4 rounded-2xl bg-[#F5EBDD]/70 border border-[#6F4028]/12 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">
                        Write a Review (Verified Purchasers Only)
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setRevRating(n)}
                            className="cursor-pointer"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                n <= revRating
                                  ? 'fill-[#E68A24] text-[#E68A24]'
                                  : 'text-[#6F4028]/30'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={revComment}
                      onChange={(e) => setRevComment(e.target.value)}
                      placeholder={
                        customerUser
                          ? `Share how ${selectedItem.name} tasted...`
                          : 'Sign in with an account that ordered this beverage to post a verified review.'
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#6F4028]/15 text-xs"
                    />
                    {revError && (
                      <p className="text-xs text-rose-600 font-medium">{revError}</p>
                    )}
                    {revFeedback && (
                      <p className="text-xs text-[#294B35] font-medium">
                        {revFeedback}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={revSubmitting}
                      className="px-4 py-2 rounded-full bg-[#3B2418] text-[#FFF9F0] text-xs font-semibold cursor-pointer"
                    >
                      {revSubmitting ? 'Posting...' : 'Post Verified Review'}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
