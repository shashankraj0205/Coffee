import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Check,
  IndianRupee,
  Sliders,
  FileText,
  Leaf,
  Trash2,
} from 'lucide-react';
import { BeverageTemp, MenuItem, ProductSizeOption } from '../types/store';
import { GALLERY_IMAGES } from '../utils/schedule';
import { compressImageFile } from '../utils/image';
import { useModalEffects } from '../utils/useModalEffects';
import { getItemSizes } from '../utils/commerce';
import { useStore } from '../context/StoreContext';

interface AdminMenuModalProps {
  open: boolean;
  editingItem: MenuItem | null;
  onClose: () => void;
  onSave: (itemData: Partial<MenuItem>, editingId?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

type EditorSection = 'details' | 'pricing' | 'variants' | 'ingredients';

interface SizeDraft {
  name: 'Small' | 'Medium' | 'Large';
  volumeLabel: string;
  exactPrice: number;
}

const DEFAULT_FORM = {
  name: '',
  hindiName: '',
  subtitle: '',
  servingStyle: 'Handmade Clay Kulhad',
  category: 'tea' as 'tea' | 'coffee',
  price: 70,
  originalPrice: 0,
  beansEarned: 35,
  stockCount: 60,
  origin: 'Upper Assam, India',
  elevation: 'Fresh Brewed Batch',
  badge: 'House Specialty',
  caffeine: 'Medium' as 'Low' | 'Medium' | 'High',
  supportsHot: true,
  supportsCold: false,
  defaultTemp: 'hot' as BeverageTemp,
  available: true,
  displayed: true,
  featured: false,
  isBestseller: false,
  isNewArrival: false,
  notesText: 'Green Cardamom, Fresh Ginger, Rich Finish',
  ingredientsText: 'Assam CTC Tea Leaves, Fresh Milk, Crushed Ginger, Green Cardamom',
  preparationSteps:
    'Freshly crushed spices boiled with estate tea leaves and simmered with farm-fresh milk.',
  description: '',
  image: '/images/indian-hero-chai-kaapi.jpg',
  label1: 'Richness',
  val1: 90,
  label2: 'Aroma',
  val2: 88,
  label3: 'Strength',
  val3: 86,
};

export const AdminMenuModal: React.FC<AdminMenuModalProps> = ({
  open,
  editingItem,
  onClose,
  onSave,
  onDelete,
}) => {
  const { store } = useStore();
  const [section, setSection] = useState<EditorSection>('details');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [sizesDraft, setSizesDraft] = useState<SizeDraft[]>([
    { name: 'Small', volumeLabel: '120 ml', exactPrice: 60 },
    { name: 'Medium', volumeLabel: '180 ml', exactPrice: 70 },
    { name: 'Large', volumeLabel: '260 ml', exactPrice: 95 },
  ]);
  const [recipeDraft, setRecipeDraft] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useModalEffects(open, onClose);

  useEffect(() => {
    setSection('details');
    setConfirmDelete(false);
    setUploadError(null);

    if (editingItem) {
      const basePrice = Number(editingItem.price) || 70;
      const itemSizes = getItemSizes(editingItem);
      setForm({
        name: editingItem.name,
        hindiName: editingItem.hindiName || '',
        subtitle: editingItem.subtitle || '',
        servingStyle:
          editingItem.servingStyle ||
          (editingItem.category === 'tea'
            ? 'Handmade Clay Kulhad'
            : 'Warm Ceramic Mug'),
        category: editingItem.category,
        price: basePrice,
        originalPrice: editingItem.originalPrice || 0,
        beansEarned: editingItem.beansEarned ?? 35,
        stockCount: editingItem.stockCount ?? 50,
        origin: editingItem.origin || 'India',
        elevation: editingItem.elevation || 'Fresh Batch',
        badge: editingItem.badge || '',
        caffeine: editingItem.caffeine || 'Medium',
        supportsHot: editingItem.supportsHot !== false,
        supportsCold: Boolean(editingItem.supportsCold),
        defaultTemp: editingItem.defaultTemp === 'cold' ? 'cold' : 'hot',
        available: editingItem.available,
        displayed: editingItem.displayed,
        featured: Boolean(editingItem.featured),
        isBestseller: Boolean(editingItem.isBestseller),
        isNewArrival: Boolean(editingItem.isNewArrival),
        notesText: (editingItem.notes || []).join(', '),
        ingredientsText: (editingItem.ingredients || []).join(', '),
        preparationSteps: editingItem.preparationSteps || '',
        description: editingItem.description || '',
        image: editingItem.image || '/images/indian-hero-chai-kaapi.jpg',
        label1: editingItem.profile?.label1 || 'Richness',
        val1: editingItem.profile?.val1 ?? 88,
        label2: editingItem.profile?.label2 || 'Aroma',
        val2: editingItem.profile?.val2 ?? 86,
        label3: editingItem.profile?.label3 || 'Strength',
        val3: editingItem.profile?.val3 ?? 85,
      });

      setSizesDraft(
        (['Small', 'Medium', 'Large'] as const).map((szName) => {
          const found = itemSizes.find((s) => s.name === szName);
          const fallbackDelta = szName === 'Small' ? -10 : szName === 'Large' ? 25 : 0;
          return {
            name: szName,
            volumeLabel:
              found?.volumeLabel ||
              (szName === 'Small'
                ? '120 ml'
                : szName === 'Medium'
                  ? '180 ml'
                  : '260 ml'),
            exactPrice: Math.max(
              10,
              Math.round(basePrice + (found?.priceDelta ?? fallbackDelta))
            ),
          };
        })
      );
      setRecipeDraft({ ...(editingItem.recipe || {}) });
    } else {
      setForm(DEFAULT_FORM);
      setSizesDraft([
        { name: 'Small', volumeLabel: '120 ml', exactPrice: 60 },
        { name: 'Medium', volumeLabel: '180 ml', exactPrice: 70 },
        { name: 'Large', volumeLabel: '260 ml', exactPrice: 95 },
      ]);
      setRecipeDraft({
        'ing-tea-leaves': 6,
        'ing-milk': 120,
        'ing-sugar': 10,
      });
    }
  }, [editingItem, open]);

  if (!open) return null;

  // Keep Medium size synced whenever base price changes
  const handleBasePriceChange = (newBase: number) => {
    const cleanBase = Math.max(0, Math.round(newBase));
    const diff = cleanBase - form.price;
    setForm((prev) => ({
      ...prev,
      price: cleanBase,
      beansEarned: Math.max(5, Math.round(cleanBase * 0.5)),
    }));
    setSizesDraft((prev) =>
      prev.map((s) =>
        s.name === 'Medium'
          ? { ...s, exactPrice: cleanBase }
          : { ...s, exactPrice: Math.max(10, s.exactPrice + diff) }
      )
    );
  };

  const handleSizePriceChange = (
    name: 'Small' | 'Medium' | 'Large',
    newExact: number
  ) => {
    const clean = Math.max(0, Math.round(newExact));
    setSizesDraft((prev) =>
      prev.map((s) => (s.name === name ? { ...s, exactPrice: clean } : s))
    );
    if (name === 'Medium') {
      setForm((prev) => ({ ...prev, price: clean }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const compressed = await compressImageFile(file, 900, 0.85);
      setForm((prev) => ({ ...prev, image: compressed }));
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Unable to process image.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const basePrice = Math.max(0, Math.round(Number(form.price) || 0));
      const computedSizes: ProductSizeOption[] = sizesDraft.map((s) => ({
        name: s.name,
        volumeLabel: s.volumeLabel.trim() || s.name,
        priceDelta: s.name === 'Medium' ? 0 : Math.round(s.exactPrice - basePrice),
      }));

      const notes = form.notesText
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);
      const ingredients = form.ingredientsText
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);

      const cleanedRecipe: Record<string, number> = {};
      for (const [k, v] of Object.entries(recipeDraft)) {
        if (Number(v) > 0) cleanedRecipe[k] = Number(v);
      }

      const safeSupportsHot =
        !form.supportsHot && !form.supportsCold ? true : form.supportsHot;
      const safeDefaultTemp: BeverageTemp =
        form.defaultTemp === 'cold' && form.supportsCold
          ? 'cold'
          : safeSupportsHot
            ? 'hot'
            : 'cold';

      await onSave(
        {
          name: form.name.trim(),
          hindiName: form.hindiName.trim() || undefined,
          subtitle: form.subtitle.trim() || 'Freshly Brewed Indian Beverage',
          servingStyle: form.servingStyle.trim() || undefined,
          category: form.category,
          price: basePrice,
          originalPrice:
            Number(form.originalPrice) > basePrice
              ? Math.round(Number(form.originalPrice))
              : 0,
          beansEarned: Math.max(0, Math.round(Number(form.beansEarned) || 0)),
          stockCount: Math.max(0, Math.round(Number(form.stockCount) || 0)),
          origin: form.origin.trim() || 'India',
          elevation: form.elevation.trim() || 'Fresh Batch',
          badge: form.badge.trim() || undefined,
          caffeine: form.caffeine,
          supportsHot: safeSupportsHot,
          supportsCold: form.supportsCold,
          defaultTemp: safeDefaultTemp,
          sizes: computedSizes,
          recipe: cleanedRecipe,
          available: form.available && Number(form.stockCount) > 0,
          displayed: form.displayed,
          featured: form.featured,
          isBestseller: form.isBestseller,
          isNewArrival: form.isNewArrival,
          notes: notes.length ? notes : ['Authentic Taste'],
          ingredients: ingredients.length ? ingredients : ['Indian Tea / Coffee'],
          preparationSteps: form.preparationSteps.trim(),
          description: form.description.trim(),
          image: form.image.trim() || '/images/indian-hero-chai-kaapi.jpg',
          profile: {
            label1: form.label1 || 'Richness',
            val1: Math.min(100, Math.max(0, Number(form.val1) || 85)),
            label2: form.label2 || 'Aroma',
            val2: Math.min(100, Math.max(0, Number(form.val2) || 85)),
            label3: form.label3 || 'Strength',
            val3: Math.min(100, Math.max(0, Number(form.val3) || 85)),
          },
        },
        editingItem?.id
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const discountPct =
    form.originalPrice > form.price && form.originalPrice > 0
      ? Math.round(((form.originalPrice - form.price) / form.originalPrice) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-2 sm:p-4 bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[92vh] rounded-3xl bg-white text-[#15241E] border border-[#144734]/15 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#F1F6F3] border-b border-[#144734]/12 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={form.image}
              alt={form.name || 'Product'}
              className="w-11 h-11 rounded-xl object-cover border border-[#144734]/15 shrink-0 bg-white"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C87D28]">
                {editingItem ? 'Single Product Full Control' : 'Create New Product'} · Tea &amp; Coffee Only
              </p>
              <h3 className="text-lg sm:text-xl font-bold text-[#15241E] truncate">
                {editingItem
                  ? `${form.name || editingItem.name} — ₹${form.price}`
                  : 'Add New Indian Tea or Coffee'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product editor"
            className="w-9 h-9 rounded-full bg-white hover:bg-[#EAF3EE] border border-[#144734]/15 flex items-center justify-center text-[#15241E] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Clean Sub-Tabs for Complete Product Control */}
        <div className="px-6 py-2.5 bg-[#FCFAF7] border-b border-[#144734]/10 flex gap-1.5 overflow-x-auto shrink-0">
          {(
            [
              { id: 'details', label: '1. Info & Photo', icon: FileText },
              { id: 'pricing', label: '2. Price, MRP & Sizes (₹)', icon: IndianRupee },
              { id: 'variants', label: '3. Stock, Temp & Labels', icon: Sliders },
              { id: 'ingredients', label: '4. Ingredients & Recipe', icon: Leaf },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = section === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSection(t.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  active
                    ? 'bg-[#144734] text-white shadow-xs'
                    : 'bg-white text-[#52635B] border border-[#144734]/12 hover:text-[#144734]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Form */}
        <form
          id="product-master-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          {/* TAB 1: BASIC INFO & PHOTO */}
          {section === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-[#15241E] mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Masala Chai"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#144734]/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#144734]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-[#15241E] mb-1">
                    Hindi Name
                  </label>
                  <input
                    type="text"
                    value={form.hindiName}
                    onChange={(e) =>
                      setForm({ ...form, hindiName: e.target.value })
                    }
                    placeholder="मसाला चाय"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#144734]/20 text-sm font-devanagari"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-[#15241E] mb-1">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as 'tea' | 'coffee',
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#144734]/20 text-sm font-medium"
                  >
                    <option value="tea">Indian Tea (Chai)</option>
                    <option value="coffee">Indian Coffee</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#15241E] mb-1">
                    Short Subtitle
                  </label>
                  <input
                    type="text"
                    value={form.subtitle}
                    onChange={(e) =>
                      setForm({ ...form, subtitle: e.target.value })
                    }
                    placeholder="Assam CTC · Crushed Ginger & Cardamom"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#144734]/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#15241E] mb-1">
                    Serving Style / Cup Type
                  </label>
                  <input
                    type="text"
                    value={form.servingStyle}
                    onChange={(e) =>
                      setForm({ ...form, servingStyle: e.target.value })
                    }
                    placeholder="Clay Kulhad / Brass Davara / Chai Glass"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#144734]/20 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#15241E] mb-1">
                    Origin / Estate
                  </label>
                  <input
                    type="text"
                    value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FCFAF7] border border-[#144734]/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#15241E] mb-1">
                    Roast / Harvest Detail
                  </label>
                  <input
                    type="text"
                    value={form.elevation}
                    onChange={(e) =>
                      setForm({ ...form, elevation: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FCFAF7] border border-[#144734]/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#15241E] mb-1">
                    Custom Tag Badge
                  </label>
                  <input
                    type="text"
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    placeholder="e.g., House Specialty"
                    className="w-full px-3 py-2 rounded-xl bg-[#FCFAF7] border border-[#144734]/20 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#15241E] mb-1">
                  Full Product Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Describe the aroma, taste, and authentic preparation..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#144734]/20 text-sm"
                />
              </div>

              {/* Product Image Manager */}
              <div className="p-4 rounded-2xl bg-[#F4F7F5] border border-[#144734]/12 space-y-3">
                <label className="block text-xs font-semibold text-[#15241E]">
                  Product Image (Upload Photo, Paste URL, or Choose Gallery)
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <img
                    src={form.image}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-[#144734]/20 bg-white shrink-0"
                  />
                  <input
                    type="text"
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    placeholder="https://... or /images/..."
                    className="flex-1 w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#144734]/20 text-xs"
                  />
                  <label className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#144734] hover:bg-[#0F3829] text-white text-xs font-semibold cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {uploadError && (
                  <p className="text-xs text-rose-600 font-semibold">
                    {uploadError}
                  </p>
                )}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {GALLERY_IMAGES.map((g) => (
                    <button
                      key={g.url}
                      type="button"
                      onClick={() => setForm({ ...form, image: g.url })}
                      className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 cursor-pointer ${
                        form.image === g.url
                          ? 'border-[#144734]'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                      title={g.label}
                    >
                      <img
                        src={g.url}
                        alt={g.label}
                        className="w-full h-full object-cover"
                      />
                      {form.image === g.url && (
                        <span className="absolute inset-0 bg-[#144734]/40 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPLETE PRICE, MRP / DISCOUNT & SIZE PRICING */}
          {section === 'pricing' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-[#F4F7F5] border border-[#144734]/14 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-[#15241E]">
                      Main Price, Offer MRP &amp; Loyalty Coins
                    </h4>
                    <p className="text-xs text-[#52635B]">
                      Set selling price in ₹. Add a higher MRP to automatically display a strikethrough discount badge!
                    </p>
                  </div>
                  {discountPct > 0 && (
                    <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">
                      {discountPct}% OFF Active (₹{form.originalPrice} → ₹{form.price})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-xl bg-white border border-[#144734]/15">
                    <label className="block text-xs font-semibold text-[#144734] mb-1.5">
                      Selling Price (₹ INR) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={form.price}
                      onChange={(e) =>
                        handleBasePriceChange(Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#FCFAF7] border border-[#144734]/20 text-lg font-bold text-[#15241E]"
                    />
                    <div className="flex gap-1.5 mt-2">
                      {[-10, -5, +5, +10, +20].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleBasePriceChange(form.price + d)}
                          className="flex-1 py-1 rounded-md bg-[#F1F6F3] hover:bg-[#144734] hover:text-white text-[11px] font-semibold text-[#144734] cursor-pointer"
                        >
                          {d > 0 ? `+₹${d}` : `-₹${Math.abs(d)}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#144734]/15">
                    <label className="block text-xs font-semibold text-[#52635B] mb-1.5">
                      Original MRP (₹ Optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={form.originalPrice || ''}
                      placeholder="0 (No discount)"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          originalPrice: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#FCFAF7] border border-[#144734]/20 text-lg font-bold text-[#15241E]"
                    />
                    <p className="text-[11px] text-[#52635B] mt-2">
                      Set higher than ₹{form.price} to show discount, or 0 for regular price.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#144734]/15">
                    <label className="block text-xs font-semibold text-[#C87D28] mb-1.5">
                      Chai Coins Rewarded / Cup
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={form.beansEarned}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          beansEarned: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#FCFAF7] border border-[#144734]/20 text-lg font-bold text-[#15241E]"
                    />
                    <p className="text-[11px] text-[#52635B] mt-2">
                      Loyalty coins customer earns per cup ordered.
                    </p>
                  </div>
                </div>
              </div>

              {/* Exact Small / Medium / Large Variant Pricing */}
              <div className="p-5 rounded-2xl bg-white border border-[#144734]/15 space-y-3.5">
                <div>
                  <h4 className="text-base font-bold text-[#15241E]">
                    Cup Size Prices (Small · Medium · Large)
                  </h4>
                  <p className="text-xs text-[#52635B]">
                    Control the exact serving volume label and exact ₹ price for every size option of this product.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {sizesDraft.map((sz, idx) => (
                    <div
                      key={sz.name}
                      className={`p-4 rounded-2xl border space-y-2.5 ${
                        sz.name === 'Medium'
                          ? 'bg-[#EAF3EE] border-[#144734]/30'
                          : 'bg-[#FCFAF7] border-[#144734]/12'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#144734]">
                          {sz.name}
                        </span>
                        {sz.name === 'Medium' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#144734] text-white font-semibold">
                            Base Size
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#52635B] mb-1">
                          Volume / Cup Label
                        </label>
                        <input
                          type="text"
                          value={sz.volumeLabel}
                          onChange={(e) => {
                            const next = [...sizesDraft];
                            next[idx] = { ...sz, volumeLabel: e.target.value };
                            setSizesDraft(next);
                          }}
                          placeholder="e.g., 180 ml"
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#144734]/18 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#52635B] mb-1">
                          Exact {sz.name} Price (₹)
                        </label>
                        <input
                          type="number"
                          min={10}
                          value={sz.exactPrice}
                          onChange={(e) =>
                            handleSizePriceChange(sz.name, Number(e.target.value))
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#144734]/20 text-base font-bold text-[#15241E]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STOCK, AVAILABILITY, DISPLAY, HOT/COLD & LABELS */}
          {section === 'variants' && (
            <div className="space-y-5">
              {/* Stock & Caffeine */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#F4F7F5] border border-[#144734]/12 space-y-2">
                  <label className="block text-xs font-bold text-[#15241E]">
                    Daily Available Cup Stock
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={form.stockCount}
                      onChange={(e) => {
                        const qty = Math.max(0, Number(e.target.value) || 0);
                        setForm({
                          ...form,
                          stockCount: qty,
                          available: qty > 0 ? form.available : false,
                        });
                      }}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-[#144734]/20 text-base font-bold"
                    />
                    {[25, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, stockCount: preset, available: true })
                        }
                        className="px-3 py-2 rounded-xl bg-white hover:bg-[#144734] hover:text-white border border-[#144734]/15 text-xs font-semibold cursor-pointer"
                      >
                        Set {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F4F7F5] border border-[#144734]/12 space-y-2">
                  <label className="block text-xs font-bold text-[#15241E]">
                    Caffeine Strength
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Low', 'Medium', 'High'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setForm({ ...form, caffeine: lvl })}
                        className={`py-2.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                          form.caffeine === lvl
                            ? 'bg-[#144734] text-white border-[#144734]'
                            : 'bg-white text-[#52635B] border-[#144734]/15'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Visibility, Availability & Promotional Labels */}
              <div className="p-5 rounded-2xl bg-white border border-[#144734]/15 space-y-3">
                <h4 className="text-sm font-bold text-[#15241E]">
                  Availability, Storefront Visibility &amp; Badges
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      key: 'available' as const,
                      title: 'Available for Ordering (In Stock)',
                      desc: 'Uncheck to mark as Sold Out Today',
                    },
                    {
                      key: 'displayed' as const,
                      title: 'Display on Website Menu',
                      desc: 'Uncheck to hide product from customers',
                    },
                    {
                      key: 'featured' as const,
                      title: 'Feature in Our Specialties Rail',
                      desc: 'Pin this drink in top signature showcase',
                    },
                    {
                      key: 'isBestseller' as const,
                      title: '★ Bestseller Label',
                      desc: 'Highlight card with golden Bestseller tag',
                    },
                    {
                      key: 'isNewArrival' as const,
                      title: 'New Arrival Label',
                      desc: 'Show fresh New Arrival ribbon on card',
                    },
                  ].map((sw) => (
                    <label
                      key={sw.key}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-[#FCFAF7] border border-[#144734]/12 cursor-pointer hover:border-[#144734]/35"
                    >
                      <input
                        type="checkbox"
                        checked={form[sw.key]}
                        onChange={(e) =>
                          setForm({ ...form, [sw.key]: e.target.checked })
                        }
                        className="mt-0.5 w-4 h-4 accent-[#144734]"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#15241E]">
                          {sw.title}
                        </p>
                        <p className="text-[11px] text-[#52635B]">{sw.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Hot / Cold Temperature Options */}
              <div className="p-5 rounded-2xl bg-[#F8F4EC] border border-[#C87D28]/25 space-y-3">
                <h4 className="text-sm font-bold text-[#15241E]">
                  Temperature Variants (Hot / Cold)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#144734]/12 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={form.supportsHot}
                      onChange={(e) =>
                        setForm({ ...form, supportsHot: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#144734]"
                    />
                    <span>🔥 Serve Hot</span>
                  </label>
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#144734]/12 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={form.supportsCold}
                      onChange={(e) =>
                        setForm({ ...form, supportsCold: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#144734]"
                    />
                    <span>❄️ Serve Cold / Iced</span>
                  </label>
                  <select
                    value={form.defaultTemp}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        defaultTemp: e.target.value as BeverageTemp,
                      })
                    }
                    className="px-3 py-2.5 rounded-xl bg-white border border-[#144734]/15 font-semibold"
                  >
                    <option value="hot">Default: Hot</option>
                    <option value="cold">Default: Cold</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INGREDIENTS, PREPARATION, TASTE BARS & INVENTORY RECIPE */}
          {section === 'ingredients' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#15241E] mb-1">
                  Flavour Notes (comma-separated tags)
                </label>
                <input
                  type="text"
                  value={form.notesText}
                  onChange={(e) =>
                    setForm({ ...form, notesText: e.target.value })
                  }
                  placeholder="Green Cardamom, Fresh Ginger, Warm Cinnamon"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#144734]/20 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#15241E] mb-1">
                  Ingredients Shown to Customers (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.ingredientsText}
                  onChange={(e) =>
                    setForm({ ...form, ingredientsText: e.target.value })
                  }
                  placeholder="Assam CTC Tea, Full-Cream Milk, Wayanad Ginger, Idukki Cardamom"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#144734]/20 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#15241E] mb-1">
                  Preparation Method
                </label>
                <textarea
                  rows={2}
                  value={form.preparationSteps}
                  onChange={(e) =>
                    setForm({ ...form, preparationSteps: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFAF7] border border-[#144734]/20 text-sm"
                />
              </div>

              {/* Sensory Taste Sliders */}
              <div className="p-4 rounded-2xl bg-[#F4F7F5] border border-[#144734]/12 space-y-3">
                <p className="text-xs font-bold text-[#15241E]">
                  Taste Profile Meters (0–100)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      { lKey: 'label1', vKey: 'val1' },
                      { lKey: 'label2', vKey: 'val2' },
                      { lKey: 'label3', vKey: 'val3' },
                    ] as const
                  ).map((pair) => (
                    <div
                      key={pair.lKey}
                      className="p-3 rounded-xl bg-white border border-[#144734]/12 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={form[pair.lKey]}
                          onChange={(e) =>
                            setForm({ ...form, [pair.lKey]: e.target.value })
                          }
                          className="w-24 px-2 py-1 rounded bg-[#FCFAF7] border border-[#144734]/15 text-xs font-semibold"
                        />
                        <span className="text-xs font-bold text-[#144734]">
                          {form[pair.vKey]}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={form[pair.vKey]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [pair.vKey]: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#144734]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Inventory Auto-Deduction Per Cup */}
              {store.ingredients.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-[#144734]/15 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-[#15241E]">
                      Inventory Usage Per Medium Cup (Auto-Deducted on Order)
                    </p>
                    <p className="text-[11px] text-[#52635B]">
                      Set 0 for any ingredient not used in this beverage.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {store.ingredients.map((ing) => (
                      <div
                        key={ing.id}
                        className="p-2.5 rounded-xl bg-[#FCFAF7] border border-[#144734]/10 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate font-medium" title={ing.name}>
                          {ing.name.split(' ').slice(-2).join(' ')} ({ing.unit})
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={recipeDraft[ing.id] ?? 0}
                          onChange={(e) =>
                            setRecipeDraft({
                              ...recipeDraft,
                              [ing.id]: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-16 px-2 py-1 rounded-lg bg-white border border-[#144734]/20 text-right font-bold"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer Actions: Delete, Cancel & Save */}
        <div className="px-6 py-4 bg-[#F4F7F5] border-t border-[#144734]/12 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {editingItem && onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-700">
                  Remove permanently?
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await onDelete(editingItem.id);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold cursor-pointer"
                >
                  Yes, Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-full bg-white border border-[#144734]/15 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Product</span>
              </button>
            )
          ) : (
            <span className="text-xs text-[#52635B]">
              Syncs immediately to storefront &amp; SQLite database
            </span>
          )}

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-white hover:bg-[#EAF3EE] border border-[#144734]/18 text-xs font-semibold text-[#15241E] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="product-master-form"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#144734] hover:bg-[#0F3829] disabled:opacity-50 text-white text-xs font-bold shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F0C97A]" />
              <span>
                {saving
                  ? 'Saving...'
                  : editingItem
                    ? `Save Changes (₹${form.price})`
                    : `Add Product (₹${form.price})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
