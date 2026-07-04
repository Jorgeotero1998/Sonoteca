import { useEffect, useState } from "react";
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

export function TrackPage() {
  const { ref } = useParams();
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [t, setT] = useState<any | null>(null);

  useEffect(() => {
    if (!ref) return;
    (async () => {
      const realRef = decodeURIComponent(ref);
      setT(await sonotecaApi.catalog.track(realRef));
    })();
  }, [ref]);

  const track = t ? asTrack(t) : null;

  return (
    <div className="page">
      <header className="topbar glass">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <div className="title">Track</div>
            <div className="subtitle">{track ? `${track.artist} — ${track.title}` : "Loading…"}</div>
          </div>
        </div>
        <nav className="nav">
          <Link className="btn" to="/">Home</Link>
          <Link className="btn" to="/search">Search</Link>
          <Link className="btn" to="/library">Library</Link>
        </nav>
      </header>

      <section className="section">
        <div className="card glass" style={{ padding: 14, display: "grid", gridTemplateColumns: "180px 1fr", gap: 14 }}>
          <div className="cover">{track?.cover_url ? <img src={track.cover_url} alt="" /> : <div className="skeleton" />}</div>
          <div>
            <div className="h1">{track?.title || "Loading…"}</div>
            <div className="kicker">{track?.artist}{track?.album ? ` · ${track.album}` : ""}</div>
            <div style={{ height: 12 }} />
            {track?.preview_url ? (
              <button className="btnPrimary" onClick={() => setQueue([track], 0)}>Play preview</button>
            ) : track?.external_urls?.deezer ? (
              <a className="btnPrimary" href={track.external_urls.deezer} target="_blank" rel="noreferrer">Open in Deezer</a>
            ) : (
              <button className="btnPrimary" disabled>No preview</button>
            )}
          </div>
        </div>
      </section>
      <div style={{ height: 96 }} />
    </div>
  );
}

