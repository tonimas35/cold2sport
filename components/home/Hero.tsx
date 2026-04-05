'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { NumberTicker } from '@/components/magicui/number-ticker'

const stats = [
  { value: '10–15°C', label: 'Thermal precision' },
  { num: 60, suffix: '+', label: 'Min autonomy' },
  { num: 3000, suffix: '+', label: 'Pro athletes' },
]

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-brand-navy overflow-hidden">
      {/* === BACKGROUND EFFECTS === */}
      {/* Radial blue glow center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-brand-blue/8 rounded-full blur-[150px]" />
      {/* Secondary glow top-right */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]" />
      {/* Animated particles/dots */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-brand-blue/30"
            style={{
              left: `${5 + (i * 47) % 90}%`,
              top: `${10 + (i * 31) % 80}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 3 + (i % 3),
              repeat: Infinity,
              delay: i * 0.3,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      {/* Frost texture overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,rgba(17,30,33,0.8)_70%)]" />

      {/* === CONTENT === */}
      <div className="relative z-10 min-h-screen flex items-center">
        <div className="container-wide w-full pt-24 pb-16 md:pt-28 md:pb-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-4 items-center">

            {/* LEFT — Text */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 bg-brand-blue/10 border border-brand-blue/20 rounded-full px-4 py-1.5 mb-6">
                <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                <span className="text-brand-blue text-xs font-heading font-medium tracking-wider uppercase">
                  Elite Recovery Tech
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[4.5rem] font-heading font-light text-white leading-[1.05] tracking-tighter mb-6">
                The future of
                <br />
                <span className="font-serif italic text-brand-blue">muscle</span>{' '}
                recovery
              </h1>

              <p className="text-base md:text-lg text-white/50 max-w-md mb-8 leading-relaxed">
                Phase-change cooling garments that maintain precise temperature without ice.
                Used by FC Barcelona and 3,000+ professional athletes.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link
                  href="/cold2sport/shop"
                  className="group inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-hover text-white font-heading font-medium text-sm px-7 py-3.5 rounded-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,155,219,0.3)]"
                >
                  Shop Now
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="#technology"
                  className="inline-flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-heading font-medium text-sm px-7 py-3.5 rounded-lg transition-all duration-300"
                >
                  Our Technology
                </Link>
              </div>

              {/* Stats bar */}
              <div className="flex gap-6 md:gap-10 border-t border-white/10 pt-6">
                {stats.map((stat, i) => (
                  <div key={i}>
                    <div className="text-xl md:text-2xl font-heading font-medium text-white tracking-tight">
                      {stat.num ? (
                        <>
                          <NumberTicker value={stat.num} className="text-white" />
                          <span className="text-brand-blue">{stat.suffix}</span>
                        </>
                      ) : (
                        <span>{stat.value}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/30 mt-0.5 uppercase tracking-[0.15em]">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* RIGHT — Product visual with effects */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex justify-center lg:justify-end"
            >
              <div className="relative">
                {/* Outer glow ring */}
                <div className="absolute -inset-8 bg-gradient-to-tr from-brand-blue/20 via-cyan-400/10 to-transparent rounded-full blur-3xl" />
                <div className="absolute -inset-4 bg-gradient-to-b from-brand-blue/10 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />

                {/* Product image */}
                <div className="relative w-72 md:w-80 lg:w-96">
                  <Image
                    src="https://cold2sport.com/wp-content/uploads/2024/11/COLD2SPORT25294.jpg"
                    alt="Cold2Sport Thermal Short — flagship cooling garment for muscle recovery"
                    width={500}
                    height={500}
                    className="relative rounded-2xl w-full h-auto object-cover"
                    style={{
                      filter: 'drop-shadow(0 0 40px rgba(0,155,219,0.15)) drop-shadow(0 25px 50px rgba(0,0,0,0.5))',
                    }}
                    priority
                  />

                  {/* Frost/ice particles around product */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1.5 h-1.5 rounded-full bg-cyan-300/40"
                      style={{
                        left: `${10 + (i * 37) % 80}%`,
                        top: `${15 + (i * 29) % 70}%`,
                      }}
                      animate={{
                        y: [0, -20, 0],
                        x: [0, (i % 2 ? 10 : -10), 0],
                        opacity: [0, 0.8, 0],
                        scale: [0.5, 1.2, 0.5],
                      }}
                      transition={{
                        duration: 2.5 + i * 0.5,
                        repeat: Infinity,
                        delay: i * 0.4,
                      }}
                    />
                  ))}

                  {/* Temperature badge floating */}
                  <motion.div
                    className="absolute -top-2 -right-2 bg-brand-navy/90 backdrop-blur-lg border border-brand-blue/30 rounded-xl px-3.5 py-2.5 shadow-xl"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="text-[10px] text-brand-blue uppercase tracking-wider font-heading">Cooling</div>
                    <div className="text-lg font-heading font-medium text-white">10–15°C</div>
                  </motion.div>

                  {/* Autonomy badge floating */}
                  <motion.div
                    className="absolute -bottom-2 -left-2 bg-brand-navy/90 backdrop-blur-lg border border-white/10 rounded-xl px-3.5 py-2.5 shadow-xl"
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  >
                    <div className="text-[10px] text-white/50 uppercase tracking-wider font-heading">Autonomy</div>
                    <div className="text-lg font-heading font-medium text-white">60+ <span className="text-xs text-white/40">min</span></div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-20" />
    </section>
  )
}
