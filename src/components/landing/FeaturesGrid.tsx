import { motion } from 'framer-motion';
import { Brain, Users, Sparkles, BarChart3, Music4, Zap } from 'lucide-react';

export function FeaturesGrid() {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Advanced algorithms detect chord progressions and harmonic patterns instantly',
      color: '#FF00FF',
      gradient: 'from-pink-500 to-purple-600',
    },
    {
      icon: Music4,
      title: 'Tonic Comparisons',
      description: 'Compare famous tracks and discover similar harmonic structures',
      color: '#00F5FF',
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      icon: BarChart3,
      title: 'Visual Harmony',
      description: 'Beautiful visualizations make understanding music theory effortless',
      color: '#FFD700',
      gradient: 'from-yellow-500 to-orange-600',
    },
    {
      icon: Users,
      title: 'Social Discovery',
      description: 'Share your findings and explore harmonies discovered by the community',
      color: '#90EE90',
      gradient: 'from-green-500 to-emerald-600',
    },
    {
      icon: Zap,
      title: 'Real-Time Processing',
      description: 'Lightning-fast analysis of any track from Spotify or YouTube',
      color: '#FF6B6B',
      gradient: 'from-red-500 to-pink-600',
    },
    {
      icon: Sparkles,
      title: 'Custom Playlists',
      description: 'Create playlists based on harmonic similarity and mood',
      color: '#9370DB',
      gradient: 'from-purple-500 to-indigo-600',
    },
  ];

  return (
    <section className="relative py-24 bg-[#0A0A0F]">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#FF00FF] rounded-full blur-3xl opacity-10 animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#00F5FF] rounded-full blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-white mb-4">
            Powerful Features for Music Lovers
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Everything you need to explore, understand, and enjoy music on a deeper level
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="group relative"
            >
              <div className="relative p-8 rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#0F0F1A] border border-gray-800 hover:border-gray-700 transition-all duration-300 h-full">
                {/* Hover glow effect */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
                  style={{
                    background: `linear-gradient(135deg, ${feature.color}20, transparent)`,
                  }}
                />

                {/* Icon */}
                <motion.div
                  className="relative mb-6"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <div
                    className="w-16 h-16 rounded-xl bg-gradient-to-br flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${feature.color}40, ${feature.color}20)`,
                    }}
                  >
                    <feature.icon
                      className="w-8 h-8"
                      style={{ color: feature.color }}
                    />
                  </div>
                </motion.div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#00F5FF] group-hover:to-[#FF00FF] transition-all duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Animated corner accent */}
                <motion.div
                  className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                  style={{ backgroundColor: feature.color }}
                  initial={{ scale: 0 }}
                  whileHover={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
