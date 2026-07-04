import { useEffect, useMemo, useState } from "react";
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

export function AlbumPage() {
  const { ref } = useParams();
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [a, setA] = useState<any | null>(null);

  useEffect(() => {
    if (!ref) return;
    (async () => {
      const realRef = decodeURIComponent(ref);
      setA(await sonotecaApi.catalog.album(realRef));
    })();
  }, [ref]);

  const tracks = useMemo(() => ((a?.tracks || []) as any[]).map(asTrack).filter((t) => t.preview_url), [a]);

  return (
    <div className="page">
      <header className="topbar glass">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <div className="title">Album</div>
            <div className="subtitle">{a ? `${a.artist} · ${a.title}` : "Loading…"}</div>
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
          <div className="cover">{a?.cover_url ? <img src={a.cover_url} alt="" /> : <div className="skeleton" />}</div>
          <div>
            <div className="h1">{a?.title || "Loading…"}</div>
            <div className="kicker">{a?.artist || "—"}{a?.release_date ? ` · ${a.release_date}` : ""}</div>
            <div style={{ height: 12 }} />
            <button className="btnPrimary" onClick={() => setQueue(tracks, 0)} disabled={!tracks.length}>
              Play album (previews)
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <div>
            <div className="h2">Tracklist</div>
            <div className="kicker">{tracks.length} playable previews</div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {(a?.tracks || []).map((t: any) => (
            <div key={t.ref} className="card glass" style={{ padding: 12, display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>{t.preview_url ? "Preview available" : "No preview"}</div>
              </div>
              {t.preview_url ? (
                <button className="btnPrimary" onClick={() => setQueue([asTrack(t)], 0)}>Play</button>
              ) : t.external_urls?.deezer ? (
                <a className="btn" href={t.external_urls.deezer} target="_blank" rel="noreferrer">Open Deezer</a>
              ) : (
                <button className="btn" disabled>No preview</button>
              )}
            </div>
          ))}
        </div>
      </section>
      <div style={{ height: 96 }} />
    </div>
  );
}

