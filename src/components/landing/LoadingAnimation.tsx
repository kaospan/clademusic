import { motion } from 'framer-motion';
import { Waves } from 'lucide-react';

export function LoadingAnimation() {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0A0A0F] via-[#1A1A2E] to-[#0F0F1A] flex items-center justify-center">
      <div className="text-center">
        {/* Animated logo */}
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="mb-8"
        >
          <Waves className="w-24 h-24 mx-auto text-[#00F5FF]" />
        </motion.div>

        {/* Animated text */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-bold bg-gradient-to-r from-[#00F5FF] via-[#FF00FF] to-[#FFD700] bg-clip-text text-transparent mb-4"
        >
          Clade
        </motion.h2>

        {/* Loading dots */}
        <div className="flex items-center justify-center space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-[#00F5FF]"
              animate={{
                y: [0, -10, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
