import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";
import { usePlaylistsStore } from "../../store/playlistsStore";
import { toast } from "../../store/uiStore";
import { EmptyState, MediaCard, SectionHeader, fmtDuration } from "../../components/media";
import { PageHero } from "../../components/PageHero";
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
  const coverUrl = detail?.items?.[0]?.item?.cover_url;

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

  if (activeId) {
    return (
      <div className="page page--flush">
        <button className="btn btn--back" onClick={() => select(null)}>
          <ChevronLeftIcon size={16} /> All playlists
        </button>

        <PageHero
          type={detail?.is_public ? "Public playlist" : "Playlist"}
          title={detail?.name || "Loading…"}
          subtitle={
            <>
              {detail?.description ? <span>{detail.description}</span> : null}
              <span>{detail?.items?.length || 0} tracks</span>
            </>
          }
          imageUrl={coverUrl}
          fallback={<PlaylistIcon size={48} />}
          actions={
            <>
              <button className="btn btn--primary" onClick={() => setQueue(playableQueue, 0)} disabled={!playableQueue.length}>
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
              <button className="btn btn--danger" onClick={() => detail && del(activeId, detail.name)} disabled={busy}>
                <TrashIcon size={16} /> Delete
              </button>
            </>
          }
        />

        <div className="page__body">
          <div className="panel">
            <h3 className="panel__title">Add tracks</h3>
            <div className="panel__row">
              <input className="field__input" value={q} placeholder="Search Deezer for a song…" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
              <button className="btn btn--primary" onClick={search} disabled={searching || !q.trim()}>
                {searching ? "…" : "Search"}
              </button>
            </div>
            {results.length ? (
              <div className="songList songList--compact">
                {results.map((r) => (
                  <div key={r.ref} className="songRow songRow--compact">
                    <div className="songRow__thumb">{r.cover_url ? <img src={r.cover_url} alt="" /> : null}</div>
                    <div className="songRow__info truncate">
                      <div className="songRow__title truncate">{r.title}</div>
                      <div className="songRow__artist truncate">{r.artist}</div>
                    </div>
                    <button className="iconBtn" aria-label={`Add ${r.title}`} onClick={() => addTrack(r.ref, r.title)}>
                      <PlusIcon size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <SectionHeader title="In this playlist" subtitle={detailBusy ? "Loading…" : undefined} />
          {(detail?.items || []).length === 0 ? (
            <EmptyState icon={<MusicIcon size={26} />} title="This playlist is empty" hint="Search above to add your first track." />
          ) : (
            <div className="songList">
              {(detail.items as any[]).map((it, i) => {
                const t = it?.item ? asTrack(it.item, it.ref) : null;
                const playing = t?.ref === curRef;
                return (
                  <div key={it.id} className={`songRow songRow--actions${playing ? " songRow--active" : ""}`}>
                    <div className="songRow__num">{i + 1}</div>
                    <div className="songRow__thumb">{t?.cover_url ? <img src={t.cover_url} alt="" /> : null}</div>
                    <div className="songRow__info truncate">
                      <div className="songRow__title truncate">{t?.title || it.ref}</div>
                      <div className="songRow__artist truncate">{t ? `${t.artist}${t.album ? ` · ${t.album}` : ""}` : ""}</div>
                    </div>
                    <div className="songRow__end">
                      {t?.duration_ms ? <span className="songRow__dur">{fmtDuration(t.duration_ms)}</span> : null}
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
      </div>
    );
  }

  return (
    <div className="page">
      <SectionHeader
        title="Your Playlists"
        subtitle="Create, curate and share collections"
        action={
          <button className="btn btn--primary" onClick={() => setCreating((v) => !v)}>
            <PlusIcon size={16} /> New playlist
          </button>
        }
      />

      {creating ? (
        <div className="panel">
          <h3 className="panel__title">Create a playlist</h3>
          <input className="field__input" value={draft.name} placeholder="Playlist name" autoFocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && create()} />
          <input className="field__input" value={draft.description} placeholder="Description (optional)" onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <label className="badge badge--check">
            <input type="checkbox" checked={draft.is_public} onChange={(e) => setDraft({ ...draft, is_public: e.target.checked })} />
            <span>Make public &amp; shareable</span>
          </label>
          <div className="panel__row">
            <button className="btn btn--primary" onClick={create} disabled={busy || !draft.name.trim()}>
              Create
            </button>
            <button className="btn" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {!plLoaded ? (
        <div className="tileGrid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="tile" aria-hidden>
              <div className="tile__art skeleton" />
              <div className="skeleton skLine" style={{ width: "70%" }} />
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <EmptyState
          icon={<PlaylistIcon size={28} />}
          title="No playlists yet"
          hint="Create your first playlist to start collecting your favorite tracks."
          action={
            <button className="btn btn--primary" onClick={() => setCreating(true)}>
              <PlusIcon size={16} /> New playlist
            </button>
          }
        />
      ) : (
        <div className="tileGrid">
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
