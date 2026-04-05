export type NewsItem = {
  slug: string
  title: string
  excerpt: string
  date: string
  category: string
  image: string
  readTime: string
}

export const news: NewsItem[] = [
  {
    slug: 'product-range-expansion',
    title: 'Cold2Sport expands its recovery product range with two new launches and a new thermal knee brace',
    excerpt: 'Introducing the new Thermal Knee Pad and Cold Ankle Brace — two innovative products designed for targeted joint recovery using our BioFresh Tech cooling technology.',
    date: '2025-12-22',
    category: 'Product',
    image: 'https://cold2sport.com/wp-content/uploads/2024/12/C2S-2025-07-09-0121.jpg',
    readTime: '3 min',
  },
  {
    slug: 'argentina-expansion',
    title: 'Cold2Sport expands in Argentina with Sport78 and DigitalSport',
    excerpt: 'Cold2Sport enters the South American market through a strategic partnership with Sport78 and DigitalSport, bringing elite recovery technology to Argentine athletes.',
    date: '2025-10-06',
    category: 'Partnership',
    image: 'https://cold2sport.com/wp-content/uploads/2024/11/cold2sport-nautic5-Baja.jpg',
    readTime: '4 min',
  },
  {
    slug: 'european-technology-awards',
    title: 'Cold2Sport nominated for Sports Technology Company of the Year at the 2025 European Technology Awards',
    excerpt: 'Recognition of our innovative BioFresh Tech cooling technology and its impact on professional sports recovery across Europe.',
    date: '2025-06-09',
    category: 'Award',
    image: 'https://cold2sport.com/wp-content/uploads/2024/11/biofreshtech-14.png',
    readTime: '3 min',
  },
]
