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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
          Filters
        </h2>
        {selectedCategories.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-[11px] font-medium text-brand-blue transition-colors hover:text-[#00c8ff]"
          >
            Clear all
          </button>
        )}
      </div>

      <div>
        <h3 className="mb-4 text-[12px] font-semibold text-white/60">Category</h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label
              key={cat}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 transition-all duration-300 hover:bg-white/5 hover:text-white"
            >
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat)}
                onChange={() => onToggleCategory(cat)}
                className="h-4 w-4 rounded border-white/20 bg-transparent text-brand-blue focus:ring-brand-blue focus:ring-offset-0"
              />
              <span className="flex-1">{cat}</span>
              <span className="text-[11px] text-gray-600">({productCounts[cat] || 0})</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
