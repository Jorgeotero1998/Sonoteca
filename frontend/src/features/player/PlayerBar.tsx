import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence } from "framer-motion";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { useAuthStore } from "../../store/authStore";
import { usePlayerStore } from "../../store/playerStore";
import { useUIStore } from "../../store/uiStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { useAudioAnalyser } from "../../hooks/useAudioAnalyser";
import { resumeAudioContext } from "../../lib/audioContext";
import { NowPlayingSheet } from "../../components/motion";
import { AudioVisualizer } from "../../components/AudioVisualizer";
import {
  ExternalIcon,
  HeartIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from "../../components/icons";

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function pctStyle(pct: number): CSSProperties {
  return { ["--_pct" as string]: `${Math.max(0, Math.min(100, pct))}%` } as CSSProperties;
}

export function PlayerBar() {
  const token = useAuthStore((s) => s.token);
  const { queue, idx, isPlaying, togglePlay, next, prev, vol, setVol, shuffle, toggleShuffle, repeat, cycleRepeat } = usePlayerStore();
  const nowPlayingOpen = useUIStore((s) => s.nowPlayingOpen);
  const setNowPlaying = useUIStore((s) => s.setNowPlaying);
  const favHas = useFavoritesStore((s) => (queue[idx]?.ref ? s.refs.has(queue[idx].ref) : false));
  const toggleFav = useFavoritesStore((s) => s.toggle);

  const now = queue[idx] || null;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);

  const src = now?.preview_url || "";
  const canPlay = Boolean(now?.preview_url);
  const canFav = Boolean(now?.ref?.startsWith("deezer:"));

  // Optional visualizer tap — must not block native preview playback.
  useAudioAnalyser(audioRef, isPlaying && canPlay);

  /** Resume Web Audio + start element playback inside the user-gesture call stack. */
  const playFromGesture = () => {
    resumeAudioContext();
    togglePlay();
    const el = audioRef.current;
    if (!el || !canPlay) return;
    const start = () => el.play().catch(() => {});
    if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) start();
    else el.addEventListener("canplay", start, { once: true });
  };

  useEffect(() => {
    const url = now?.cover_url;
    if (!url) return;
    let cancelled = false;
    (async () => {
      try {
        const { acc, acc3 } = await dominantColors(url);
        if (cancelled) return;
        document.documentElement.style.setProperty("--acc", acc);
        document.documentElement.style.setProperty("--acc-2", shade(acc, -18));
        document.documentElement.style.setProperty("--acc-3", acc3);
        document.documentElement.style.setProperty("--cover-glow", acc);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [now?.cover_url]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = vol;
  }, [vol]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    setPos(0);
    setDur(0);
    if (!src) {
      el.removeAttribute("src");
      el.pause();
      return;
    }
    const current = el.getAttribute("src") || "";
    if (current !== src) {
      el.src = src;
      el.load();
    }
    if (!isPlaying) {
      el.pause();
      return;
    }

    resumeAudioContext();
    const playWhenReady = () => {
      resumeAudioContext();
      el.play().catch(() => {});
    };
    if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) playWhenReady();
    else {
      el.addEventListener("canplay", playWhenReady, { once: true });
      return () => el.removeEventListener("canplay", playWhenReady);
    }
  }, [src, isPlaying]);

  useEffect(() => {
    if (!token || !now?.ref) return;
    if (!now.ref.startsWith("deezer:")) return;
    sonotecaApi.me.historyAdd({ ref: now.ref, type: "track", context: { source: "player" } }).catch(() => {});
  }, [token, now?.ref]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setPos(el.currentTime || 0);
    const onMeta = () => setDur(el.duration || 0);
    const onEnded = () => {
      if (repeat === "one") {
        el.currentTime = 0;
        el.play().catch(() => {});
        return;
      }
      next();
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnded);
    };
  }, [next, repeat]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase?.();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!canPlay) return;
        if (isPlaying) togglePlay();
        else playFromGesture();
      } else if (e.code === "ArrowRight" && e.shiftKey) {
        next();
      } else if (e.code === "ArrowLeft" && e.shiftKey) {
        prev();
      } else if (e.code === "Escape" && nowPlayingOpen) {
        setNowPlaying(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canPlay, isPlaying, next, prev, togglePlay, nowPlayingOpen, setNowPlaying]);

  const deezerUrl = now?.ref?.startsWith("deezer:") ? `https://www.deezer.com/track/${now.ref.split(":")[1]}` : now?.external_urls?.deezer || null;

  function seek(v: number) {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = v;
    setPos(v);
  }

  const progressPct = dur ? (pos / dur) * 100 : 0;

  const RepeatBtn = (
    <button
      className={`iconBtn ghost${repeat !== "off" ? " active" : ""}`}
      aria-label={`Repeat: ${repeat}`}
      onClick={cycleRepeat}
      title={repeat === "off" ? "Repeat off" : repeat === "all" ? "Repeat all" : "Repeat one"}
    >
      {repeat === "one" ? <RepeatOneIcon size={18} /> : <RepeatIcon size={18} />}
    </button>
  );

  const ShuffleBtn = (
    <button className={`iconBtn ghost${shuffle ? " active" : ""}`} aria-label="Shuffle" aria-pressed={shuffle} onClick={toggleShuffle}>
      <ShuffleIcon size={18} />
    </button>
  );

  const FavBtn = canFav ? (
    <button
      className={`iconBtn ghost${favHas ? " active" : ""}`}
      aria-label={favHas ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favHas}
      onClick={() => now && toggleFav(now.ref, now.title)}
    >
      <HeartIcon size={18} filled={favHas} />
    </button>
  ) : null;

  const PlayBtn = (big?: boolean) => (
    <button
      className={big ? "npSheet__playBtn" : "playerDock__play"}
      aria-label={isPlaying ? "Pause" : "Play"}
      onClick={() => (isPlaying ? togglePlay() : playFromGesture())}
      disabled={!canPlay}
    >
      {isPlaying ? <PauseIcon size={big ? 30 : 20} /> : <PlayIcon size={big ? 30 : 20} />}
    </button>
  );

  return (
    <>
      <div className="playerDock">
        <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />

        <div className="playerDock__progress" style={{ ["--progress" as string]: `${progressPct}%` }} aria-hidden />

        <button
          type="button"
          className="playerDock__track"
          aria-label="Open now playing"
          onClick={() => now && setNowPlaying(true)}
          disabled={!now}
        >
          <div className="playerDock__cover">
            {now?.cover_url ? <img src={now.cover_url} alt="" /> : <div className="skeleton" style={{ width: "100%", height: "100%" }} />}
          </div>
          <div className="playerDock__meta">
            <div className="playerDock__title truncate">{now?.title || "Not playing"}</div>
            <div className="playerDock__artist truncate">
              {now ? (canPlay ? now.artist : `${now.artist} · No preview available`) : "Pick a track to start"}
            </div>
          </div>
        </button>

        <div className="playerDock__center">
          <div className="playerDock__controls">
            {ShuffleBtn}
            <button className="iconBtn ghost" aria-label="Previous" onClick={prev} disabled={!queue.length}>
              <PrevIcon size={20} />
            </button>
            {PlayBtn()}
            <button className="iconBtn ghost" aria-label="Next" onClick={next} disabled={!queue.length}>
              <NextIcon size={20} />
            </button>
            {RepeatBtn}
          </div>
          <div className="playerDock__seek">
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
              onChange={(e) => seek(Number(e.target.value))}
            />
            <span className="time">{fmt(dur)}</span>
          </div>
          {isPlaying && canPlay ? (
            <div className="playerDock__viz hideMobile">
              <AudioVisualizer bars={20} height={22} />
            </div>
          ) : null}
        </div>

        {/* Right controls (desktop) */}
        <div className="playerDock__right">
          {FavBtn}
          {!canPlay && deezerUrl ? (
            <a className="iconBtn ghost" href={deezerUrl} target="_blank" rel="noreferrer" aria-label="Open in Deezer">
              <ExternalIcon size={18} />
            </a>
          ) : null}
          <div className="playerDock__volume">
            <button className="iconBtn ghost" aria-label={vol === 0 ? "Unmute" : "Mute"} onClick={() => setVol(vol === 0 ? 0.85 : 0)}>
              {vol === 0 ? <VolumeMuteIcon size={18} /> : <VolumeIcon size={18} />}
            </button>
            <input
              className="range"
              style={pctStyle(vol * 100)}
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={vol}
              aria-label="Volume"
              onChange={(e) => setVol(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Mobile controls */}
        <div className="playerDock__mobile">
          {FavBtn}
          {PlayBtn()}
        </div>
      </div>

      {/* Full-screen now playing */}
      <AnimatePresence>
        {nowPlayingOpen && now ? (
          <NowPlayingSheet
            track={now}
            isPlaying={isPlaying}
            canPlay={canPlay}
            canFav={canFav}
            favHas={favHas}
            pos={pos}
            dur={dur}
            progressPct={progressPct}
            shuffle={shuffle}
            repeat={repeat}
            deezerUrl={deezerUrl}
            onClose={() => setNowPlaying(false)}
            onTogglePlay={() => (isPlaying ? togglePlay() : playFromGesture())}
            onPrev={prev}
            onNext={next}
            onSeek={seek}
            onToggleFav={() => now && toggleFav(now.ref, now.title)}
            onToggleShuffle={toggleShuffle}
            onCycleRepeat={cycleRepeat}
            queueLen={queue.length}
            pctStyle={pctStyle}
            fmt={fmt}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------- cover color extraction */
async function dominantColors(url: string): Promise<{ acc: string; acc3: string }> {
  const img = await loadImage(url);
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    if (a < 0.7) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  if (!n) return { acc: "#a855f7", acc3: "#c084fc" };
  const avg = { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
  // Boost saturation/lightness so it works as an accent on dark UI.
  const boosted = boost(avg);
  return { acc: rgbToHex(boosted.r, boosted.g, boosted.b), acc3: rgbToHex(Math.min(255, boosted.r + 40), Math.min(255, boosted.g + 40), Math.min(255, boosted.b + 60)) };
}

function boost({ r, g, b }: { r: number; g: number; b: number }) {
  const max = Math.max(r, g, b) || 1;
  const scale = Math.min(1.7, 210 / max);
  return { r: Math.round(r * scale), g: Math.round(g * scale), b: Math.round(b * scale) };
}

function shade(hex: string, pct: number) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (x: number) => Math.max(0, Math.min(255, x));
  const r = clamp((n >> 16) + (255 * pct) / 100);
  const g = clamp(((n >> 8) & 0xff) + (255 * pct) / 100);
  const b = clamp((n & 0xff) + (255 * pct) / 100);
  return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
}

function rgbToHex(r: number, g: number, b: number) {
  const h = (x: number) => x.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
