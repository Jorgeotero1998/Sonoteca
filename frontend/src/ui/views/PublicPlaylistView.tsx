import { useEffect, useState } from "react";
import { api } from "../api";

export function PublicPlaylistView({ slug, toast }: { slug: string; toast: (m: string) => void }) {
  const [data, setData] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        setData(await api.playlists.public(slug));
      } catch (e) {
        toast(e instanceof Error ? e.message : "Fetch failed");
      } finally {
        setBusy(false);
      }
    })();
  }, [slug]);

  return (
    <div className="container">
      <div className="glass" style={{ padding: 16 }}>
        <div style={{ fontWeight: 780, letterSpacing: "-0.02em", fontSize: 18 }}>Public playlist</div>
        <div className="muted" style={{ marginTop: 8 }}>
          {busy ? "Loading…" : data ? data.name : "—"}
        </div>
        <div style={{ height: 12 }} />
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "grid", gap: 10 }}>
            {(data?.items || []).map((it: any) => (
              <div key={it.id} className="pill">
                <span>#{it.position}</span>
                <span className="muted">{it.song ? `${it.song.artist} — ${it.song.title}` : it.song_id}</span>
              </div>
            ))}
            {(data?.items || []).length === 0 ? <div className="muted">No items.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

