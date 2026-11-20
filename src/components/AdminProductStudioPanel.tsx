import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Star,
  ArrowUp,
  ArrowDown,
  Flame,
  Snowflake,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { MenuItem } from '../types/store';
import { useStore } from '../context/StoreContext';
import { getItemSizes } from '../utils/commerce';

interface AdminProductStudioPanelProps {
  notify: (msg: string) => void;
  onOpenCreate: () => void;
  onOpenEdit: (item: MenuItem) => void;
}

type StatusFilter =
  | 'all'
  | 'available'
  | 'sold_out'
  | 'hidden'
  | 'bestseller'
  | 'discounted';

export const AdminProductStudioPanel: React.FC<AdminProductStudioPanelProps> = ({
  notify,
  onOpenCreate,
  onOpenEdit,
}) => {
  const {
    store,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    reorderMenuItems,
  } = useStore();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<'all' | 'tea' | 'coffee'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Per-item inline editing states
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [bulkDeltaInr, setBulkDeltaInr] = useState<number>(10);
  const [bulkBusy, setBulkBusy] = useState(false);

  const sortedItems = useMemo(
    () => [...store.menuItems].sort((a, b) => a.sortOrder - b.sortOrder),
    [store.menuItems]
  );

  const isFiltered =
    catFilter !== 'all' || statusFilter !== 'all' || search.trim().length > 0;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedItems.filter((item) => {
      if (catFilter !== 'all' && item.category !== catFilter) return false;
      if (
        statusFilter === 'available' &&
        (!item.available || item.stockCount <= 0)
      )
        return false;
      if (statusFilter === 'sold_out' && item.available && item.stockCount > 0)
        return false;
      if (statusFilter === 'hidden' && item.displayed) return false;
      if (statusFilter === 'bestseller' && !item.isBestseller) return false;
      if (
        statusFilter === 'discounted' &&
        !(item.originalPrice && item.originalPrice > item.price)
      )
        return false;

      if (!q) return true;
      return [
        item.name,
        item.hindiName || '',
        item.subtitle,
        item.origin,
        item.badge || '',
        String(item.price),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [sortedItems, catFilter, statusFilter, search]);

  // Quick KPI summaries
  const teaCount = sortedItems.filter((i) => i.category === 'tea').length;
  const coffeeCount = sortedItems.filter((i) => i.category === 'coffee').length;
  const inStockCount = sortedItems.filter(
    (i) => i.available && i.stockCount > 0
  ).length;
  const displayedCount = sortedItems.filter((i) => i.displayed).length;

  const handleSaveInlinePrice = async (item: MenuItem) => {
    const raw = priceInputs[item.id];
    if (raw === undefined) return;
    const nextPrice = Math.max(0, Math.round(Number(raw) || 0));
    await updateMenuItem(item.id, { price: nextPrice });
    setPriceInputs((prev) => {
      const copy = { ...prev };
      delete copy[item.id];
      return copy;
    });
    notify(`Updated ${item.name} price to ₹${nextPrice}`);
  };

  const handleQuickStepPrice = async (item: MenuItem, delta: number) => {
    const nextPrice = Math.max(10, Math.round(item.price + delta));
    await updateMenuItem(item.id, { price: nextPrice });
    setPriceInputs((prev) => {
      const copy = { ...prev };
      delete copy[item.id];
      return copy;
    });
    notify(`${item.name} price → ₹${nextPrice}`);
  };

  const handleDuplicate = async (item: MenuItem) => {
    const { id: _ignore, sortOrder: _so, ...rest } = item;
    await createMenuItem({
      ...rest,
      name: `${item.name} (Special)`,
      featured: false,
    });
    notify(`Duplicated “${item.name}” — ready to customize!`);
  };

  const handleMove = async (id: string, dir: -1 | 1) => {
    if (isFiltered) return;
    const ids = sortedItems.map((m) => m.id);
    const idx = ids.indexOf(id);
    const target = idx + dir;
    if (idx === -1 || target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    await reorderMenuItems(ids);
    notify('Updated product display order');
  };

  const handleBulkPriceAdjust = async (sign: 1 | -1) => {
    if (filteredItems.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      for (const item of filteredItems) {
        const nextPrice = Math.max(
          10,
          Math.round(item.price + sign * Math.abs(bulkDeltaInr))
        );
        await updateMenuItem(item.id, { price: nextPrice });
      }
      notify(
        `Adjusted price by ${sign > 0 ? '+' : '-'}₹${Math.abs(bulkDeltaInr)} across ${filteredItems.length} products`
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkRestockAll = async () => {
    if (filteredItems.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      for (const item of filteredItems) {
        await updateMenuItem(item.id, {
          available: true,
          displayed: true,
          stockCount: Math.max(50, item.stockCount + 25),
        });
      }
      notify(
        `Restocked & marked ${filteredItems.length} products Available & Displayed`
      );
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header + Add New Product CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#D49B45]">
            Dedicated Product &amp; Pricing Control Center
          </span>
          <h3 className="text-2xl font-bold text-white mt-0.5">
            Products, Prices &amp; Variants Manager
          </h3>
          <p className="text-xs text-white/65 mt-0.5">
            Add, remove, duplicate, reorder, and control exact ₹ prices, MRP discounts, sizes, stock, visibility &amp; ingredients for every Tea and Coffee.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#D49B45] hover:bg-[#E5B05C] text-[#0D0A09] text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Tea / Coffee</span>
        </button>
      </div>

      {/* Product Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10">
          <p className="text-[11px] text-white/60">Total Products</p>
          <p className="text-xl font-bold text-white mt-0.5">
            {sortedItems.length}
          </p>
          <p className="text-[11px] text-[#D49B45]">
            {teaCount} Teas · {coffeeCount} Coffees
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10">
          <p className="text-[11px] text-white/60">In Stock Now</p>
          <p className="text-xl font-bold text-emerald-300 mt-0.5">
            {inStockCount} / {sortedItems.length}
          </p>
          <p className="text-[11px] text-white/55">
            {sortedItems.length - inStockCount} marked Sold Out
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10">
          <p className="text-[11px] text-white/60">Displayed on Site</p>
          <p className="text-xl font-bold text-white mt-0.5">
            {displayedCount} Visible
          </p>
          <p className="text-[11px] text-white/55">
            {sortedItems.length - displayedCount} hidden
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10">
          <p className="text-[11px] text-white/60">Price Range (₹)</p>
          <p className="text-xl font-bold text-[#D49B45] mt-0.5">
            ₹
            {sortedItems.length
              ? Math.min(...sortedItems.map((i) => i.price))
              : 0}{' '}
            – ₹
            {sortedItems.length
              ? Math.max(...sortedItems.map((i) => i.price))
              : 0}
          </p>
          <p className="text-[11px] text-white/55">100% admin-controlled</p>
        </div>
      </div>

      {/* Search + Category + Status Filters */}
      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#D49B45] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search any particular product by name, Hindi name, origin, or ₹ price..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-xs text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#D49B45]"
            />
          </div>

          <div className="inline-flex p-1 rounded-xl bg-black/30 border border-white/10 text-xs">
            {(
              [
                { id: 'all', label: `All (${sortedItems.length})` },
                { id: 'tea', label: `Tea (${teaCount})` },
                { id: 'coffee', label: `Coffee (${coffeeCount})` },
              ] as const
            ).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCatFilter(c.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  catFilter === c.id
                    ? 'bg-[#D49B45] text-[#0D0A09]'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Pills + Bulk Price & Restock Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {(
              [
                { id: 'all', label: 'All Status' },
                { id: 'available', label: 'In Stock' },
                { id: 'sold_out', label: 'Sold Out' },
                { id: 'hidden', label: 'Hidden' },
                { id: 'bestseller', label: '★ Bestsellers' },
                { id: 'discounted', label: 'On Discount' },
              ] as { id: StatusFilter; label: string }[]
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-full font-semibold cursor-pointer border ${
                  statusFilter === st.id
                    ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200'
                    : 'bg-white/[0.04] border-white/10 text-white/65 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Bulk Controls for Currently Filtered Products */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-white/55 mr-1">
              Bulk ({filteredItems.length}):
            </span>
            <input
              type="number"
              min={1}
              max={200}
              value={bulkDeltaInr}
              onChange={(e) =>
                setBulkDeltaInr(Math.max(1, Number(e.target.value) || 5))
              }
              className="w-14 px-2 py-1 rounded-lg bg-white/10 border border-white/15 text-center font-bold"
              title="Bulk price change amount (₹)"
            />
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => handleBulkPriceAdjust(-1)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-semibold cursor-pointer"
            >
              -₹{bulkDeltaInr}
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => handleBulkPriceAdjust(1)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-semibold cursor-pointer"
            >
              +₹{bulkDeltaInr}
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={handleBulkRestockAll}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/45 border border-emerald-400/35 text-emerald-200 font-semibold cursor-pointer"
            >
              <RefreshCw
                className={`w-3 h-3 ${bulkBusy ? 'animate-spin' : ''}`}
              />
              Restock All
            </button>
          </div>
        </div>
      </div>

      {/* Individual Product Control Cards */}
      {filteredItems.length === 0 ? (
        <div className="p-10 rounded-3xl bg-white/[0.03] border border-white/10 text-center space-y-3">
          <p className="text-lg font-semibold text-white">
            No products matched your filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCatFilter('all');
              setStatusFilter('all');
            }}
            className="px-4 py-2 rounded-full bg-[#D49B45] text-[#0D0A09] text-xs font-bold cursor-pointer"
          >
            Show All Products
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            const isSoldOut = !item.available || item.stockCount <= 0;
            const draftPrice = priceInputs[item.id];
            const priceDirty =
              draftPrice !== undefined && Number(draftPrice) !== item.price;
            const itemSizes = getItemSizes(item);

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  item.displayed
                    ? 'bg-white/[0.05] border-white/[0.12]'
                    : 'bg-white/[0.02] border-white/[0.06] opacity-70'
                }`}
              >
                {/* Main Product Row */}
                <div className="p-4 flex flex-col xl:flex-row xl:items-center gap-4">
                  {/* Left: Sort + Image + Title + Tags */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={isFiltered || idx === 0}
                        onClick={() => handleMove(item.id, -1)}
                        className="p-1 rounded bg-white/[0.07] hover:bg-white/20 disabled:opacity-25 cursor-pointer"
                        title={isFiltered ? 'Clear filter to reorder' : 'Move up'}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={isFiltered || idx === sortedItems.length - 1}
                        onClick={() => handleMove(item.id, 1)}
                        className="p-1 rounded bg-white/[0.07] hover:bg-white/20 disabled:opacity-25 cursor-pointer"
                        title={
                          isFiltered ? 'Clear filter to reorder' : 'Move down'
                        }
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <img
                      src={item.image}
                      alt={item.name}
                      onClick={() => onOpenEdit(item)}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/15 cursor-pointer hover:opacity-90"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenEdit(item)}
                          className="text-base font-bold text-white hover:text-[#D49B45] truncate cursor-pointer text-left"
                        >
                          {item.name}
                        </button>
                        {item.hindiName && (
                          <span className="font-devanagari text-xs text-[#D49B45]">
                            {item.hindiName}
                          </span>
                        )}
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-semibold">
                          {item.category === 'tea' ? 'Tea' : 'Coffee'}
                        </span>
                        {item.isBestseller && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D49B45]/25 text-[#F0C97A] font-semibold">
                            ★ Bestseller
                          </span>
                        )}
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 font-semibold">
                            MRP ₹{item.originalPrice}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/60 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                      <p className="text-[11px] text-white/50 mt-0.5">
                        Stock: <strong className="text-white">{item.stockCount}</strong> ·
                        Coins: <strong className="text-[#D49B45]">+{item.beansEarned}</strong> ·{' '}
                        {item.supportsHot !== false ? '🔥 Hot ' : ''}
                        {item.supportsCold ? '❄️ Cold' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Center: Direct Instant ₹ Price Controller */}
                  <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-black/30 border border-[#D49B45]/30 self-start xl:self-center">
                    <button
                      type="button"
                      onClick={() => handleQuickStepPrice(item, -5)}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
                      title="Decrease price by ₹5"
                    >
                      -5
                    </button>
                    <div className="flex items-center px-1.5">
                      <span className="text-xs font-bold text-[#D49B45] mr-0.5">
                        ₹
                      </span>
                      <input
                        type="number"
                        min={0}
                        aria-label={`Price for ${item.name}`}
                        value={draftPrice !== undefined ? draftPrice : item.price}
                        onChange={(e) =>
                          setPriceInputs({
                            ...priceInputs,
                            [item.id]: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlinePrice(item);
                        }}
                        className="w-16 bg-transparent text-sm font-bold text-white text-center focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickStepPrice(item, 5)}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
                      title="Increase price by ₹5"
                    >
                      +5
                    </button>
                    {priceDirty && (
                      <button
                        type="button"
                        onClick={() => handleSaveInlinePrice(item)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 text-[#0D0A09] text-[11px] font-bold cursor-pointer inline-flex items-center gap-0.5"
                      >
                        <Check className="w-3 h-3" /> Save
                      </button>
                    )}
                  </div>

                  {/* Right: Status & Full Product Actions */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        const nextAvail = isSoldOut;
                        await updateMenuItem(item.id, {
                          available: nextAvail,
                          stockCount:
                            nextAvail && item.stockCount === 0
                              ? 40
                              : item.stockCount,
                        });
                        notify(
                          `${item.name} → ${nextAvail ? 'Available' : 'Sold Out'}`
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border cursor-pointer ${
                        !isSoldOut
                          ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                          : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                      }`}
                    >
                      {!isSoldOut ? 'In Stock' : 'Sold Out'}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await updateMenuItem(item.id, {
                          displayed: !item.displayed,
                        });
                        notify(
                          `${item.name} ${
                            !item.displayed ? 'shown on site' : 'hidden from site'
                          }`
                        );
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border cursor-pointer ${
                        item.displayed
                          ? 'bg-[#D49B45]/20 border-[#D49B45]/40 text-[#F0C97A]'
                          : 'bg-white/10 border-white/15 text-white/55'
                      }`}
                      title="Show or hide on website"
                    >
                      {item.displayed ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Expand Quick Controls Drawer */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : item.id)
                      }
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold border cursor-pointer ${
                        isExpanded
                          ? 'bg-white text-[#0D0A09] border-white'
                          : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                      }`}
                      title="Expand quick size, MRP, stock & label controls"
                    >
                      <span>Quick</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Open Full 4-Tab Product Editor */}
                    <button
                      type="button"
                      onClick={() => onOpenEdit(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#D49B45] hover:bg-[#E5B05C] text-[#0D0A09] text-[11px] font-bold cursor-pointer"
                      title="Edit all details, photo, prices, sizes & recipe"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit All</span>
                    </button>

                    {/* Duplicate Product */}
                    <button
                      type="button"
                      onClick={() => handleDuplicate(item)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                      title="Duplicate this product"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Product with Confirmation */}
                    {confirmDeleteId === item.id ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteMenuItem(item.id);
                          setConfirmDeleteId(null);
                          notify(`Deleted “${item.name}”`);
                        }}
                        className="px-2.5 py-1.5 rounded-full bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="p-2 rounded-full bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 cursor-pointer"
                        title="Remove product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Single-Product Inline Control Drawer */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 bg-black/25 border-t border-white/10 grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                    {/* Small / Medium / Large Quick Prices */}
                    <div className="md:col-span-5 space-y-2">
                      <p className="text-[11px] font-bold text-[#D49B45] uppercase">
                        Size Prices (₹) — Type &amp; Blur to Save
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {itemSizes.map((sz) => {
                          const curExact = Math.max(
                            10,
                            Math.round(item.price + sz.priceDelta)
                          );
                          return (
                            <div
                              key={sz.name}
                              className="p-2 rounded-xl bg-white/[0.06] border border-white/10"
                            >
                              <span className="block text-[10px] text-white/65">
                                {sz.name} ({sz.volumeLabel})
                              </span>
                              <div className="flex items-center mt-1">
                                <span className="text-[#D49B45] font-bold mr-1">
                                  ₹
                                </span>
                                <input
                                  type="number"
                                  min={10}
                                  defaultValue={curExact}
                                  onBlur={async (e) => {
                                    const val = Math.max(
                                      10,
                                      Math.round(Number(e.target.value) || curExact)
                                    );
                                    if (val === curExact) return;
                                    if (sz.name === 'Medium') {
                                      await updateMenuItem(item.id, { price: val });
                                    } else {
                                      const nextSizes = itemSizes.map((s) =>
                                        s.name === sz.name
                                          ? { ...s, priceDelta: val - item.price }
                                          : s
                                      );
                                      await updateMenuItem(item.id, {
                                        sizes: nextSizes,
                                      });
                                    }
                                    notify(
                                      `${item.name} (${sz.name}) → ₹${val}`
                                    );
                                  }}
                                  className="w-full bg-transparent font-bold text-white focus:outline-none"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Offer MRP, Stock & Coins */}
                    <div className="md:col-span-4 space-y-2">
                      <p className="text-[11px] font-bold text-[#D49B45] uppercase">
                        Discount MRP, Stock &amp; Coins
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 rounded-xl bg-white/[0.06] border border-white/10">
                          <span className="block text-[10px] text-white/65">
                            MRP (₹)
                          </span>
                          <input
                            type="number"
                            min={0}
                            defaultValue={item.originalPrice || 0}
                            onBlur={async (e) => {
                              const mrp = Math.max(
                                0,
                                Math.round(Number(e.target.value) || 0)
                              );
                              await updateMenuItem(item.id, {
                                originalPrice: mrp,
                              });
                              notify(
                                mrp > item.price
                                  ? `${item.name} discount set (MRP ₹${mrp})`
                                  : `Cleared MRP on ${item.name}`
                              );
                            }}
                            className="w-full mt-1 bg-transparent font-bold text-white focus:outline-none"
                          />
                        </div>
                        <div className="p-2 rounded-xl bg-white/[0.06] border border-white/10">
                          <span className="block text-[10px] text-white/65">
                            Stock Cups
                          </span>
                          <input
                            type="number"
                            min={0}
                            defaultValue={item.stockCount}
                            onBlur={async (e) => {
                              const st = Math.max(
                                0,
                                Math.round(Number(e.target.value) || 0)
                              );
                              await updateMenuItem(item.id, {
                                stockCount: st,
                                available: st > 0,
                              });
                              notify(`${item.name} stock → ${st} cups`);
                            }}
                            className="w-full mt-1 bg-transparent font-bold text-white focus:outline-none"
                          />
                        </div>
                        <div className="p-2 rounded-xl bg-white/[0.06] border border-white/10">
                          <span className="block text-[10px] text-white/65">
                            Coins
                          </span>
                          <input
                            type="number"
                            min={0}
                            defaultValue={item.beansEarned}
                            onBlur={async (e) => {
                              const cn = Math.max(
                                0,
                                Math.round(Number(e.target.value) || 0)
                              );
                              await updateMenuItem(item.id, {
                                beansEarned: cn,
                              });
                              notify(`${item.name} reward → +${cn} Coins`);
                            }}
                            className="w-full mt-1 bg-transparent font-bold text-[#D49B45] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Instant Badge & Variant Toggles */}
                    <div className="md:col-span-3 space-y-2">
                      <p className="text-[11px] font-bold text-[#D49B45] uppercase">
                        Badges &amp; Temp
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            await updateMenuItem(item.id, {
                              featured: !item.featured,
                            });
                            notify(`Updated Featured flag on ${item.name}`);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                            item.featured
                              ? 'bg-amber-400 text-[#0D0A09]'
                              : 'bg-white/10 text-white/70'
                          }`}
                        >
                          <Star className="w-3 h-3" /> Specialty
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await updateMenuItem(item.id, {
                              isBestseller: !item.isBestseller,
                            });
                            notify(`Updated Bestseller tag on ${item.name}`);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                            item.isBestseller
                              ? 'bg-[#D49B45] text-[#0D0A09]'
                              : 'bg-white/10 text-white/70'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" /> Bestseller
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await updateMenuItem(item.id, {
                              isNewArrival: !item.isNewArrival,
                            });
                            notify(`Updated New Arrival tag on ${item.name}`);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                            item.isNewArrival
                              ? 'bg-emerald-400 text-[#0D0A09]'
                              : 'bg-white/10 text-white/70'
                          }`}
                        >
                          <Tag className="w-3 h-3" /> New
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await updateMenuItem(item.id, {
                              supportsHot: item.supportsHot === false,
                            });
                            notify(`Updated Hot option on ${item.name}`);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                            item.supportsHot !== false
                              ? 'bg-orange-500/35 text-orange-200 border border-orange-400/40'
                              : 'bg-white/10 text-white/50'
                          }`}
                        >
                          <Flame className="w-3 h-3" /> Hot
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await updateMenuItem(item.id, {
                              supportsCold: !item.supportsCold,
                            });
                            notify(`Updated Cold option on ${item.name}`);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                            item.supportsCold
                              ? 'bg-sky-500/35 text-sky-200 border border-sky-400/40'
                              : 'bg-white/10 text-white/50'
                          }`}
                        >
                          <Snowflake className="w-3 h-3" /> Cold
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
