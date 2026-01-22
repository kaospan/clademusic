import { motion } from 'framer-motion';
import { Music, Sparkles, Waves, Play } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function HeroSection() {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeNote, setActiveNote] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNote((prev) => (prev + 1) % 7);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const musicNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const noteColors = [
    '#FF6B6B', // C - Red
    '#FFA500', // D - Orange
    '#FFD700', // E - Yellow
    '#90EE90', // F - Light Green
    '#4169E1', // G - Royal Blue
    '#9370DB', // A - Purple
    '#FF1493', // B - Deep Pink
  ];

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0A0A0F] via-[#1A1A2E] to-[#0F0F1A] flex items-center justify-center">
      {/* Animated gradient background following mouse */}
      <motion.div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, #00F5FF 0%, transparent 50%)`,
        }}
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Floating music notes */}
      {musicNotes.map((note, index) => (
        <motion.div
          key={note}
          className="absolute text-6xl font-bold opacity-10 pointer-events-none select-none"
          style={{
            color: noteColors[index],
            left: `${10 + index * 12}%`,
            top: `${20 + (index % 3) * 20}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: activeNote === index ? 0.3 : 0.1,
            scale: activeNote === index ? 1.2 : 1,
          }}
          transition={{
            y: {
              duration: 3 + index * 0.2,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            opacity: {
              duration: 0.5,
            },
            scale: {
              duration: 0.5,
            },
          }}
        >
          {note}
        </motion.div>
      ))}

      {/* Waveform visualization */}
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20">
        <svg className="w-full h-full" preserveAspectRatio="none">
          <motion.path
            d="M0,50 Q25,20 50,50 T100,50 Q125,80 150,50 T200,50 Q225,20 250,50 T300,50 Q325,80 350,50 T400,50"
            stroke="url(#waveGradient)"
            strokeWidth="3"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00F5FF" />
              <stop offset="50%" stopColor="#FF00FF" />
              <stop offset="100%" stopColor="#FFD700" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Logo animation */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-8"
        >
          <div className="inline-flex items-center space-x-4">
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Waves className="w-16 h-16 text-[#00F5FF]" />
            </motion.div>
            <h1 className="text-7xl font-extrabold bg-gradient-to-r from-[#00F5FF] via-[#FF00FF] to-[#FFD700] bg-clip-text text-transparent">
              Clade
            </h1>
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight"
        >
          Find Your{' '}
          <span className="bg-gradient-to-r from-[#FF00FF] to-[#00FFFF] bg-clip-text text-transparent">
            Harmony
          </span>
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto"
        >
          Discover perfect musical harmony through intelligent tonic comparisons.
          <br />
          Compare famous tracks, explore chord progressions, and find your sound.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="group relative px-8 py-6 text-lg font-semibold bg-gradient-to-r from-[#00F5FF] to-[#FF00FF] hover:shadow-2xl hover:shadow-[#00F5FF]/50 transition-all duration-300 hover:scale-105"
          >
            <Play className="w-5 h-5 mr-2 inline-block group-hover:animate-pulse" />
            Start Exploring
            <Sparkles className="w-4 h-4 ml-2 inline-block" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-6 text-lg font-semibold border-2 border-[#00F5FF] text-[#00F5FF] hover:bg-[#00F5FF]/10 transition-all duration-300"
          >
            <Music className="w-5 h-5 mr-2 inline-block" />
            Learn More
          </Button>
        </motion.div>

        {/* Floating stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
        >
          {[
            { label: 'Tracks Analyzed', value: '10M+', icon: Music },
            { label: 'Active Users', value: '50K+', icon: Sparkles },
            { label: 'Chord Progressions', value: '100K+', icon: Waves },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
              className="text-center"
            >
              <stat.icon className="w-8 h-8 mx-auto mb-2 text-[#00F5FF]" />
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        animate={{
          y: [0, 10, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className="w-6 h-10 border-2 border-[#00F5FF] rounded-full flex items-start justify-center p-2">
          <motion.div
            className="w-1 h-2 bg-[#00F5FF] rounded-full"
            animate={{
              y: [0, 12, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      </motion.div>
    </section>
  );
}
