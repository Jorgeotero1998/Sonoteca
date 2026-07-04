import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";

type Tab = "track" | "artist" | "album";

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

export function SearchPage() {
  const [sp, setSp] = useSearchParams();
  const setQueue = usePlayerStore((s) => s.setQueue);
  const q = sp.get("q") || "";
  const tab = (sp.get("tab") as Tab) || "track";
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const tracks = useMemo(() => items.map(asTrack), [items]);

  async function run(reset = false) {
    if (!q.trim()) {
      setItems([]);
      setHasMore(false);
      return;
    }
    setBusy(true);
    try {
      const index = reset ? 0 : items.length;
      const out = await sonotecaApi.catalog.search({
        q: q.trim(),
        type: tab,
        limit: "30",
        index: String(index),
        provider: "deezer",
      });
      const next = out.items || [];
      setItems(reset ? next : [...items, ...next]);
      setHasMore(next.length > 0);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setItems([]);
    setHasMore(true);
    run(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tab]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting && !busy && hasMore && q.trim()) run(false);
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [busy, hasMore, q]);

  return (
    <div className="page">
      <header className="topbar glass">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <div className="title">Search</div>
            <div className="subtitle">Deezer catalog · previews</div>
          </div>
        </div>
        <nav className="nav">
          <Link className="btn" to="/">Home</Link>
          <Link className="btn" to="/library">Library</Link>
          <Link className="btn" to="/playlists">Playlists</Link>
        </nav>
      </header>

      <section className="section">
        <div className="glass card" style={{ padding: 14 }}>
          <input
            className="input"
            value={q}
            placeholder="Search tracks, artists, albums…"
            onChange={(e) => {
              sp.set("q", e.target.value);
              setSp(sp, { replace: true });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
          />
          <div style={{ height: 10 }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["track", "artist", "album"] as Tab[]).map((t) => (
              <button
                key={t}
                className={tab === t ? "btn btnPrimary" : "btn"}
                onClick={() => {
                  sp.set("tab", t);
                  setSp(sp, { replace: true });
                }}
              >
                {t === "track" ? "Tracks" : t === "artist" ? "Artists" : "Albums"}
              </button>
            ))}
            {tab === "track" ? (
              <button className="btn" onClick={() => setQueue(tracks, 0)} disabled={!tracks.length}>
                Play results
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid">
          {(items.length ? items : busy ? Array.from({ length: 12 }) : []).map((x: any, i: number) => (
            <div key={x?.ref || i} className="card glass hover">
              <div className="cover">{x?.cover_url || x?.image_url ? <img src={x.cover_url || x.image_url} alt="" /> : <div className="skeleton" />}</div>
              <div className="meta">
                <div className="name">{x?.title || x?.name || "Loading…"}</div>
                <div className="muted">{x?.artist || ""}</div>
              </div>
              <div className="row">
                {tab === "track" ? (
                  <>
                    <Link className="btn" to={`/track/${encodeURIComponent(x?.ref || "")}`}>Open</Link>
                    {x?.preview_url ? (
                      <button className="btnPrimary" onClick={() => setQueue([asTrack(x)], 0)}>Play</button>
                    ) : x?.external_urls?.deezer ? (
                      <a className="btn" href={x.external_urls.deezer} target="_blank" rel="noreferrer">Open Deezer</a>
                    ) : (
                      <button className="btn" disabled>No preview</button>
                    )}
                  </>
                ) : tab === "album" ? (
                  <Link className="btnPrimary" to={`/album/${encodeURIComponent(x?.ref || "")}`}>View album</Link>
                ) : (
                  <Link className="btnPrimary" to={`/artist/${encodeURIComponent(x?.ref || "")}`}>View artist</Link>
                )}
              </div>
            </div>
          ))}
        </div>
        <div ref={sentinelRef} style={{ height: 1 }} />
        <div style={{ marginTop: 12, marginLeft: 6 }}>
          {busy ? <span className="muted">Loading…</span> : hasMore && q.trim() ? <span className="muted">Scroll to load more</span> : null}
        </div>
      </section>

      <div style={{ height: 96 }} />
    </div>
  );
}

