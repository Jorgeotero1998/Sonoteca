import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

export function ArtistPage() {
  const { ref } = useParams();
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [a, setA] = useState<any | null>(null);
  const [top, setTop] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [topIndex, setTopIndex] = useState(0);
  const [albIndex, setAlbIndex] = useState(0);
  const [topMore, setTopMore] = useState(true);
  const [albMore, setAlbMore] = useState(true);
  const [busyTop, setBusyTop] = useState(false);
  const [busyAlb, setBusyAlb] = useState(false);
  const topSentinel = useRef<HTMLDivElement | null>(null);
  const albSentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref) return;
    (async () => {
      const realRef = decodeURIComponent(ref);
      setA(await sonotecaApi.catalog.artist(realRef));
      // reset
      setTop([]);
      setAlbums([]);
      setTopIndex(0);
      setAlbIndex(0);
      setTopMore(true);
      setAlbMore(true);
    })();
  }, [ref]);

  const realRef = useMemo(() => (ref ? decodeURIComponent(ref) : ""), [ref]);

  async function loadTop() {
    if (!realRef || busyTop || !topMore) return;
    setBusyTop(true);
    try {
      const out = await sonotecaApi.catalog.artistTop(realRef, { limit: "20", index: String(topIndex) });
      const items = out.items || [];
      setTop((prev) => [...prev, ...items]);
      setTopMore(Boolean(out.has_more) && items.length > 0);
      setTopIndex(typeof out.next_index === "number" ? out.next_index : topIndex + items.length);
    } finally {
      setBusyTop(false);
    }
  }

  async function loadAlbums() {
    if (!realRef || busyAlb || !albMore) return;
    setBusyAlb(true);
    try {
      const out = await sonotecaApi.catalog.artistAlbums(realRef, { limit: "18", index: String(albIndex) });
      const items = out.items || [];
      setAlbums((prev) => [...prev, ...items]);
      setAlbMore(Boolean(out.has_more) && items.length > 0);
      setAlbIndex(typeof out.next_index === "number" ? out.next_index : albIndex + items.length);
    } finally {
      setBusyAlb(false);
    }
  }

  useEffect(() => {
    loadTop();
    loadAlbums();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realRef]);

  useEffect(() => {
    const el = topSentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadTop();
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topIndex, topMore, busyTop, realRef]);

  useEffect(() => {
    const el = albSentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadAlbums();
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albIndex, albMore, busyAlb, realRef]);

  const playableTop = useMemo(() => top.map(asTrack).filter((t) => t.preview_url), [top]);

  return (
    <div className="page">
      <header className="topbar glass">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <div className="title">Artist</div>
            <div className="subtitle">{a?.name || "Loading…"}</div>
          </div>
        </div>
        <nav className="nav">
          <Link className="btn" to="/">Home</Link>
          <Link className="btn" to="/search">Search</Link>
          <Link className="btn" to="/library">Library</Link>
        </nav>
      </header>

      <section className="section">
        <div className="card glass" style={{ padding: 14, display: "grid", gridTemplateColumns: "220px 1fr", gap: 14 }}>
          <div className="cover">{a?.image_url ? <img src={a.image_url} alt="" /> : <div className="skeleton" />}</div>
          <div>
            <div className="h1">{a?.name || "Loading…"}</div>
            <div className="kicker">{a?.nb_fan ? `${a.nb_fan} fans` : "—"}</div>
            <div style={{ height: 12 }} />
            <button className="btn" onClick={() => setQueue(playableTop, 0)} disabled={!playableTop.length}>
              Play top tracks
            </button>
            {a?.external_urls?.deezer ? (
              <a className="btnPrimary" href={a.external_urls.deezer} target="_blank" rel="noreferrer">
                Open in Deezer
              </a>
            ) : (
              <button className="btnPrimary" disabled>
                Open in Deezer
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <div>
            <div className="h2">Top tracks</div>
            <div className="kicker">Only Deezer previews are playable</div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {(top.length ? top : Array.from({ length: 8 })).map((t: any, i: number) => (
            <div key={t?.ref || i} className="card glass" style={{ padding: 12, display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t?.title || "Loading…"}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {t?.album || "—"}
                </div>
              </div>
              {t?.preview_url ? (
                <button className="btnPrimary" onClick={() => setQueue([asTrack(t)], 0)}>
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
          ))}
        </div>
        <div ref={topSentinel} style={{ height: 1 }} />
        <div style={{ marginTop: 10, marginLeft: 6 }}>
          {busyTop ? <span className="muted">Loading…</span> : topMore ? <span className="muted">Scroll to load more</span> : null}
        </div>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <div>
            <div className="h2">Albums</div>
            <div className="kicker">Tap to open album</div>
          </div>
        </div>
        <div className="grid">
          {(albums.length ? albums : Array.from({ length: 12 })).map((al: any, i: number) => (
            <div key={al?.ref || i} className="card glass hover">
              <div className="cover">{al?.cover_url ? <img src={al.cover_url} alt="" /> : <div className="skeleton" />}</div>
              <div className="meta">
                <div className="name">{al?.title || "Loading…"}</div>
                <div className="muted">{al?.release_date || "—"}</div>
              </div>
              {al?.ref ? (
                <Link className="btnPrimary" to={`/album/${encodeURIComponent(al.ref)}`}>
                  View album
                </Link>
              ) : (
                <button className="btnPrimary" disabled>
                  View album
                </button>
              )}
            </div>
          ))}
        </div>
        <div ref={albSentinel} style={{ height: 1 }} />
        <div style={{ marginTop: 10, marginLeft: 6 }}>
          {busyAlb ? <span className="muted">Loading…</span> : albMore ? <span className="muted">Scroll to load more</span> : null}
        </div>
      </section>

      <div style={{ height: 96 }} />
    </div>
  );
}

