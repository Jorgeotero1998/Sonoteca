import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";

type Tab = "favorites" | "saved" | "history";

function toTrack(r: any): Track {
  const x = r.item || r;
  return {
    ref: r.ref || x.ref,
    title: x.title,
    artist: x.artist,
    album: x.album,
    cover_url: x.cover_url,
    duration_ms: x.duration_ms,
    preview_url: x.preview_url,
    external_urls: x.external_urls,
  };
}

export function LibraryPage() {
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [tab, setTab] = useState<Tab>("favorites");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const tracks = useMemo(() => rows.map(toTrack), [rows]);

  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        if (tab === "favorites") setRows(await sonotecaApi.me.favorites());
        else if (tab === "saved") setRows(await sonotecaApi.me.library());
        else setRows(await sonotecaApi.me.history(80));
      } finally {
        setBusy(false);
      }
    })();
  }, [tab]);

  return (
    <div className="page">
      <header className="topbar glass">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <div className="title">Library</div>
            <div className="subtitle">Favorites · Saved · History</div>
          </div>
        </div>
        <nav className="nav">
          <Link className="btn" to="/">Home</Link>
          <Link className="btn" to="/search">Search</Link>
          <Link className="btn" to="/playlists">Playlists</Link>
        </nav>
      </header>

      <section className="section">
        <div className="sectionTitle">
          <div>
            <div className="h1">{tab === "favorites" ? "Favorites" : tab === "saved" ? "Saved" : "History"}</div>
            <div className="kicker">Persisted by refs · hydrated from Deezer</div>
          </div>
          <button className="btn" onClick={() => setQueue(tracks, 0)} disabled={!tracks.length}>
            Play all
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "0 6px 12px" }}>
          {(["favorites", "saved", "history"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "btn btnPrimary" : "btn"} onClick={() => setTab(t)} disabled={busy}>
              {t === "favorites" ? "Favorites" : t === "saved" ? "Saved" : "History"}
            </button>
          ))}
        </div>

        <div className="grid">
          {(tracks.length ? tracks : busy ? Array.from({ length: 12 }) : []).map((t: any, i: number) => (
            <div key={t?.ref || i} className="card glass hover">
              <div className="cover">{t?.cover_url ? <img src={t.cover_url} alt="" /> : <div className="skeleton" />}</div>
              <div className="meta">
                <div className="name">{t?.title || "Loading…"}</div>
                <div className="muted">{t?.artist || "—"}</div>
              </div>
              <div className="row">
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
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: 96 }} />
    </div>
  );
}

