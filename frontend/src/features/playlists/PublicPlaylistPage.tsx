import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";

function asTrack(x: any, ref?: string): Track {
  return {
    ref: ref || x.ref,
    title: x.title,
    artist: x.artist,
    album: x.album,
    cover_url: x.cover_url,
    duration_ms: x.duration_ms,
    preview_url: x.preview_url,
    external_urls: x.external_urls,
  };
}

export function PublicPlaylistPage() {
  const { slug } = useParams();
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [data, setData] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setBusy(true);
      try {
        setData(await sonotecaApi.playlists.public(slug));
      } finally {
        setBusy(false);
      }
    })();
  }, [slug]);

  const queue = useMemo(() => {
    const items = (data?.items || []).map((it: any) => (it?.item ? asTrack(it.item, it.ref) : null));
    return items.filter((x: any) => x && x.preview_url);
  }, [data]);

  return (
    <div className="page">
      <header className="topbar glass">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <div className="title">Public playlist</div>
            <div className="subtitle">{busy ? "Loading…" : data?.name || "—"}</div>
          </div>
        </div>
        <nav className="nav">
          <Link className="btn" to="/">Open Sonoteca</Link>
          <button className="btn" onClick={() => setQueue(queue, 0)} disabled={!queue.length}>
            Play
          </button>
        </nav>
      </header>

      <section className="section">
        <div style={{ display: "grid", gap: 10 }}>
          {(data?.items || []).map((it: any) => (
            <div key={it.id} className="card glass" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
              <div className="chip">#{it.position}</div>
              <div style={{ width: 44, height: 44, borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,.06)" }}>
                {it?.item?.cover_url ? <img src={it.item.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {it.item ? `${it.item.artist} — ${it.item.title}` : it.ref}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{it.item?.album || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div style={{ height: 96 }} />
    </div>
  );
}

