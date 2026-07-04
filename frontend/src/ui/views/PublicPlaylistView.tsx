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
    <div style={{ minHeight: "100%", display: "grid", placeItems: "center", padding: 16 }}>
      <div className="card" style={{ width: "min(920px, 100%)", padding: 16 }}>
        <div className="row">
          <div>
            <div className="h2">Public playlist</div>
            <div className="kicker" style={{ marginTop: 6 }}>
              {busy ? "Loading…" : data ? data.name : "—"}
            </div>
          </div>
          <a className="btn" href="/" title="Open app">
            Open Sonoteca
          </a>
        </div>

        <div style={{ height: 12 }} />
        <div style={{ display: "grid", gap: 10 }}>
          {(data?.items || []).map((it: any) => (
            <div key={it.id} className="tile" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
              <div className="chip">#{it.position}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 760, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {it.item ? `${it.item.artist} — ${it.item.title}` : it.ref}
                </div>
                <div className="kicker">{it.item?.album ?? "—"}</div>
              </div>
            </div>
          ))}
          {(data?.items || []).length === 0 ? <div className="muted">No items.</div> : null}
        </div>
      </div>
    </div>
  );
}

