import { products } from '@/lib/products'
import ProductDetailView from '@/components/shop/ProductDetailView'
import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }))
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = products.find((p) => p.slug === params.slug)
  if (!product) notFound()

  return <ProductDetailView product={product} />
}
