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
    slug: 'fcb-partnership',
    title: 'Cold2Sport signs official recovery partnership with FC Barcelona',
    excerpt: 'The Blaugrana will use Cold2Sport Thermal Shorts and BioFresh Tech cooling garments in their post-match recovery protocol starting from the 2024–25 season.',
    date: '2024-11-15',
    category: 'Partnership',
    image: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=600&q=80',
    readTime: '3 min',
  },
  {
    slug: 'iniesta-ambassador',
    title: 'Andrés Iniesta joins Cold2Sport as global brand ambassador',
    excerpt: 'World Cup winner and FC Barcelona legend Andrés Iniesta shares how Cold2Sport technology extended his professional career by two seasons.',
    date: '2024-09-08',
    category: 'Ambassador',
    image: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=600&q=80',
    readTime: '4 min',
  },
  {
    slug: 'biofresh-tech-explained',
    title: 'How BioFresh Tech PCM works: the science behind the cold',
    excerpt: 'Our CTO Jordi Mas breaks down the phase-change microencapsulation process that enables sustained 10–15°C cooling without ice, freezers or electricity.',
    date: '2024-07-22',
    category: 'Technology',
    image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&q=80',
    readTime: '6 min',
  },
]
