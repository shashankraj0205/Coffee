import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, Flame, Coffee, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { MenuItem } from '../types/store';
import { useStore } from '../context/StoreContext';
import { useModalEffects } from '../utils/useModalEffects';
import { SOLEN_EASE } from './MotionPrimitives';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  onSelectProduct: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
}

const RECENT_SEARCH_KEY = 'kulhad_recent_searches_v1';
const SUGGESTIONS = [
  'Masala Chai',
  'Filter Coffee',
  'Tandoori',
  'Ginger',
  'Saffron',
  'Cold Coffee',
  'Cardamom',
  'Kulhad',
  'Kahwa',
];

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  open,
  onClose,
  onSelectProduct,
  onQuickAdd,
}) => {
  const { store, shopStatus, recentlyViewedIds } = useStore();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useModalEffects(open, onClose);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const saveSearchTerm = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
      return next;
    });
  };

  const results = useMemo(() => {
    const visible = store.menuItems.filter((m) => m.displayed);
    const q = query.trim().toLowerCase();
    if (!q) return visible.slice(0, 8);
    return visible.filter((item) => {
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
  }, [store.menuItems, query]);

  const recentlyViewed = useMemo(
    () =>
      recentlyViewedIds
        .map((id) => store.menuItems.find((m) => m.id === id && m.displayed))
        .filter(Boolean) as MenuItem[],
    [recentlyViewedIds, store.menuItems]
  );

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[65] flex items-start justify-center p-4 sm:pt-16"
          role="dialog"
          aria-modal="true"
          aria-label="Search Tea & Coffee Menu"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1E120C]/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: SOLEN_EASE }}
            className="relative z-10 w-full max-w-2xl rounded-3xl bg-white text-[#15241E] border border-[#144734]/15 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          >
            {/* Input Bar */}
            <div className="p-4 sm:p-5 border-b border-[#144734]/12 bg-[#F4F7F5] flex items-center gap-3">
              <Search className="w-5 h-5 text-[#E68A24] shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) saveSearchTerm(query);
                }}
                placeholder="Search Masala Chai, Filter Coffee, ginger, saffron, cold..."
                className="flex-1 bg-transparent text-sm sm:text-base text-[#3B2418] placeholder:text-[#6F4028]/60 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-xs font-mono text-[#6F4028] hover:text-[#3B2418] px-2 py-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close search"
                className="w-8 h-8 rounded-full bg-[#FFF9F0] border border-[#6F4028]/15 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              {/* Suggestions & Recent Searches */}
              <div className="space-y-3">
                {recentSearches.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#6F4028]">
                      <Clock className="w-3 h-3" /> Recent:
                    </span>
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQuery(term)}
                        className="px-2.5 py-1 rounded-full bg-[#F5EBDD] hover:bg-[#E68A24]/20 text-xs font-medium text-[#3B2418] cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#6F4028] mr-1">
                    Popular:
                  </span>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setQuery(s);
                        saveSearchTerm(s);
                      }}
                      className="px-2.5 py-1 rounded-full border border-[#6F4028]/15 bg-white hover:border-[#E68A24] text-xs font-medium text-[#6F4028] hover:text-[#3B2418] cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recently Viewed */}
              {!query && recentlyViewed.length > 0 && (
                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#294B35] font-semibold">
                    Recently Viewed Beverages
                  </p>
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {recentlyViewed.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectProduct(item);
                          onClose();
                        }}
                        className="shrink-0 flex items-center gap-2.5 p-2 pr-3 rounded-2xl bg-[#F5EBDD] border border-[#6F4028]/15 hover:border-[#E68A24] text-left cursor-pointer"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div>
                          <p className="text-xs font-semibold text-[#3B2418]">
                            {item.name}
                          </p>
                          <p className="font-mono text-[11px] text-[#6F4028]">
                            ₹{item.price}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              <div className="space-y-2.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#6F4028]">
                  {query ? `${results.length} matching teas & coffees` : 'Trending Pours'}
                </p>

                {results.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-[#F5EBDD]/60 border border-[#6F4028]/12">
                    <p className="font-serif text-lg font-medium text-[#3B2418]">
                      No beverages matched “{query}”
                    </p>
                    <p className="text-xs text-[#6F4028] mt-1">
                      Remember, we serve only pure Indian Tea &amp; Coffee! Try searching “ginger”, “saffron”, “kulhad”, or “cold coffee”.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {results.map((item) => {
                      const canOrder =
                        item.available && item.stockCount > 0 && shopStatus.canOrder;
                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-white border border-[#6F4028]/12 hover:border-[#E68A24]/60 flex items-center gap-3 transition-all"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            onClick={() => {
                              saveSearchTerm(query || item.name);
                              onSelectProduct(item);
                              onClose();
                            }}
                            className="w-14 h-14 rounded-xl object-cover shrink-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                saveSearchTerm(query || item.name);
                                onSelectProduct(item);
                                onClose();
                              }}
                              className="text-left block w-full cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5">
                                {item.category === 'tea' ? (
                                  <Flame className="w-3 h-3 text-[#294B35] shrink-0" />
                                ) : (
                                  <Coffee className="w-3 h-3 text-[#6F4028] shrink-0" />
                                )}
                                <p className="font-serif text-sm font-semibold text-[#3B2418] truncate">
                                  {item.name}
                                </p>
                              </div>
                              <p className="text-[11px] text-[#6F4028] truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            </button>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-[#3B2418]">
                                ₹{item.price}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    saveSearchTerm(query || item.name);
                                    onSelectProduct(item);
                                    onClose();
                                  }}
                                  className="text-[11px] font-medium text-[#6F4028] hover:text-[#E68A24] inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  Customize <ArrowRight className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={!canOrder}
                                  onClick={() => {
                                    saveSearchTerm(query || item.name);
                                    onQuickAdd(item);
                                  }}
                                  className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-[#3B2418] hover:bg-[#6F4028] disabled:opacity-40 text-[#FFF9F0] text-[11px] font-semibold cursor-pointer"
                                >
                                  <Plus className="w-3 h-3 text-[#E68A24]" /> Add
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] text-[#6F4028] border-t border-[#6F4028]/10">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#E68A24]" />
                  Partial search matches names, Hindi labels, spices &amp; ingredients
                </span>
                <span className="font-mono">ESC to close</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
