import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

export function PlaylistsPage() {
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [pls, setPls] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState({ name: "My Playlist", description: "", is_public: false });
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  async function refresh() {
    setBusy(true);
    try {
      setPls(await sonotecaApi.playlists.list());
    } finally {
      setBusy(false);
    }
  }

  async function open(id: string) {
    setBusy(true);
    try {
      setActiveId(id);
      setDetail(await sonotecaApi.playlists.get(id));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function create() {
    setBusy(true);
    try {
      const pl = await sonotecaApi.playlists.create(draft);
      await refresh();
      await open(pl.id);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublic() {
    if (!activeId || !detail) return;
    setBusy(true);
    try {
      const p = await sonotecaApi.playlists.patch(activeId, { is_public: !detail.is_public });
      setDetail({ ...detail, ...p });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function search() {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const out = await sonotecaApi.catalog.search({ q: q.trim(), type: "track", limit: "25", provider: "deezer" });
      setResults(out.items || []);
    } finally {
      setBusy(false);
    }
  }

  async function addTrack(ref: string) {
    if (!activeId) return;
    setBusy(true);
    try {
      setDetail(await sonotecaApi.playlists.addItem(activeId, { ref, type: "track" }));
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    if (!activeId) return;
    setBusy(true);
    try {
      setDetail(await sonotecaApi.playlists.removeItem(activeId, itemId));
    } finally {
      setBusy(false);
    }
  }

  async function move(itemId: string, dir: -1 | 1) {
    if (!activeId || !detail?.items?.length) return;
    const ids = (detail.items as any[]).map((x) => x.id);
    const i = ids.indexOf(itemId);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    setBusy(true);
    try {
      setDetail(await sonotecaApi.playlists.reorder(activeId, next));
    } finally {
      setBusy(false);
    }
  }

  const playableQueue = useMemo(() => {
    const items = (detail?.items || []).map((it: any) => (it?.item ? asTrack(it.item, it.ref) : null));
    return items.filter((x: any) => x && x.preview_url);
  }, [detail]);

  const shareUrl = detail?.is_public && detail?.share_slug ? `${location.origin}/public/${detail.share_slug}` : null;

  return (
    <div className="page">
      <header className="topbar glass">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <div className="title">Playlists</div>
            <div className="subtitle">Refs-only · hydrated from Deezer</div>
          </div>
        </div>
        <nav className="nav">
          <Link className="btn" to="/">Home</Link>
          <Link className="btn" to="/search">Search</Link>
          <Link className="btn" to="/library">Library</Link>
        </nav>
      </header>

      <section className="section" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12 }}>
        <div className="card glass" style={{ padding: 14 }}>
          <div className="h2">Create</div>
          <div style={{ height: 10 }} />
          <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <div style={{ height: 10 }} />
          <input className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" />
          <div style={{ height: 10 }} />
          <label className="chip" style={{ width: "fit-content" }}>
            <input type="checkbox" checked={draft.is_public} onChange={(e) => setDraft({ ...draft, is_public: e.target.checked })} />
            <span>Public</span>
          </label>
          <div style={{ height: 10 }} />
          <button className="btnPrimary" onClick={create} disabled={busy}>
            Create playlist
          </button>
          <div style={{ height: 14 }} />
          <div className="h2">Your playlists</div>
          <div style={{ height: 10 }} />
          <div style={{ display: "grid", gap: 10, maxHeight: 360, overflow: "auto" }}>
            {pls.map((p) => (
              <button key={p.id} className={activeId === p.id ? "btnPrimary" : "btn"} onClick={() => open(p.id)} disabled={busy}>
                {p.name}
              </button>
            ))}
            {pls.length === 0 ? <div className="muted">No playlists yet.</div> : null}
          </div>
        </div>

        <div className="card glass" style={{ padding: 14 }}>
          <div className="sectionTitle" style={{ margin: 0 }}>
            <div>
              <div className="h2">{detail ? detail.name : "Select a playlist"}</div>
              <div className="kicker">{detail ? `${detail.items?.length || 0} items` : "—"}</div>
            </div>
            {detail ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "end" }}>
                <button className="btn" onClick={() => setQueue(playableQueue, 0)} disabled={!playableQueue.length}>
                  Play
                </button>
                <button className="btn" onClick={togglePublic} disabled={busy}>
                  {detail.is_public ? "Make private" : "Make public"}
                </button>
              </div>
            ) : null}
          </div>

          {shareUrl ? (
            <div style={{ marginTop: 12 }} className="chip">
              <span>Share:</span> <a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
            </div>
          ) : null}

          {detail ? (
            <>
              <div style={{ height: 12 }} />
              <div className="h2">Add tracks</div>
              <div style={{ height: 10 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Deezer…" onKeyDown={(e) => e.key === "Enter" ? search() : null} />
                <button className="btnPrimary" onClick={search} disabled={busy || !q.trim()}>
                  Search
                </button>
              </div>
              {results.length ? (
                <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 220, overflow: "auto" }}>
                  {results.map((r) => (
                    <div key={r.ref} className="card" style={{ padding: 10 }}>
                      <div className="row">
                        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,.06)" }}>
                            {r.cover_url ? <img src={r.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                            <div className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {r.artist}{r.album ? ` · ${r.album}` : ""}
                            </div>
                          </div>
                        </div>
                        <button className="btn" onClick={() => addTrack(r.ref)} disabled={busy}>
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div style={{ height: 12 }} />
              <div className="h2">Items</div>
              <div style={{ height: 10 }} />
              <div style={{ display: "grid", gap: 10, maxHeight: 520, overflow: "auto" }}>
                {(detail.items || []).map((it: any) => {
                  const t = it?.item ? asTrack(it.item, it.ref) : null;
                  return (
                    <div key={it.id} className="card" style={{ padding: 10 }}>
                      <div className="row">
                        <div className="muted">#{it.position}</div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button className="btn" onClick={() => move(it.id, -1)} disabled={busy}>
                            Up
                          </button>
                          <button className="btn" onClick={() => move(it.id, 1)} disabled={busy}>
                            Down
                          </button>
                          {t?.preview_url ? (
                            <button className="btnPrimary" onClick={() => setQueue([t], 0)}>
                              Play
                            </button>
                          ) : t?.external_urls?.deezer ? (
                            <a className="btn" href={t.external_urls.deezer} target="_blank" rel="noreferrer">
                              Open Deezer
                            </a>
                          ) : (
                            <button className="btn" disabled>No preview</button>
                          )}
                          <button className="btn" onClick={() => removeItem(it.id)} disabled={busy}>
                            Remove
                          </button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 10, marginTop: 8, alignItems: "center" }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,.06)" }}>
                          {t?.cover_url ? <img src={t.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t ? `${t.artist} — ${t.title}` : it.ref}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{t?.album || "—"}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(detail.items || []).length === 0 ? <div className="muted">No items yet.</div> : null}
              </div>
            </>
          ) : (
            <div className="muted" style={{ marginTop: 16 }}>Choose a playlist from the left.</div>
          )}
        </div>
      </section>

      <div style={{ height: 96 }} />
    </div>
  );
}

