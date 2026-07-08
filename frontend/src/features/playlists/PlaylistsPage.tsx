import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";
import { usePlaylistsStore } from "../../store/playlistsStore";
import { toast } from "../../store/uiStore";
import { EmptyState, MediaCard, SectionHeader, fmtDuration } from "../../components/media";
import { ChevronLeftIcon, ChevronRightIcon, ExternalIcon, MusicIcon, PlaylistIcon, PlayIcon, PlusIcon, ShareIcon, TrashIcon } from "../../components/icons";

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
  const [sp, setSp] = useSearchParams();
  const setQueue = usePlayerStore((s) => s.setQueue);
  const curRef = usePlayerStore((s) => s.queue[s.idx]?.ref);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const playlists = usePlaylistsStore((s) => s.list);
  const plLoaded = usePlaylistsStore((s) => s.loaded);
  const refreshPls = usePlaylistsStore((s) => s.refresh);

  const activeId = sp.get("id");
  const [detail, setDetail] = useState<any | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "", is_public: false });

  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const openDetail = useCallback(async (id: string) => {
    setDetailBusy(true);
    try {
      setDetail(await sonotecaApi.playlists.get(id));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not open playlist", "error");
    } finally {
      setDetailBusy(false);
    }
  }, []);

  useEffect(() => {
    if (activeId) openDetail(activeId);
    else setDetail(null);
  }, [activeId, openDetail]);

  function select(id: string | null) {
    if (id) sp.set("id", id);
    else sp.delete("id");
    setSp(sp, { replace: true });
  }

  async function create() {
    if (!draft.name.trim()) return;
    setBusy(true);
    try {
      const pl = await sonotecaApi.playlists.create(draft);
      await refreshPls();
      setCreating(false);
      setDraft({ name: "", description: "", is_public: false });
      toast(`Created “${pl.name}”`, "success");
      select(pl.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create playlist", "error");
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete playlist “${name}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await sonotecaApi.playlists.del(id);
      await refreshPls();
      toast(`Deleted “${name}”`, "success");
      select(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not delete", "error");
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
      await refreshPls();
      toast(p.is_public ? "Playlist is now public" : "Playlist is now private", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update", "error");
    } finally {
      setBusy(false);
    }
  }

  async function search() {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const out = await sonotecaApi.catalog.search({ q: q.trim(), type: "track", limit: "25", provider: "deezer" });
      setResults(out.items || []);
    } finally {
      setSearching(false);
    }
  }

  async function addTrack(ref: string, title: string) {
    if (!activeId) return;
    try {
      setDetail(await sonotecaApi.playlists.addItem(activeId, { ref, type: "track" }));
      toast(`Added “${title}”`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not add track", "error");
    }
  }

  async function removeItem(itemId: string) {
    if (!activeId) return;
    try {
      setDetail(await sonotecaApi.playlists.removeItem(activeId, itemId));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not remove", "error");
    }
  }

  async function move(itemId: string, dir: -1 | 1) {
    if (!activeId || !detail?.items?.length) return;
    const ids = (detail.items as any[]).map((x) => x.id);
    const i = ids.indexOf(itemId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    try {
      setDetail(await sonotecaApi.playlists.reorder(activeId, next));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not reorder", "error");
    }
  }

  const playableQueue = useMemo(() => {
    const items = (detail?.items || []).map((it: any) => (it?.item ? asTrack(it.item, it.ref) : null));
    return items.filter((x: any) => x && x.preview_url) as Track[];
  }, [detail]);

  const shareUrl = detail?.is_public && detail?.share_slug ? `${location.origin}/public/${detail.share_slug}` : null;

  function copyShare() {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).then(
      () => toast("Share link copied", "success"),
      () => toast(shareUrl, "info")
    );
  }

  function playItem(t: Track) {
    if (t.ref === curRef) return togglePlay();
    const start = playableQueue.findIndex((x) => x.ref === t.ref);
    setQueue(playableQueue, start < 0 ? 0 : start);
  }

  /* ------------------------------------------------------------- detail view */
  if (activeId) {
    return (
      <div className="stack" style={{ gap: 8 }}>
        <button className="btn" style={{ alignSelf: "flex-start" }} onClick={() => select(null)}>
          <ChevronLeftIcon size={16} /> All playlists
        </button>

        <div className="hero">
          <div className="hero__art" style={{ display: "grid", placeItems: "center", background: "linear-gradient(145deg, var(--acc), var(--acc-2))", color: "var(--acc-contrast)" }}>
            {detail?.items?.[0]?.item?.cover_url ? <img src={detail.items[0].item.cover_url} alt="" /> : <PlaylistIcon size={48} />}
          </div>
          <div className="hero__meta">
            <div className="kicker">{detail?.is_public ? "Public playlist" : "Playlist"}</div>
            <div className="hero__title">{detail?.name || "Loading…"}</div>
            {detail?.description ? <div className="muted">{detail.description}</div> : null}
            <div className="muted2" style={{ fontSize: 13 }}>{detail?.items?.length || 0} tracks</div>
            <div className="row wrap gap2 mt3">
              <button className="btnPrimary" onClick={() => setQueue(playableQueue, 0)} disabled={!playableQueue.length}>
                <PlayIcon size={16} /> Play
              </button>
              <button className="btn" onClick={togglePublic} disabled={busy}>
                {detail?.is_public ? "Make private" : "Make public"}
              </button>
              {shareUrl ? (
                <button className="btn" onClick={copyShare}>
                  <ShareIcon size={16} /> Share
                </button>
              ) : null}
              <button className="btnDanger" onClick={() => detail && del(activeId, detail.name)} disabled={busy}>
                <TrashIcon size={16} /> Delete
              </button>
            </div>
          </div>
        </div>

        {/* Add tracks */}
        <div className="card">
          <div className="h2">Add tracks</div>
          <div className="row gap2 stackOnMobile">
            <input className="input" value={q} placeholder="Search Deezer for a song…" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
            <button className="btnPrimary" onClick={search} disabled={searching || !q.trim()}>
              {searching ? "…" : "Search"}
            </button>
          </div>
          {results.length ? (
            <div className="stack" style={{ gap: 2, maxHeight: 320, overflowY: "auto" }}>
              {results.map((r) => (
                <div key={r.ref} className="trackRow trackRow--compact">
                  <div className="trackRow__art">{r.cover_url ? <img src={r.cover_url} alt="" /> : null}</div>
                  <div className="truncate">
                    <div className="truncate" style={{ fontWeight: 650 }}>{r.title}</div>
                    <div className="muted truncate" style={{ fontSize: 13 }}>{r.artist}</div>
                  </div>
                  <button className="iconBtn" aria-label={`Add ${r.title}`} onClick={() => addTrack(r.ref, r.title)}>
                    <PlusIcon size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Items */}
        <SectionHeader title="In this playlist" subtitle={detailBusy ? "Loading…" : undefined} />
        {(detail?.items || []).length === 0 ? (
          <EmptyState icon={<MusicIcon size={26} />} title="This playlist is empty" hint="Search above to add your first track." />
        ) : (
          <div className="stack" style={{ gap: 2 }}>
            {(detail.items as any[]).map((it, i) => {
              const t = it?.item ? asTrack(it.item, it.ref) : null;
              const playing = t?.ref === curRef;
              return (
                <div key={it.id} className={`trackRow trackRow--actionsVisible${playing ? " playing" : ""}`}>
                  <div className="trackRow__idx">{i + 1}</div>
                  <div className="trackRow__art">{t?.cover_url ? <img src={t.cover_url} alt="" /> : null}</div>
                  <div className="truncate">
                    <div className="truncate" style={{ fontWeight: 650 }}>{t?.title || it.ref}</div>
                    <div className="muted truncate" style={{ fontSize: 13 }}>{t ? `${t.artist}${t.album ? ` · ${t.album}` : ""}` : ""}</div>
                  </div>
                  <div className="trackRow__actions">
                    {t?.duration_ms ? <span className="muted2" style={{ fontSize: 13 }}>{fmtDuration(t.duration_ms)}</span> : null}
                    <button className="iconBtn ghost" aria-label="Move up" onClick={() => move(it.id, -1)} disabled={i === 0}>
                      <ChevronLeftIcon size={16} style={{ transform: "rotate(90deg)" }} />
                    </button>
                    <button className="iconBtn ghost" aria-label="Move down" onClick={() => move(it.id, 1)} disabled={i === detail.items.length - 1}>
                      <ChevronRightIcon size={16} style={{ transform: "rotate(90deg)" }} />
                    </button>
                    {t?.preview_url ? (
                      <button className="iconBtn ghost" aria-label="Play" onClick={() => playItem(t)}>
                        <PlayIcon size={16} />
                      </button>
                    ) : t?.external_urls?.deezer ? (
                      <a className="iconBtn ghost" href={t.external_urls.deezer} target="_blank" rel="noreferrer" aria-label="Open in Deezer">
                        <ExternalIcon size={16} />
                      </a>
                    ) : null}
                    <button className="iconBtn ghost" aria-label="Remove" onClick={() => removeItem(it.id)}>
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------- list view */
  return (
    <div className="stack" style={{ gap: 8 }}>
      <SectionHeader
        title="Your Playlists"
        subtitle="Create, curate and share collections"
        action={
          <button className="btnPrimary" onClick={() => setCreating((v) => !v)}>
            <PlusIcon size={16} /> New playlist
          </button>
        }
      />

      {creating ? (
        <div className="card">
          <div className="h2">Create a playlist</div>
          <input className="input" value={draft.name} placeholder="Playlist name" autoFocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && create()} />
          <input className="input" value={draft.description} placeholder="Description (optional)" onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <label className="chip" style={{ width: "fit-content", cursor: "pointer" }}>
            <input type="checkbox" checked={draft.is_public} onChange={(e) => setDraft({ ...draft, is_public: e.target.checked })} />
            <span>Make public &amp; shareable</span>
          </label>
          <div className="row gap2">
            <button className="btnPrimary" onClick={create} disabled={busy || !draft.name.trim()}>Create</button>
            <button className="btn" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      ) : null}

      {!plLoaded ? (
        <div className="grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mediaCard" aria-hidden>
              <div className="mediaCard__art skeleton" />
              <div className="skeleton skLine" style={{ width: "70%" }} />
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <EmptyState
          icon={<PlaylistIcon size={28} />}
          title="No playlists yet"
          hint="Create your first playlist to start collecting your favorite tracks."
          action={<button className="btnPrimary" onClick={() => setCreating(true)}><PlusIcon size={16} /> New playlist</button>}
        />
      ) : (
        <div className="grid">
          {playlists.map((p) => (
            <MediaCard
              key={p.id}
              title={p.name}
              subtitle={p.is_public ? "Public playlist" : "Playlist"}
              imageUrl={p.cover_url}
              fallback={<PlaylistIcon size={40} />}
              onOpen={() => select(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
