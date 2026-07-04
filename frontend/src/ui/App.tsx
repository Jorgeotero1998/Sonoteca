import { useEffect, useMemo, useRef, useState } from "react";
import { api, setToken } from "./api";
import { AuthView } from "./views/AuthView";
import { LibraryView } from "./views/LibraryView";
import { PlaylistsView } from "./views/PlaylistsView";
import { StatsView } from "./views/StatsView";
import { PublicPlaylistView } from "./views/PublicPlaylistView";
import { HomeView } from "./views/HomeView";
import { Route, Shell } from "./Shell";

function fmtTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function App() {
  const publicSlug = new URL(location.href).searchParams.get("public");
  if (publicSlug) return <PublicApp slug={publicSlug} />;
  return <MainApp />;
}

function PublicApp({ slug }: { slug: string }) {
  const [toast, setToast] = useState<string | null>(null);
  return (
    <>
      <PublicPlaylistView slug={slug} toast={setToast} />
      {toast ? (
        <div
          className="chip"
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: 16,
            maxWidth: 860,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{toast}</span>
          <button className="btn" style={{ padding: "6px 10px" }} onClick={() => setToast(null)}>
            OK
          </button>
        </div>
      ) : null}
    </>
  );
}

function MainApp() {
  const [route, setRoute] = useState<Route>("home");
  const [authed, setAuthed] = useState<boolean>(() => Boolean(localStorage.getItem("sonoteca_token")));
  const [toast, setToast] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(0.85);

  const now = queue[idx] ?? null;

  async function tryPlay() {
    const el = audioRef.current;
    if (!el) return;
    try {
      await el.play();
      setIsPlaying(true);
    } catch (e) {
      setIsPlaying(false);
      setToast(e instanceof Error ? e.message : "Autoplay blocked — press Play");
    }
  }

  function onlyPlayable(q: any[]) {
    return (q || []).filter((s) => s && (s.preview_url || s.audio_url));
  }

  function play(song: any, nextQueue?: any[]) {
    const raw = (nextQueue && nextQueue.length ? nextQueue : [song]).filter(Boolean);
    const q = onlyPlayable(raw);
    if (!q.length) {
      setToast("No playable preview available for this selection. Try another track (or use the official embed).");
      setQueue([]);
      setIdx(0);
      setIsPlaying(false);
      return;
    }
    const target = song?.preview_url || song?.audio_url ? song : q[0];
    const i = Math.max(0, q.findIndex((x) => x?.id === target?.id));
    setQueue(q);
    setIdx(i >= 0 ? i : 0);
    setIsPlaying(true);
  }

  function next() {
    setIdx((i) => (queue.length ? (i + 1) % queue.length : 0));
  }

  function prev() {
    setIdx((i) => (queue.length ? (i - 1 + queue.length) % queue.length : 0));
  }

  // Keep audio element in sync with state
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = vol;
  }, [vol]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const src = now?.preview_url || now?.audio_url || "";
    if (!src) {
      el.removeAttribute("src");
      setIsPlaying(false);
      setPos(0);
      setDur(0);
      return;
    }

    if (el.src !== src) {
      el.src = src;
      el.load();
      setPos(0);
      setDur(0);
    }

    if (isPlaying) {
      tryPlay();
    } else {
      el.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now?.id, now?.preview_url, now?.audio_url, isPlaying]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setPos(el.currentTime || 0);
    const onMeta = () => setDur(el.duration || 0);
    const onEnd = () => next();
    const onErr = () => {
      const code = el.error?.code;
      const msg =
        code === 1
          ? "Audio aborted"
          : code === 2
            ? "Network error loading audio"
            : code === 3
              ? "Audio decode error"
              : code === 4
                ? "Audio format not supported"
                : "Audio error";
      setToast(`${msg}. Try another track or open the official embed.`);
      setIsPlaying(false);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    el.addEventListener("error", onErr);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("error", onErr);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length]);

  // Record play in history (Deezer-first refs).
  useEffect(() => {
    if (!authed || !now?.ref) return;
    const ref = String(now.ref || "");
    if (!ref.startsWith("deezer:")) return;
    api.me.historyAdd({ ref, type: "track", context: { source: route } }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, now?.ref]);

  const shell = useMemo(() => {
    const title =
      route === "home" ? "Home" : route === "library" ? "Your Library" : route === "playlists" ? "Playlists" : "Stats";

    return (
      <Shell
        route={route}
        setRoute={setRoute}
        topLeft={
          <div style={{ display: "grid" }}>
            <div className="h1">{title}</div>
            <div className="kicker">Spotify/YouTube‑Music inspired UI</div>
          </div>
        }
        topRight={
          <>
            <button
              className="btn"
              onClick={() => {
                setToken(null);
                setAuthed(false);
              }}
            >
              Logout
            </button>
          </>
        }
        playerLeft={
          <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.04)",
                flex: "0 0 auto",
              }}
            >
              {now?.cover_url ? <img src={now.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 760, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {now ? now.title : "Not playing"}
              </div>
              <div className="kicker" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {now ? `${now.artist}${now.album ? ` · ${now.album}` : ""}` : "Pick a song from the Library"}
              </div>
            </div>
          </div>
        }
        playerRight={
          <>
            <audio
              ref={(n) => {
                audioRef.current = n;
              }}
              preload="metadata"
              crossOrigin="anonymous"
            />
            <button className="btn" onClick={prev} disabled={!queue.length}>
              Prev
            </button>
            <button
              className="btn btnPrimary"
              onClick={() => {
                if (!(now?.preview_url || now?.audio_url)) {
                  setToast("No preview available for this track.");
                  return;
                }
                setIsPlaying((p) => !p);
              }}
              disabled={!now}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            {!now?.preview_url && now?.external_urls?.deezer ? (
              <a className="btn" href={now.external_urls.deezer} target="_blank" rel="noreferrer">
                Open Deezer
              </a>
            ) : null}
            <button className="btn" onClick={next} disabled={!queue.length}>
              Next
            </button>

            <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 320 }}>
              <div className="kicker" style={{ width: 48, textAlign: "right" }}>
                {fmtTime(pos)}
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
                style={{ width: "100%" }}
              />
              <div className="kicker" style={{ width: 48 }}>
                {fmtTime(dur)}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div className="kicker">Vol</div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={vol}
                onChange={(e) => setVol(Number(e.target.value))}
                style={{ width: 120 }}
              />
            </div>

            {queue.length ? (
              <select
                className="input"
                value={now?.id ?? ""}
                onChange={(e) => {
                  const id = e.target.value;
                  const i = queue.findIndex((s) => String(s.id) === id);
                  if (i >= 0) {
                    setIdx(i);
                    setIsPlaying(true);
                  }
                }}
                style={{ width: 240, padding: "10px 12px" }}
              >
                {queue.map((s, i) => (
                  <option key={s.id} value={String(s.id)}>
                    {i + 1}. {s.artist} — {s.title}
                  </option>
                ))}
              </select>
            ) : null}

            {toast ? (
              <div className="chip" style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {toast}
                <button className="btn" style={{ padding: "6px 10px" }} onClick={() => setToast(null)}>
                  OK
                </button>
              </div>
            ) : null}
          </>
        }
      >
        {route === "home" ? <HomeView toast={setToast} onPlay={play} /> : null}
        {route === "library" ? <LibraryView toast={setToast} onPlay={play} /> : null}
        {route === "playlists" ? <PlaylistsView toast={setToast} onPlay={play} /> : null}
        {route === "stats" ? <StatsView toast={setToast} /> : null}
      </Shell>
    );
  }, [route, toast, now, isPlaying, pos, dur, vol, queue.length]);

  if (!authed) {
    return (
      <AuthView
        onAuthed={() => setAuthed(true)}
        toast={setToast}
      />
    );
  }

  return shell;
}

