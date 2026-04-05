export type TeamMember = {
  name: string
  role: string
  bio: string
  image: string
  linkedin: string
}

export const team: TeamMember[] = [
  {
    name: 'Isaac Cuenca',
    role: 'Founder & CEO',
    bio: 'Former FC Barcelona, Ajax and Valencia CF winger. After a career-altering injury led him to discover phase-change cooling therapy, Isaac founded Cold2Sport in 2022 to make elite recovery technology accessible to all athletes.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    linkedin: '#',
  },
  {
    name: 'Dr. Marta Solà',
    role: 'Head of Sports Science',
    bio: 'PhD in Exercise Physiology from UB Barcelona. 12 years researching thermodynamics in elite sport recovery. Co-inventor of BioFresh Tech PCM formulation.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    linkedin: '#',
  },
  {
    name: 'Jordi Mas',
    role: 'CTO & Co-founder',
    bio: 'Materials engineer from Universitat Politècnica de Catalunya. 15 years in technical textile innovation. Holds 3 patents in phase-change microencapsulation.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
    linkedin: '#',
  },
]
