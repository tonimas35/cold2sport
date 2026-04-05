'use client'

import { useState } from 'react'
import { products, categories } from '@/lib/products'
import ProductCard from '@/components/shop/ProductCard'
import { BlurFade } from '@/components/magicui/blur-fade'

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = activeCategory
    ? products.filter((p) => p.category === activeCategory)
    : products

  return (
    <div className="pt-24 pb-20">
      <div className="container-wide">
        <BlurFade className="text-center mb-12">
          <span className="text-brand-blue text-sm font-heading font-medium tracking-wider uppercase">
            Shop
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-brand-navy mt-3 tracking-tighter">
            Recovery <span className="font-serif italic">products</span>
          </h1>
          <p className="text-brand-text-mid mt-4 max-w-xl mx-auto">
            Professional-grade thermal recovery technology for athletes at every level.
          </p>
        </BlurFade>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-lg text-sm font-heading transition-colors ${
              !activeCategory
                ? 'bg-brand-navy text-white'
                : 'bg-brand-offwhite text-brand-text-mid hover:bg-brand-navy/5'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-heading transition-colors ${
                activeCategory === cat
                  ? 'bg-brand-navy text-white'
                  : 'bg-brand-offwhite text-brand-text-mid hover:bg-brand-navy/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filtered.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </div>
  )
}
