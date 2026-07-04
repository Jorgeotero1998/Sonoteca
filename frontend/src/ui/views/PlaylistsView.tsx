import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export function PlaylistsView({ toast }: { toast: (m: string) => void }) {
  const [pls, setPls] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState({ name: "My Playlist", description: "", is_public: false });

  async function refreshAll() {
    setBusy(true);
    try {
      const [p, s] = await Promise.all([api.playlists.list(), api.songs.list()]);
      setPls(p);
      setSongs(s);
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

  async function addSong(songId: string) {
    if (!activeId) return;
    setBusy(true);
    try {
      const d = await api.playlists.addItem(activeId, { song_id: songId });
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
        <label className="pill" style={{ width: "fit-content" }}>
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
            <button className="btn" onClick={togglePublic} disabled={busy}>
              {detail.is_public ? "Make private" : "Make public"}
            </button>
          ) : null}
        </div>

        {shareUrl ? (
          <div style={{ marginTop: 12 }} className="pill">
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
                  Add song
                </div>
                <select
                  className="input"
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) addSong(id);
                    e.currentTarget.selectedIndex = 0;
                  }}
                  disabled={busy}
                >
                  <option value="">Select…</option>
                  {songs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.artist} — {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  Items
                </div>
                <div className="pill">{detail.items?.length ?? 0}</div>
              </div>
            </div>

            <div style={{ height: 12 }} />
            <div style={{ display: "grid", gap: 10, maxHeight: 420, overflow: "auto", paddingRight: 6 }}>
              {(detail.items || []).map((it: any) => (
                <div
                  key={it.id}
                  className="card"
                  style={{ padding: 12, background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.10)" }}
                >
                  <div className="row">
                    <div className="muted" style={{ fontSize: 12 }}>
                      #{it.position}
                    </div>
                    <button className="btn" onClick={() => removeItem(it.id)} disabled={busy}>
                      Remove
                    </button>
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 8 }}>
                    {it.song ? `${it.song.artist} — ${it.song.title}` : it.song_id}
                  </div>
                  <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                    {it.song ? `${it.song.album ?? "—"} · BPM ${it.song.bpm ?? "—"} · Key ${it.song.key ?? "—"}` : "—"}
                  </div>
                </div>
              ))}
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

