'use client'

import { useState, useMemo } from 'react'
import { products, categories } from '@/lib/products'
import ProductCard from './ProductCard'
import ProductFilters from './ProductFilters'

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name-az'

export default function ProductGrid() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('featured')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of categories) {
      counts[cat] = products.filter((p) => p.category === cat).length
    }
    return counts
  }, [])

  const filtered = useMemo(() => {
    let result = [...products]
    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.includes(p.category))
    }
    switch (sortBy) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break
      case 'price-desc': result.sort((a, b) => b.price - a.price); break
      case 'name-az': result.sort((a, b) => a.name.localeCompare(b.name)); break
    }
    return result
  }, [selectedCategories, sortBy])

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <div className="mb-8 lg:hidden">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="inline-flex items-center gap-2 rounded-full border border-brand-border px-5 py-2.5 font-body text-[14px] font-medium text-brand-navy"
          aria-expanded={filtersOpen}
        >
          Filters
          {selectedCategories.length > 0 && (
            <span className="rounded-full bg-brand-gold px-2 py-0.5 text-[11px] text-brand-navy">
              {selectedCategories.length}
            </span>
          )}
        </button>
        {filtersOpen && (
          <div className="mt-4 rounded-2xl border border-brand-border bg-white p-5">
            <ProductFilters
              selectedCategories={selectedCategories}
              onToggleCategory={toggleCategory}
              onClearAll={() => setSelectedCategories([])}
              productCounts={productCounts}
            />
          </div>
        )}
      </div>

      <div className="flex gap-12">
        <aside className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-28 rounded-2xl border border-brand-border bg-white p-6">
            <ProductFilters
              selectedCategories={selectedCategories}
              onToggleCategory={toggleCategory}
              onClearAll={() => setSelectedCategories([])}
              productCounts={productCounts}
            />
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-8 flex items-center justify-between">
            <p className="font-body text-[14px] text-brand-text-mid">
              Showing <span className="font-medium text-brand-navy">{filtered.length}</span> products
            </p>
            <label className="flex items-center gap-2 font-body text-[14px] text-brand-text-mid">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-lg border border-brand-border bg-white px-3 py-2 text-[14px] text-brand-navy focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="name-az">Name A–Z</option>
              </select>
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="font-body text-[16px] text-brand-text-mid">No products match your filters.</p>
              <button onClick={() => setSelectedCategories([])} className="mt-2 font-body text-brand-gold hover:underline">
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
