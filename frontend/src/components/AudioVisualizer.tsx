import { motion } from "framer-motion";
import { useAudioStore } from "../store/audioStore";

export function AudioVisualizer({ bars = 24, height = 48 }: { bars?: number; height?: number }) {
  const levels = useAudioStore((s) => s.bars);
  const energy = useAudioStore((s) => s.energy);

  return (
    <div className="viz" style={{ height }} role="presentation" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const src = levels[i % levels.length] ?? energy;
        const h = Math.max(4, src * height * 0.92);
        return (
          <motion.div
            key={i}
            className="viz__bar"
            animate={{ height: h, opacity: 0.5 + src * 0.5 }}
            transition={{ type: "spring", stiffness: 320, damping: 22, mass: 0.4 }}
            style={{ height: h }}
          />
        );
      })}
    </div>
  );
}
