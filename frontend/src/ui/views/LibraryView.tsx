import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export function LibraryView({ toast }: { toast: (m: string) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState<any>({
    title: "New Track",
    artist: "Unknown Artist",
    album: "",
    year: undefined,
    genre: "",
    bpm: undefined,
    key: "",
    duration_sec: undefined,
    tags: [],
  });

  async function refresh() {
    setBusy(true);
    try {
      const data = await api.songs.list(q ? { q } : {});
      setItems(data);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Fetch failed");
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
      await api.songs.create({ ...draft, tags: (draft.tags || []).filter(Boolean) });
      toast("Song created");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await api.songs.del(id);
      toast("Song deleted");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const totalDuration = useMemo(() => items.reduce((acc, s) => acc + (s.duration_sec || 0), 0), [items]);

  return (
    <div className="grid2">
      <div className="card" style={{ padding: 16 }}>
        <div className="row">
          <div>
            <div style={{ fontWeight: 760, letterSpacing: "-0.02em" }}>Songs</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {items.length} songs · {Math.round(totalDuration / 60)} min
            </div>
          </div>
          <button className="btn" onClick={refresh} disabled={busy}>
            {busy ? "..." : "Refresh"}
          </button>
        </div>
        <div style={{ height: 12 }} />
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
        <div style={{ height: 10 }} />
        <button className="btn btnPrimary" onClick={refresh} disabled={busy}>
          Search
        </button>

        <div style={{ height: 12 }} />
        <div style={{ display: "grid", gap: 10, maxHeight: 420, overflow: "auto", paddingRight: 6 }}>
          {items.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{ padding: 12, background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.10)" }}
            >
              <div className="row" style={{ gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.title}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    {s.artist}
                    {s.album ? ` · ${s.album}` : ""} {s.genre ? ` · ${s.genre}` : ""}
                  </div>
                </div>
                <button className="btn" onClick={() => remove(s.id)} disabled={busy}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 ? <div className="muted">No songs yet.</div> : null}
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 760, letterSpacing: "-0.02em" }}>Add song</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Owner/editor can create.
        </div>
        <div style={{ height: 12 }} />
        <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
        <div style={{ height: 10 }} />
        <input className="input" value={draft.artist} onChange={(e) => setDraft({ ...draft, artist: e.target.value })} placeholder="Artist" />
        <div style={{ height: 10 }} />
        <input className="input" value={draft.album} onChange={(e) => setDraft({ ...draft, album: e.target.value })} placeholder="Album (optional)" />
        <div style={{ height: 10 }} />
        <div className="grid2">
          <input className="input" value={draft.genre} onChange={(e) => setDraft({ ...draft, genre: e.target.value })} placeholder="Genre" />
          <input className="input" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} placeholder="Key (e.g. Am)" />
        </div>
        <div style={{ height: 10 }} />
        <div className="grid2">
          <input
            className="input"
            value={draft.bpm ?? ""}
            onChange={(e) => setDraft({ ...draft, bpm: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="BPM"
          />
          <input
            className="input"
            value={draft.duration_sec ?? ""}
            onChange={(e) => setDraft({ ...draft, duration_sec: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Duration (sec)"
          />
        </div>
        <div style={{ height: 10 }} />
        <input
          className="input"
          value={(draft.tags || []).join(", ")}
          onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map((x: string) => x.trim()).filter(Boolean) })}
          placeholder="Tags (comma separated)"
        />
        <div style={{ height: 12 }} />
        <button className="btn btnPrimary" onClick={create} disabled={busy}>
          {busy ? "..." : "Create"}
        </button>
      </div>
    </div>
  );
}

