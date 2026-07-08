import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { HeartIcon, PauseIcon, PlayIcon } from "./icons";
import { useFavoritesStore } from "../store/favoritesStore";
import { usePlayerStore, type Track } from "../store/playerStore";

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
    <motion.article
      className="tile"
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      onKeyDown={(e) => {
        if (onOpen && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className={`tile__art${round ? " tile__art--round" : ""}${playing ? " tile__art--playing" : ""}`}>
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" />
        ) : fallback ? (
          <div className="tile__fallback">{fallback}</div>
        ) : (
          <div className="skeleton" style={{ width: "100%", height: "100%" }} />
        )}
        {onPlay ? (
          <motion.button
            className="tile__play"
            aria-label={playing ? "Pause" : `Play ${title}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
          >
            {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
          </motion.button>
        ) : null}
      </div>
      <h3 className="tile__title truncate">{title}</h3>
      {subtitle ? <p className="tile__sub truncate">{subtitle}</p> : null}
    </motion.article>
  );
}

export function MediaCardSkeleton({ round }: { round?: boolean }) {
  return (
    <div className="tile" aria-hidden>
      <div className={`tile__art skeleton${round ? " tile__art--round" : ""}`} />
      <div className="skeleton skLine" style={{ width: "78%" }} />
      <div className="skeleton skLine" style={{ width: "52%" }} />
    </div>
  );
}

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
    <div className={`songRow${isCurrent ? " songRow--active" : ""}`} onDoubleClick={onPlay}>
      <button className="songRow__index" aria-label={isPlaying ? "Pause" : `Play ${track.title}`} onClick={onPlay}>
        {isPlaying ? (
          <span className="eq" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        ) : isCurrent ? (
          <PlayIcon size={14} />
        ) : (
          <span className="songRow__num">{index + 1}</span>
        )}
      </button>
      <div className="songRow__thumb">
        {track.cover_url ? <img src={track.cover_url} alt="" loading="lazy" /> : <div className="skeleton" style={{ width: "100%", height: "100%" }} />}
      </div>
      <div className="songRow__info truncate">
        <div className="songRow__title truncate">{track.title}</div>
        <div className="songRow__artist truncate">
          {track.artist}
          {track.album ? ` · ${track.album}` : ""}
        </div>
      </div>
      <div className="songRow__end">
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
        {track.duration_ms ? <span className="songRow__dur">{fmtDuration(track.duration_ms)}</span> : null}
        {actions}
      </div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="sectionHead">
      <div className="sectionHead__text">
        <h2 className="sectionHead__title">{title}</h2>
        {subtitle ? <p className="sectionHead__sub">{subtitle}</p> : null}
      </div>
      {action ? <div className="sectionHead__action">{action}</div> : null}
    </header>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="emptyState">
      {icon ? <div className="emptyState__icon">{icon}</div> : null}
      <h3 className="emptyState__title">{title}</h3>
      {hint ? <p className="emptyState__hint">{hint}</p> : null}
      {action}
    </div>
  );
}

export function GridSkeleton({ count = 10, round }: { count?: number; round?: boolean }) {
  return (
    <div className="tileGrid">
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} round={round} />
      ))}
    </div>
  );
}

export function RowSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="songList">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="songRow" aria-hidden>
          <div className="songRow__index skeleton" style={{ width: 24, height: 24, borderRadius: 6 }} />
          <div className="songRow__thumb skeleton" />
          <div style={{ width: "100%" }}>
            <div className="skeleton skLine" style={{ width: "42%" }} />
            <div className="skeleton skLine" style={{ width: "28%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
