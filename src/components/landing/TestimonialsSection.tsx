import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Sarah Mitchell',
      role: 'Music Producer',
      avatar: '🎵',
      rating: 5,
      text: 'Clade completely changed how I approach chord progressions. The tonic comparison feature is a game-changer for finding inspiration.',
      color: '#FF00FF',
    },
    {
      name: 'James Rodriguez',
      role: 'DJ & Composer',
      avatar: '🎧',
      rating: 5,
      text: 'As a DJ, understanding harmonic mixing is crucial. Clade makes it effortless to find tracks that blend perfectly together.',
      color: '#00F5FF',
    },
    {
      name: 'Emily Chen',
      role: 'Music Student',
      avatar: '🎹',
      rating: 5,
      text: 'Learning music theory has never been this fun! The visualizations help me understand complex concepts instantly.',
      color: '#FFD700',
    },
    {
      name: 'Marcus Williams',
      role: 'Songwriter',
      avatar: '🎸',
      rating: 5,
      text: "I've discovered so many new progressions and harmonic patterns. My songwriting has improved dramatically in just weeks.",
      color: '#90EE90',
    },
  ];

  return (
    <section className="relative py-24 bg-gradient-to-b from-[#0A0A0F] to-[#1A1A2E]">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-white mb-4">Loved by Musicians Worldwide</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            See what our community has to say about their Clade experience
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
            >
              <Card className="relative p-8 bg-gradient-to-br from-[#1A1A2E] to-[#0F0F1A] border border-gray-800 hover:border-gray-700 transition-all duration-300 h-full">
                {/* Quote icon */}
                <Quote
                  className="absolute top-6 right-6 w-12 h-12 opacity-10"
                  style={{ color: testimonial.color }}
                />

                {/* Stars */}
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
                    >
                      <Star
                        className="w-5 h-5 fill-current"
                        style={{ color: testimonial.color }}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Testimonial text */}
                <p className="text-gray-300 text-lg mb-6 leading-relaxed relative z-10">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center space-x-4">
                  <motion.div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
                    style={{
                      background: `linear-gradient(135deg, ${testimonial.color}40, ${testimonial.color}20)`,
                    }}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    {testimonial.avatar}
                  </motion.div>
                  <div>
                    <div className="font-semibold text-white text-lg">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">{testimonial.role}</div>
                  </div>
                </div>

                {/* Glow effect */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 blur-xl pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${testimonial.color}20, transparent)`,
                  }}
                />
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <div className="inline-flex items-center space-x-2 text-gray-400">
            <Star className="w-5 h-5 fill-current text-[#FFD700]" />
            <span className="text-lg">
              <span className="font-bold text-white">4.9/5</span> average rating from{' '}
              <span className="font-bold text-white">2,500+</span> reviews
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
