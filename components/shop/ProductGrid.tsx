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
      case 'price-asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'name-az':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
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
      {/* Mobile filter toggle */}
      <div className="mb-8 lg:hidden">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white"
          aria-expanded={filtersOpen}
        >
          <svg className="h-4 w-4 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {selectedCategories.length > 0 && (
            <span className="rounded-full bg-brand-blue px-2 py-0.5 text-[11px] text-white">
              {selectedCategories.length}
            </span>
          )}
        </button>
        {filtersOpen && (
          <div className="glass-card mt-4 rounded-2xl p-5">
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
          <div className="glass-card sticky top-28 rounded-2xl p-6">
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
            <p className="text-sm text-gray-500">
              Showing <span className="font-semibold text-white">{filtered.length}</span> product{filtered.length !== 1 ? 's' : ''}
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-500">
              <span className="hidden sm:inline">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
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
              <p className="text-lg text-gray-400">No products match your filters.</p>
              <button
                onClick={() => setSelectedCategories([])}
                className="mt-3 text-brand-blue hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
