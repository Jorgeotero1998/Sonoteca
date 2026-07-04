import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export function PlaylistsView({
  toast,
  onPlay,
}: {
  toast: (m: string) => void;
  onPlay: (s: any, q?: any[]) => void;
}) {
  const [pls, setPls] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState({ name: "My Playlist", description: "", is_public: false });

  async function refreshAll() {
    setBusy(true);
    try {
      const [p] = await Promise.all([api.playlists.list()]);
      setPls(p);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setBusy(false);
    }
  }

  async function open(id: string) {
    setBusy(true);
    try {
      setActiveId(id);
      setDetail(await api.playlists.get(id));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Open failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  async function create() {
    setBusy(true);
    try {
      const pl = await api.playlists.create(draft);
      toast("Playlist created");
      await refreshAll();
      await open(pl.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function search() {
    setBusy(true);
    try {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      const out = await api.catalog.search({ q: q.trim(), type: "track", limit: "30", provider: "deezer" });
      setResults(out.items || []);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function addTrack(ref: string) {
    if (!activeId) return;
    setBusy(true);
    try {
      const d = await api.playlists.addItem(activeId, { ref, type: "track" });
      setDetail(d);
      toast("Added");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    if (!activeId) return;
    setBusy(true);
    try {
      const d = await api.playlists.removeItem(activeId, itemId);
      setDetail(d);
      toast("Removed");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublic() {
    if (!activeId || !detail) return;
    setBusy(true);
    try {
      const p = await api.playlists.patch(activeId, { is_public: !detail.is_public });
      toast("Updated");
      setDetail({ ...detail, ...p });
      await refreshAll();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  const shareUrl = useMemo(() => {
    if (!detail?.is_public || !detail?.share_slug) return null;
    return `${location.origin}/?public=${detail.share_slug}`;
  }, [detail]);

  const playlistQueue = useMemo(() => {
    return (detail?.items || [])
      .map((it: any) => (it?.item ? { ...it.item, ref: it.ref } : null))
      .filter((s: any) => s && (s.preview_url || s.audio_url));
  }, [detail]);

  return (
    <div className="grid2">
      <div className="card" style={{ padding: 16 }}>
        <div className="row">
          <div>
            <div style={{ fontWeight: 760, letterSpacing: "-0.02em" }}>Playlists</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Create, add songs, toggle public share.
            </div>
          </div>
          <button className="btn" onClick={refreshAll} disabled={busy}>
            Refresh
          </button>
        </div>
        <div style={{ height: 12 }} />
        <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Playlist name" />
        <div style={{ height: 10 }} />
        <input className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" />
        <div style={{ height: 10 }} />
        <label className="chip" style={{ width: "fit-content" }}>
          <input
            type="checkbox"
            checked={draft.is_public}
            onChange={(e) => setDraft({ ...draft, is_public: e.target.checked })}
          />
          <span>Public</span>
        </label>
        <div style={{ height: 12 }} />
        <button className="btn btnPrimary" onClick={create} disabled={busy}>
          Create playlist
        </button>

        <div style={{ height: 14 }} />
        <div style={{ display: "grid", gap: 10, maxHeight: 360, overflow: "auto", paddingRight: 6 }}>
          {pls.map((p) => (
            <button
              key={p.id}
              className={activeId === p.id ? "btn btnPrimary" : "btn"}
              style={{ justifyContent: "space-between" }}
              onClick={() => open(p.id)}
              disabled={busy}
            >
              <span style={{ fontWeight: 650 }}>{p.name}</span>
              <span className="muted" style={{ fontSize: 12 }}>
                {p.is_public ? "public" : "private"}
              </span>
            </button>
          ))}
          {pls.length === 0 ? <div className="muted">No playlists yet.</div> : null}
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="row">
          <div>
            <div style={{ fontWeight: 760, letterSpacing: "-0.02em" }}>Playlist editor</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {detail ? detail.name : "Select a playlist"}
            </div>
          </div>
          {detail ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btnPrimary"
                onClick={() => {
                  if (!playlistQueue.length) {
                    toast("No playable previews in this playlist.");
                    return;
                  }
                  onPlay(playlistQueue[0], playlistQueue);
                }}
                disabled={busy}
              >
                Play playlist
              </button>
              <button className="btn" onClick={togglePublic} disabled={busy}>
                {detail.is_public ? "Make private" : "Make public"}
              </button>
            </div>
          ) : null}
        </div>

        {shareUrl ? (
          <div style={{ marginTop: 12 }} className="chip">
            <span>Share:</span>
            <a href={shareUrl} className="muted" target="_blank" rel="noreferrer">
              {shareUrl}
            </a>
          </div>
        ) : null}

        <div style={{ height: 12 }} />
        {detail ? (
          <>
            <div className="grid2">
              <div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  Add track (Deezer)
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    className="input"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search on Deezer…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") search();
                    }}
                    disabled={busy}
                  />
                  <button className="btn btnPrimary" onClick={search} disabled={busy || !q.trim()}>
                    Search
                  </button>
                </div>
                {results.length ? (
                  <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 160, overflow: "auto" }}>
                    {results.map((r: any) => (
                      <div key={r.ref} className="card" style={{ padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ width: 38, height: 38, borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,.06)" }}>
                          {r.cover_url ? <img src={r.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 780, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                          <div className="kicker" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {r.artist}{r.album ? ` · ${r.album}` : ""}
                          </div>
                        </div>
                        <button className="btn" onClick={() => addTrack(r.ref)} disabled={busy}>
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  Items
                </div>
                <div className="chip">{detail.items?.length ?? 0}</div>
              </div>
            </div>

            <div style={{ height: 12 }} />
            <div style={{ display: "grid", gap: 10, maxHeight: 420, overflow: "auto", paddingRight: 6 }}>
              {(detail.items || []).map((it: any) => {
                const t = it?.item ? { ...it.item, ref: it.ref } : null;
                return (
                  <div
                    key={it.id}
                    className="card"
                    style={{
                      padding: 12,
                      background: "rgba(0,0,0,.22)",
                      border: "1px solid rgba(255,255,255,.10)",
                    }}
                  >
                    <div className="row">
                      <div className="muted" style={{ fontSize: 12 }}>
                        #{it.position}
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        {t?.preview_url || t?.audio_url ? (
                          <button
                            className="btn btnPrimary"
                            onClick={() => onPlay(t, playlistQueue.length ? playlistQueue : [t])}
                            disabled={busy}
                          >
                            Play
                          </button>
                        ) : null}
                        {!t?.preview_url ? (
                          <a
                            className="btn"
                            href={t?.external_urls?.deezer || t?.embed_url || "#"}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open Deezer
                          </a>
                        ) : null}
                        <button className="btn" onClick={() => removeItem(it.id)} disabled={busy}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "44px 1fr",
                        gap: 10,
                        alignItems: "center",
                        marginTop: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,.14)",
                          background: "rgba(255,255,255,.04)",
                        }}
                      >
                        {t?.cover_url ? (
                          <img
                            src={t.cover_url}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : null}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {t ? `${t.artist} — ${t.title}` : it.ref}
                        </div>
                        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                          {t ? `${t.album ?? "—"} · ${Math.round((t.duration_ms || 0) / 1000)}s` : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(detail.items || []).length === 0 ? <div className="muted">No items yet.</div> : null}
            </div>
          </>
        ) : (
          <div className="muted">Choose a playlist on the left.</div>
        )}
      </div>
    </div>
  );
}

