import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AudioVisualizer } from "./AudioVisualizer";
import {
  ChevronDownIcon,
  ExternalIcon,
  HeartIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
} from "./icons";
import type { RepeatMode, Track } from "../store/playerStore";
import type { CSSProperties } from "react";

type Props = {
  track: Track;
  isPlaying: boolean;
  canPlay: boolean;
  canFav: boolean;
  favHas: boolean;
  pos: number;
  dur: number;
  progressPct: number;
  shuffle: boolean;
  repeat: RepeatMode;
  deezerUrl: string | null;
  onClose: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (v: number) => void;
  onToggleFav: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  queueLen: number;
  pctStyle: (pct: number) => CSSProperties;
  fmt: (sec: number) => string;
};

export function NowPlayingSheet({
  track,
  isPlaying,
  canPlay,
  canFav,
  favHas,
  pos,
  dur,
  progressPct,
  shuffle,
  repeat,
  deezerUrl,
  onClose,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onToggleFav,
  onToggleShuffle,
  onCycleRepeat,
  queueLen,
  pctStyle,
  fmt,
}: Props) {
  return (
    <motion.div
      className="npSheet"
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
    >
      {/* Immersive blurred cover backdrop */}
      {track.cover_url ? (
        <div className="npSheet__backdrop" aria-hidden>
          <img src={track.cover_url} alt="" />
          <div className="npSheet__backdropOverlay" />
        </div>
      ) : null}

      <div className="npSheet__top">
        <motion.button className="iconBtn ghost" aria-label="Close" onClick={onClose} whileTap={{ scale: 0.9 }}>
          <ChevronDownIcon size={24} />
        </motion.button>
        <div className="kicker">Now Playing</div>
        {canFav ? (
          <motion.button
            className={`iconBtn ghost${favHas ? " active" : ""}`}
            aria-label={favHas ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={favHas}
            onClick={onToggleFav}
            whileTap={{ scale: 0.85 }}
          >
            <HeartIcon size={20} filled={favHas} />
          </motion.button>
        ) : (
          <div style={{ width: 38 }} />
        )}
      </div>

      <div className="npSheet__body">
        <motion.div
          className="npSheet__art"
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.05 }}
        >
          {track.cover_url ? <img src={track.cover_url} alt="" /> : <div className="skeleton" style={{ width: "100%", height: "100%" }} />}
        </motion.div>

        <motion.div className="npSheet__meta" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="h1 truncate">{track.title}</div>
          <div className="muted truncate" style={{ marginTop: 6 }}>
            {track.artist}
            {track.album ? ` · ${track.album}` : ""}
          </div>
        </motion.div>

        <AudioVisualizer bars={32} height={56} />

        <div className="npSheet__controls">
          <div className="player__seek">
            <span className="time">{fmt(pos)}</span>
            <input
              className="range"
              style={pctStyle(progressPct)}
              type="range"
              min={0}
              max={Math.max(1, dur || 1)}
              step={0.25}
              value={Math.min(pos, dur || 0)}
              disabled={!canPlay}
              aria-label="Seek"
              onChange={(e) => onSeek(Number(e.target.value))}
            />
            <span className="time">{fmt(dur)}</span>
          </div>
          <div className="npSheet__buttons">
            <motion.button className={`iconBtn ghost${shuffle ? " active" : ""}`} aria-label="Shuffle" onClick={onToggleShuffle} whileTap={{ scale: 0.88 }}>
              <ShuffleIcon size={22} />
            </motion.button>
            <motion.button className="iconBtn ghost" aria-label="Previous" onClick={onPrev} disabled={!queueLen} whileTap={{ scale: 0.88 }}>
              <PrevIcon size={26} />
            </motion.button>
            <motion.button className="npSheet__playBtn" aria-label={isPlaying ? "Pause" : "Play"} onClick={onTogglePlay} disabled={!canPlay} whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.06 }}>
              {isPlaying ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
            </motion.button>
            <motion.button className="iconBtn ghost" aria-label="Next" onClick={onNext} disabled={!queueLen} whileTap={{ scale: 0.88 }}>
              <NextIcon size={26} />
            </motion.button>
            <motion.button className={`iconBtn ghost${repeat !== "off" ? " active" : ""}`} aria-label={`Repeat: ${repeat}`} onClick={onCycleRepeat} whileTap={{ scale: 0.88 }}>
              {repeat === "one" ? <RepeatOneIcon size={22} /> : <RepeatIcon size={22} />}
            </motion.button>
          </div>
          {!canPlay && deezerUrl ? (
            <a className="btn" href={deezerUrl} target="_blank" rel="noreferrer" style={{ alignSelf: "center" }}>
              <ExternalIcon size={16} /> Open in Deezer
            </a>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

/** Staggered grid container for album/track cards */
export function MotionGrid({ children, className = "grid" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export const motionCard = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 420, damping: 28 } },
};
