import { motion } from 'framer-motion';
import { Play, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function CTASection() {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);

  return (
    <section className="relative py-32 overflow-hidden bg-gradient-to-br from-[#1A1A2E] via-[#0A0A0F] to-[#1A1A2E]">
      {/* Animated background */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-[#00F5FF] to-[#FF00FF]"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.3, 0.1],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-[#00F5FF]/20 to-[#FF00FF]/20 border border-[#00F5FF]/50 mb-8"
          >
            <Sparkles className="w-4 h-4 mr-2 text-[#FFD700]" />
            <span className="text-sm font-semibold text-white">
              Join 50,000+ music enthusiasts
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight"
          >
            Ready to Find{' '}
            <span className="bg-gradient-to-r from-[#00F5FF] via-[#FF00FF] to-[#FFD700] bg-clip-text text-transparent">
              Your Perfect Harmony
            </span>
            ?
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto"
          >
            Start exploring musical patterns, compare famous tracks, and discover new sounds today.
            <br />
            <span className="text-[#00F5FF] font-semibold">Free for 7 days. No credit card required.</span>
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="group relative px-12 py-8 text-xl font-bold bg-gradient-to-r from-[#00F5FF] to-[#FF00FF] hover:shadow-2xl hover:shadow-[#00F5FF]/50 transition-all duration-300 hover:scale-110"
            >
              <Play className="w-6 h-6 mr-3 inline-block group-hover:animate-pulse" />
              Start Your Free Trial
              <motion.div
                className="inline-block ml-3"
                animate={{ x: isHovering ? 10 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ArrowRight className="w-6 h-6" />
              </motion.div>

              {/* Animated border */}
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{
                  background: 'linear-gradient(90deg, #00F5FF, #FF00FF, #FFD700, #00F5FF)',
                  backgroundSize: '300% 300%',
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              <span className="absolute inset-0.5 bg-gradient-to-r from-[#00F5FF] to-[#FF00FF] rounded-lg" />
              <span className="relative z-10 flex items-center">
                <Play className="w-6 h-6 mr-3 group-hover:animate-pulse" />
                Start Your Free Trial
                <motion.div
                  className="inline-block ml-3"
                  animate={{ x: isHovering ? 10 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ArrowRight className="w-6 h-6" />
                </motion.div>
              </span>
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-8 text-gray-400"
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Full access during trial</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
