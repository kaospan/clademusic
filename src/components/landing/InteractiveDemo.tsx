import { motion } from 'framer-motion';
import { useState } from 'react';
import { Music2, Zap, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function InteractiveDemo() {
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [hoveredChord, setHoveredChord] = useState<number | null>(null);

  const tracks = [
    {
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      key: 'Bb Major',
      color: '#FF6B6B',
      progression: ['I', 'vi', 'IV', 'V'],
    },
    {
      title: 'Let It Be',
      artist: 'The Beatles',
      key: 'C Major',
      color: '#4169E1',
      progression: ['I', 'V', 'vi', 'IV'],
    },
    {
      title: 'Someone Like You',
      artist: 'Adele',
      key: 'A Major',
      color: '#9370DB',
      progression: ['I', 'V', 'vi', 'IV'],
    },
  ];

  const selectedTrackData = tracks[selectedTrack];

  return (
    <section id="features" className="relative py-24 bg-gradient-to-b from-[#0F0F1A] to-[#1A1A2E]">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-white mb-4">
            Explore Music Like Never Before
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Interactive chord analysis and harmony comparison in real-time
          </p>
        </motion.div>

        {/* Interactive Demo */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Track Selection */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Select a Track to Analyze</h3>
            {tracks.map((track, index) => (
              <motion.div
                key={track.title}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedTrack(index)}
                className={`p-6 rounded-xl cursor-pointer transition-all duration-300 ${
                  selectedTrack === index
                    ? 'bg-gradient-to-r from-[#00F5FF]/20 to-[#FF00FF]/20 border-2 border-[#00F5FF]'
                    : 'bg-[#1A1A2E] border-2 border-transparent hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: track.color }}
                    >
                      <Music2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-lg">{track.title}</div>
                      <div className="text-sm text-gray-400">{track.artist}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Key</div>
                    <div className="font-semibold text-[#00F5FF]">{track.key}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Chord Visualization */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Card className="p-8 bg-[#1A1A2E] border-2 border-gray-800">
              <h3 className="text-2xl font-bold text-white mb-6">
                Chord Progression Analysis
              </h3>

              {/* Waveform visualization */}
              <div className="mb-8 h-32 relative">
                <svg className="w-full h-full" preserveAspectRatio="none">
                  {selectedTrackData.progression.map((_, index) => (
                    <motion.rect
                      key={index}
                      x={`${index * 25}%`}
                      y="20%"
                      width="20%"
                      height="60%"
                      fill={selectedTrackData.color}
                      opacity={hoveredChord === index ? 0.8 : 0.4}
                      animate={{
                        height: ['40%', '70%', '40%'],
                      }}
                      transition={{
                        duration: 1.5,
                        delay: index * 0.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </svg>
              </div>

              {/* Chord buttons */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                {selectedTrackData.progression.map((chord, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseEnter={() => setHoveredChord(index)}
                    onMouseLeave={() => setHoveredChord(null)}
                    className="relative p-6 rounded-xl font-bold text-3xl transition-all duration-300"
                    style={{
                      backgroundColor:
                        hoveredChord === index
                          ? selectedTrackData.color
                          : 'rgba(255, 255, 255, 0.05)',
                      color: hoveredChord === index ? 'white' : selectedTrackData.color,
                      boxShadow:
                        hoveredChord === index
                          ? `0 0 30px ${selectedTrackData.color}80`
                          : 'none',
                    }}
                  >
                    {chord}
                    {hoveredChord === index && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-[#FFD700] rounded-full flex items-center justify-center"
                      >
                        <Zap className="w-4 h-4 text-black" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Info */}
              <div className="space-y-3 text-gray-400">
                <div className="flex items-center justify-between">
                  <span>Progression Pattern:</span>
                  <span className="font-semibold text-white">
                    {selectedTrackData.progression.join(' → ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Harmonic Complexity:</span>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-8 rounded-full"
                          style={{
                            backgroundColor:
                              i < 3 ? selectedTrackData.color : 'rgba(255,255,255,0.1)',
                          }}
                        />
                      ))}
                    </div>
                    <TrendingUp className="w-4 h-4 text-[#00F5FF]" />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
