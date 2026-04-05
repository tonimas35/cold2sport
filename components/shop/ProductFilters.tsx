'use client'

import { categories } from '@/lib/products'

type ProductFiltersProps = {
  selectedCategories: string[]
  onToggleCategory: (cat: string) => void
  onClearAll: () => void
  productCounts: Record<string, number>
}

export default function ProductFilters({
  selectedCategories,
  onToggleCategory,
  onClearAll,
  productCounts,
}: ProductFiltersProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-[14px] font-normal tracking-[0.1em] text-brand-navy">
          Filters
        </h2>
        {selectedCategories.length > 0 && (
          <button
            onClick={onClearAll}
            className="font-body text-[12px] font-medium text-brand-gold hover:text-[#b8894f]"
          >
            Clear all
          </button>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-body text-[13px] font-medium text-brand-text-mid">Category</h3>
        <div className="space-y-1.5">
          {categories.map((cat) => (
            <label
              key={cat}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 font-body text-[14px] text-brand-text-mid transition-colors hover:bg-brand-cream hover:text-brand-navy"
            >
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat)}
                onChange={() => onToggleCategory(cat)}
                className="h-4 w-4 rounded border-brand-border text-brand-gold focus:ring-brand-gold"
              />
              <span className="flex-1">{cat}</span>
              <span className="text-[12px] text-brand-text-light">({productCounts[cat] || 0})</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
