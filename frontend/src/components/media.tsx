import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { HeartIcon, PauseIcon, PlayIcon } from "./icons";
import { useFavoritesStore } from "../store/favoritesStore";
import { usePlayerStore, type Track } from "../store/playerStore";

/* ---------------------------------------------------------------- helpers */
export function useIsCurrent(ref?: string | null) {
  const cur = usePlayerStore((s) => s.queue[s.idx]?.ref);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isCurrent = Boolean(ref) && cur === ref;
  return { isCurrent, isPlaying: isCurrent && isPlaying };
}

export function fmtDuration(ms?: number | null) {
  if (!ms || !isFinite(ms)) return "";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ---------------------------------------------------------------- MediaCard */
export function MediaCard({
  title,
  subtitle,
  imageUrl,
  round,
  onOpen,
  onPlay,
  playing,
  fallback,
}: {
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  round?: boolean;
  onOpen?: () => void;
  onPlay?: () => void;
  playing?: boolean;
  fallback?: ReactNode;
}) {
  return (
    <motion.div
      className="mediaCard"
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onKeyDown={(e) => {
        if (onOpen && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className={`mediaCard__art${round ? " round" : ""}`}>
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" />
        ) : fallback ? (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: "linear-gradient(145deg, var(--surface-3), var(--surface))", color: "var(--muted)" }}>
            {fallback}
          </div>
        ) : (
          <div className="skeleton" style={{ width: "100%", height: "100%" }} />
        )}
        {onPlay ? (
          <motion.button
            className="playFab"
            aria-label={playing ? "Pause" : `Play ${title}`}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
          >
            {playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
          </motion.button>
        ) : null}
      </div>
      <div className="mediaCard__title truncate">{title}</div>
      {subtitle ? <div className="mediaCard__sub truncate">{subtitle}</div> : null}
    </motion.div>
  );
}

export function MediaCardSkeleton({ round }: { round?: boolean }) {
  return (
    <div className="mediaCard" aria-hidden>
      <div className={`mediaCard__art skeleton${round ? " round" : ""}`} />
      <div className="skeleton skLine" style={{ width: "80%" }} />
      <div className="skeleton skLine" style={{ width: "55%" }} />
    </div>
  );
}

/* ---------------------------------------------------------------- TrackRow */
export function TrackRow({
  track,
  index,
  onPlay,
  showFavorite = true,
  actions,
}: {
  track: Track;
  index: number;
  onPlay: () => void;
  showFavorite?: boolean;
  actions?: ReactNode;
}) {
  const { isCurrent, isPlaying } = useIsCurrent(track.ref);
  const favHas = useFavoritesStore((s) => s.refs.has(track.ref));
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const canFav = track.ref?.startsWith("deezer:");

  return (
    <div className={`trackRow${isCurrent ? " playing" : ""}`} onDoubleClick={onPlay}>
      <button
        className="iconBtn ghost trackRow__idx"
        style={{ width: 28, height: 28 }}
        aria-label={isPlaying ? "Pause" : `Play ${track.title}`}
        onClick={onPlay}
      >
        {isPlaying ? (
          <span className="eq" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        ) : isCurrent ? (
          <PlayIcon size={14} />
        ) : (
          <>
            <span className="trackRow__num">{index + 1}</span>
          </>
        )}
      </button>
      <div className="trackRow__art">
        {track.cover_url ? <img src={track.cover_url} alt="" loading="lazy" /> : <div className="skeleton" style={{ width: "100%", height: "100%" }} />}
      </div>
      <div className="truncate">
        <div className="trackRow__title truncate">{track.title}</div>
        <div className="muted truncate" style={{ fontSize: 13 }}>
          {track.artist}
          {track.album ? ` · ${track.album}` : ""}
        </div>
      </div>
      <div className="trackRow__actions">
        {showFavorite && canFav ? (
          <button
            className={`iconBtn ghost${favHas ? " active" : ""}`}
            aria-label={favHas ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={favHas}
            onClick={() => toggleFav(track.ref, track.title)}
          >
            <HeartIcon size={17} filled={favHas} />
          </button>
        ) : null}
        {track.duration_ms ? (
          <span className="muted2" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
            {fmtDuration(track.duration_ms)}
          </span>
        ) : null}
        {actions}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- states */
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="sectionTitle">
      <div>
        <div className="h2">{title}</div>
        {subtitle ? <div className="subtitle" style={{ marginTop: 4 }}>{subtitle}</div> : null}
      </div>
      {action ? <div className="sectionTitle__action">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="stateBox">
      {icon ? <div className="stateBox__icon">{icon}</div> : null}
      <div className="h2" style={{ color: "var(--text)" }}>{title}</div>
      {hint ? <div className="muted" style={{ maxWidth: 380 }}>{hint}</div> : null}
      {action}
    </div>
  );
}

export function GridSkeleton({ count = 10, round }: { count?: number; round?: boolean }) {
  return (
    <div className="grid">
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} round={round} />
      ))}
    </div>
  );
}

export function RowSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="stack" style={{ gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="trackRow" aria-hidden>
          <div />
          <div className="trackRow__art skeleton" />
          <div style={{ width: "100%" }}>
            <div className="skeleton skLine" style={{ width: "45%" }} />
            <div className="skeleton skLine" style={{ width: "30%" }} />
          </div>
          <div />
        </div>
      ))}
    </div>
  );
}
