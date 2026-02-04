import { motion } from "framer-motion";
import { Music2, Music3, Music4 } from "lucide-react";

interface FloatingNotesProps {
  count?: number;
}

export function FloatingNotes({ count = 6 }: FloatingNotesProps) {
  const notes = [Music2, Music3, Music4];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => {
        const NoteIcon = notes[index % notes.length];
        const randomX = 10 + Math.random() * 80; // 10-90% from left
        const randomDelay = Math.random() * 5;
        const randomDuration = 15 + Math.random() * 10;
        const randomSize = 16 + Math.random() * 24;

        return (
          <motion.div
            key={index}
            className="absolute text-primary/10"
            style={{
              left: `${randomX}%`,
              bottom: "-50px",
            }}
            animate={{
              y: [0, -window.innerHeight - 100],
              x: [0, Math.sin(index) * 50, 0],
              rotate: [0, 360],
              opacity: [0, 0.3, 0.3, 0],
            }}
            transition={{
              duration: randomDuration,
              delay: randomDelay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <NoteIcon style={{ width: randomSize, height: randomSize }} />
          </motion.div>
        );
      })}
    </div>
  );
}
