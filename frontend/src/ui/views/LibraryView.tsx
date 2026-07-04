import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export function LibraryView({ toast, onPlay }: { toast: (m: string) => void; onPlay: (s: any, q?: any[]) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"browse" | "favorites" | "history" | "saved">("browse");
  const [fav, setFav] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());

  async function refresh() {
    setBusy(true);
    try {
      if (tab === "favorites") {
        const rows = await api.me.favorites();
        setItems(rows.map((r: any) => ({ ...r.item, ref: r.ref })));
        return;
      }
      if (tab === "saved") {
        const rows = await api.me.library();
        setItems(rows.map((r: any) => ({ ...r.item, ref: r.ref })));
        return;
      }
      if (tab === "history") {
        const rows = await api.me.history(80);
        setItems(rows.map((r: any) => ({ ...r.item, ref: r.ref, played_at: r.played_at })));
        return;
      }

      // browse
      if (q.trim()) {
        const out = await api.catalog.search({ q: q.trim(), type: "track", limit: "40", provider: "deezer" });
        setItems(out.items || []);
      } else {
        const out = await api.catalog.charts({ limit: "40" });
        setItems(out.tracks || []);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const [f, l] = await Promise.all([api.me.favorites(), api.me.library()]);
        setFav(new Set((f || []).map((x: any) => x.ref)));
        setSaved(new Set((l || []).map((x: any) => x.ref)));
      } catch {
        // ignore
      } finally {
        refresh();
      }
    })();
  }, []);

  useEffect(() => {
    refresh();
  }, [tab]);

  const totalDurationMin = useMemo(
    () => Math.round(items.reduce((acc, s) => acc + ((s.duration_ms || 0) / 1000 || 0), 0) / 60),
    [items]
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div className="row">
          <div>
            <div className="h2">Library</div>
            <div className="kicker">{items.length} tracks · {totalDurationMin} min · Real catalog search</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className={tab === "browse" ? "btn btnPrimary" : "btn"} onClick={() => setTab("browse")} disabled={busy}>
              Browse
            </button>
            <button className={tab === "favorites" ? "btn btnPrimary" : "btn"} onClick={() => setTab("favorites")} disabled={busy}>
              Favorites
            </button>
            <button className={tab === "saved" ? "btn btnPrimary" : "btn"} onClick={() => setTab("saved")} disabled={busy}>
              Saved
            </button>
            <button className={tab === "history" ? "btn btnPrimary" : "btn"} onClick={() => setTab("history")} disabled={busy}>
              History
            </button>
            <button className="btn" onClick={refresh} disabled={busy}>
              {busy ? "..." : "Refresh"}
            </button>
          </div>
        </div>
        <div style={{ height: 12 }} />
        {tab === "browse" ? (
          <>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search on Deezer (tracks)…"
              onKeyDown={(e) => {
                if (e.key === "Enter") refresh();
              }}
            />
            <button className="btn btnPrimary" onClick={refresh} disabled={busy}>
              Search
            </button>
          </>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        }}
      >
        {items.map((s) => (
            <div key={s.id} className="tile" style={{ padding: 12 }}>
              <div className="cover">{s.cover_url ? <img src={s.cover_url} alt="" /> : null}</div>
              <div style={{ height: 10 }} />
              <div style={{ fontWeight: 820, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.title}
              </div>
              <div className="kicker" style={{ marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.artist}{s.album ? ` · ${s.album}` : ""}{s.release_date ? ` · ${s.release_date}` : ""}
              </div>
              <div style={{ height: 10, display: "flex", gap: 10 }}>
                <button className="btn btnPrimary" onClick={() => onPlay(s, items)} disabled={busy || !(s.preview_url || s.audio_url)}>
                  Play
                </button>
                {s.ref ? (
                  <button
                    className={fav.has(s.ref) ? "btn btnPrimary" : "btn"}
                    onClick={async () => {
                      try {
                        if (fav.has(s.ref)) {
                          await api.me.favoriteDel(s.ref);
                          const n = new Set(fav);
                          n.delete(s.ref);
                          setFav(n);
                        } else {
                          await api.me.favoriteAdd(s.ref);
                          setFav(new Set([...fav, s.ref]));
                        }
                      } catch (e) {
                        toast(e instanceof Error ? e.message : "Favorite failed");
                      }
                    }}
                    disabled={busy}
                  >
                    {fav.has(s.ref) ? "Fav" : "Fav"}
                  </button>
                ) : null}
                {s.ref ? (
                  <button
                    className={saved.has(s.ref) ? "btn btnPrimary" : "btn"}
                    onClick={async () => {
                      try {
                        if (saved.has(s.ref)) {
                          await api.me.libraryDel(s.ref);
                          const n = new Set(saved);
                          n.delete(s.ref);
                          setSaved(n);
                        } else {
                          await api.me.libraryAdd(s.ref);
                          setSaved(new Set([...saved, s.ref]));
                        }
                      } catch (e) {
                        toast(e instanceof Error ? e.message : "Save failed");
                      }
                    }}
                    disabled={busy}
                  >
                    {saved.has(s.ref) ? "Saved" : "Save"}
                  </button>
                ) : null}
              </div>
            </div>
        ))}
        {items.length === 0 ? <div className="muted">No results. Try another query.</div> : null}
      </div>
    </div>
  );
}

