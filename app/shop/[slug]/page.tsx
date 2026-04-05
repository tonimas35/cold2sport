import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { products } from '@/lib/products'
import ProductDetail from '@/components/product/ProductDetail'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = products.find((p) => p.slug === slug)
  if (!product) return { title: 'Product Not Found' }

  return {
    title: `${product.name} — Cold2Sport`,
    description: product.description,
    openGraph: {
      title: `${product.name} — Cold2Sport`,
      description: product.description,
      images: [product.image],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = products.find((p) => p.slug === slug)
  if (!product) notFound()

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    brand: { '@type': 'Brand', name: 'Cold2Sport' },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
  }

  const related = products
    .filter((p) => p.slug !== product.slug)
    .filter((p) => p.category === product.category)
    .slice(0, 3)

  const relatedFallback =
    related.length >= 3
      ? related
      : [
          ...related,
          ...products
            .filter((p) => p.slug !== product.slug && !related.includes(p))
            .slice(0, 3 - related.length),
        ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <ProductDetail product={product} related={relatedFallback} />
    </>
  )
}
