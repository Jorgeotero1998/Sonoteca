import { useEffect, useRef, useState } from "react";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { useAuthStore } from "../../store/authStore";
import { usePlayerStore } from "../../store/playerStore";

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PlayerBar() {
  const token = useAuthStore((s) => s.token);
  const { queue, idx, isPlaying, togglePlay, next, prev, vol, setVol, compact, toggleCompact, shuffle, toggleShuffle, repeat, cycleRepeat } =
    usePlayerStore();
  const now = queue[idx] || null;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);

  const src = now?.preview_url || "";
  const canPlay = Boolean(now?.preview_url);

  // Update CSS palette from cover (canvas sampling, browser-safe).
  useEffect(() => {
    const url = now?.cover_url;
    if (!url) return;
    let cancelled = false;
    (async () => {
      try {
        const { acc, acc3 } = await dominantColors(url);
        if (cancelled) return;
        document.documentElement.style.setProperty("--acc", acc);
        document.documentElement.style.setProperty("--acc3", acc3);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [now?.cover_url]);

  // Sync audio source
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = vol;
  }, [vol]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    setPos(0);
    setDur(0);
    if (!src) {
      el.removeAttribute("src");
      return;
    }
    if (el.src !== src) {
      el.src = src;
      el.load();
    }
    if (isPlaying) el.play().catch(() => {});
    else el.pause();
  }, [src, isPlaying]);

  // Record play in history
  useEffect(() => {
    if (!token || !now?.ref) return;
    if (!now.ref.startsWith("deezer:")) return;
    sonotecaApi.me.historyAdd({ ref: now.ref, type: "track", context: { source: "player" } }).catch(() => {});
  }, [token, now?.ref]);

  // Audio events
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

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as any)?.tagName?.toLowerCase?.();
      if (tag === "input" || tag === "textarea" || (e.target as any)?.isContentEditable) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (canPlay) togglePlay();
      } else if (e.code === "ArrowRight") {
        if (e.shiftKey) next();
        else {
          const el = audioRef.current;
          if (el) el.currentTime = Math.min((el.currentTime || 0) + 5, dur || 99999);
        }
      } else if (e.code === "ArrowLeft") {
        if (e.shiftKey) prev();
        else {
          const el = audioRef.current;
          if (el) el.currentTime = Math.max((el.currentTime || 0) - 5, 0);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canPlay, dur, next, prev, togglePlay]);

  const deezerUrl = now?.external_urls?.deezer || now?.ref?.startsWith("deezer:") ? `https://www.deezer.com/track/${now.ref.split(":")[1]}` : null;

  return (
    <div className={`player glass ${compact ? "compact" : ""}`}>
      <audio ref={audioRef} preload="metadata" />

      <div className="playerLeft">
        <button className="btn" onClick={toggleCompact}>
          {compact ? "Expand" : "Mini"}
        </button>
        <div className="playerCover">{now?.cover_url ? <img src={now.cover_url} alt="" /> : <div className="skeleton" />}</div>
        <div className="playerMeta">
          <div className="name">{now?.title || "Not playing"}</div>
          <div className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {now ? `${now.artist}${now.album ? ` · ${now.album}` : ""}` : "Pick a track"}
          </div>
        </div>
      </div>

      <div className="playerCtrls">
        <button className="btn" onClick={prev} disabled={!queue.length}>
          Prev
        </button>
        <button className="btn" onClick={toggleShuffle}>
          {shuffle ? "Shuffle On" : "Shuffle"}
        </button>
        <button className="btnPrimary" onClick={togglePlay} disabled={!canPlay}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button className="btn" onClick={cycleRepeat}>
          {repeat === "off" ? "Repeat Off" : repeat === "all" ? "Repeat All" : "Repeat One"}
        </button>
        {!canPlay && deezerUrl ? (
          <a className="btn" href={deezerUrl} target="_blank" rel="noreferrer">
            Open Deezer
          </a>
        ) : null}
        <button className="btn" onClick={next} disabled={!queue.length}>
          Next
        </button>
      </div>

      <div className="playerRight">
        <div className="muted" style={{ width: 46, textAlign: "right" }}>
          {fmt(pos)}
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(1, dur || 1)}
          step={0.25}
          value={Math.min(pos, dur || 0)}
          onChange={(e) => {
            const el = audioRef.current;
            if (!el) return;
            const v = Number(e.target.value);
            el.currentTime = v;
            setPos(v);
          }}
          style={{ width: 220 }}
        />
        <div className="muted" style={{ width: 46 }}>
          {fmt(dur)}
        </div>
        <div className="muted">Vol</div>
        <input type="range" min={0} max={1} step={0.01} value={vol} onChange={(e) => setVol(Number(e.target.value))} />
      </div>
    </div>
  );
}

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

  let r = 0, g = 0, b = 0, n = 0;
  let r2 = 0, g2 = 0, b2 = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    if (a < 0.7) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    // a lighter accent
    r2 += Math.min(255, data[i] + 30);
    g2 += Math.min(255, data[i + 1] + 30);
    b2 += Math.min(255, data[i + 2] + 30);
    n++;
  }
  if (!n) return { acc: "#1ed760", acc3: "#6ee7ff" };
  return {
    acc: rgbToHex(Math.round(r / n), Math.round(g / n), Math.round(b / n)),
    acc3: rgbToHex(Math.round(r2 / n), Math.round(g2 / n), Math.round(b2 / n)),
  };
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

