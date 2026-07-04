import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";

function asTrack(x: any): Track {
  return {
    ref: x.ref,
    title: x.title,
    artist: x.artist,
    album: x.album,
    cover_url: x.cover_url,
    duration_ms: x.duration_ms,
    preview_url: x.preview_url,
    external_urls: x.external_urls,
  };
}

export function HomePage() {
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [charts, setCharts] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [chartsIndex, setChartsIndex] = useState(0);
  const [relIndex, setRelIndex] = useState(0);
  const [chartsMore, setChartsMore] = useState(true);
  const [relMore, setRelMore] = useState(true);
  const chartsSentinel = useRef<HTMLDivElement | null>(null);
  const relSentinel = useRef<HTMLDivElement | null>(null);
  const tracks = useMemo(() => charts.map(asTrack), [charts]);

  async function loadCharts(reset = false) {
    if (busy || (!chartsMore && !reset)) return;
    setBusy(true);
    try {
      const index = reset ? 0 : chartsIndex;
      const out = await sonotecaApi.catalog.charts({ limit: "30", index: String(index) });
      const items = out.tracks || [];
      setCharts(reset ? items : [...charts, ...items]);
      setChartsMore(items.length > 0);
      setChartsIndex(index + items.length);
    } finally {
      setBusy(false);
    }
  }

  async function loadReleases(reset = false) {
    if (busy || (!relMore && !reset)) return;
    setBusy(true);
    try {
      const index = reset ? 0 : relIndex;
      const out = await sonotecaApi.catalog.newReleases({ limit: "18", index: String(index) });
      const items = out.items || [];
      setReleases(reset ? items : [...releases, ...items]);
      setRelMore(items.length > 0);
      setRelIndex(index + items.length);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadCharts(true);
    loadReleases(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = chartsSentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadCharts(false);
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartsIndex, chartsMore, busy]);

  useEffect(() => {
    const el = relSentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadReleases(false);
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relIndex, relMore, busy]);

  return (
    <div className="page">
      <header className="topbar glass">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <div className="title">Sonoteca</div>
            <div className="subtitle">Deezer-first music explorer</div>
          </div>
        </div>
        <nav className="nav">
          <Link className="btn" to="/search">Search</Link>
          <Link className="btn" to="/library">Library</Link>
          <Link className="btn" to="/playlists">Playlists</Link>
        </nav>
      </header>

      <section className="section">
        <div className="sectionTitle">
          <div>
            <div className="h1">Top Charts</div>
            <div className="kicker">Real-time charts from Deezer · previews 30s</div>
          </div>
          <button className="btn" onClick={() => setQueue(tracks, 0)} disabled={!tracks.length}>
            Play charts
          </button>
        </div>

        <div className="grid">
          {(tracks.length ? tracks : Array.from({ length: 12 })).map((t: any, i: number) => (
            <motion.div
              key={t?.ref || i}
              className="card glass hover"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.02 }}
            >
              <div className="cover">
                {t?.cover_url ? <img src={t.cover_url} alt="" /> : <div className="skeleton" />}
              </div>
              <div className="meta">
                <div className="name">{t?.title || "Loading…"}</div>
                <div className="muted">{t?.artist || "—"}</div>
              </div>
              <div className="row">
                <Link className="btn" to={`/track/${encodeURIComponent(t?.ref || "")}`} aria-disabled={!t?.ref}>
                  Open
                </Link>
                {t?.preview_url ? (
                  <button className="btnPrimary" onClick={() => setQueue([t], 0)}>
                    Play
                  </button>
                ) : t?.external_urls?.deezer ? (
                  <a className="btn" href={t.external_urls.deezer} target="_blank" rel="noreferrer">
                    Open Deezer
                  </a>
                ) : (
                  <button className="btn" disabled>
                    No preview
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        <div ref={chartsSentinel} style={{ height: 1 }} />
        <div style={{ marginTop: 12, marginLeft: 6, display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn" onClick={() => loadCharts(false)} disabled={busy || !chartsMore}>
            Load more
          </button>
          {busy ? <span className="muted">Loading…</span> : chartsMore ? <span className="muted">Auto-load on scroll</span> : <span className="muted">End</span>}
        </div>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <div>
            <div className="h2">New Releases</div>
            <div className="kicker">Editorial releases from Deezer</div>
          </div>
        </div>

        <div className="grid">
          {(releases.length ? releases : Array.from({ length: 12 })).map((a: any, i: number) => (
            <motion.div
              key={a?.ref || i}
              className="card glass hover"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.01 }}
            >
              <div className="cover">
                {a?.cover_url ? <img src={a.cover_url} alt="" /> : <div className="skeleton" />}
              </div>
              <div className="meta">
                <div className="name">{a?.title || "Loading…"}</div>
                <div className="muted">{a?.artist || "—"}</div>
              </div>
              {a?.ref ? (
                <Link className="btnPrimary" to={`/album/${encodeURIComponent(a.ref)}`}>
                  View album
                </Link>
              ) : (
                <button className="btnPrimary" disabled>
                  View album
                </button>
              )}
            </motion.div>
          ))}
        </div>
        <div ref={relSentinel} style={{ height: 1 }} />
        <div style={{ marginTop: 12, marginLeft: 6, display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn" onClick={() => loadReleases(false)} disabled={busy || !relMore}>
            Load more
          </button>
          {busy ? <span className="muted">Loading…</span> : relMore ? <span className="muted">Auto-load on scroll</span> : <span className="muted">End</span>}
        </div>
      </section>

      {busy ? null : null}
    </div>
  );
}

