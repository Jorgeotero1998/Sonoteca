import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";
import { EmptyState, GridSkeleton, MediaCard, RowSkeleton, SectionHeader, TrackRow } from "../../components/media";
import { PlayIcon, SearchIcon } from "../../components/icons";

type Tab = "track" | "artist" | "album";

function asTrack(x: any): Track {
  return {
    ref: x.ref,
    title: x.title,
    artist: x.artist,
    album: x.album,
    cover_url: x.cover_url,
    duration_ms: x.duration_ms,
    preview_url: x.preview_url,
    external_urls: x.external_urls,
  };
}

export function SearchPage() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const setQueue = usePlayerStore((s) => s.setQueue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const curRef = usePlayerStore((s) => s.queue[s.idx]?.ref);
  const q = sp.get("q") || "";
  const tab = (sp.get("tab") as Tab) || "track";
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const tracks = useMemo(() => items.map(asTrack).filter((t) => t.preview_url), [items]);

  const run = useCallback(
    async (reset = false) => {
      if (!q.trim()) {
        setItems([]);
        setHasMore(false);
        return;
      }
      setBusy(true);
      try {
        const index = reset ? 0 : items.length;
        const out = await sonotecaApi.catalog.search({ q: q.trim(), type: tab, limit: "30", index: String(index), provider: "deezer" });
        const next = out.items || [];
        setItems((prev) => (reset ? next : [...prev, ...next]));
        setHasMore(next.length > 0);
      } finally {
        setBusy(false);
      }
    },
    [q, tab, items.length]
  );

  useEffect(() => {
    setItems([]);
    setHasMore(true);
    run(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tab]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && !busy && hasMore && q.trim() && run(false), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [busy, hasMore, q, run]);

  function playTrack(t: Track) {
    if (t.ref === curRef) return togglePlay();
    const start = tracks.findIndex((x) => x.ref === t.ref);
    setQueue(tracks, start < 0 ? 0 : start);
  }

  function setTab(t: Tab) {
    sp.set("tab", t);
    setSp(sp, { replace: true });
  }

  const empty = !busy && items.length === 0;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="rowBetween wrap" style={{ gap: 12 }}>
        <div className="tabs">
          {(["track", "artist", "album"] as Tab[]).map((t) => (
            <button key={t} className={`tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
              {t === "track" ? "Songs" : t === "artist" ? "Artists" : "Albums"}
            </button>
          ))}
        </div>
        {tab === "track" && tracks.length ? (
          <button className="btnPrimary" onClick={() => setQueue(tracks, 0)}>
            <PlayIcon size={16} /> Play results
          </button>
        ) : null}
      </div>

      {!q.trim() ? (
        <EmptyState icon={<SearchIcon size={28} />} title="Search Sonoteca" hint="Find songs, artists, and albums from the Deezer catalog. Try “Daft Punk” or “lofi”." />
      ) : busy && items.length === 0 ? (
        tab === "track" ? (
          <RowSkeleton count={10} />
        ) : (
          <GridSkeleton count={12} round={tab === "artist"} />
        )
      ) : empty ? (
        <EmptyState icon={<SearchIcon size={28} />} title={`No results for “${q}”`} hint="Try a different spelling or search another category." />
      ) : tab === "track" ? (
        <>
          <SectionHeader title={`Songs`} subtitle={`Results for “${q}”`} />
          <div className="stack" style={{ gap: 2 }}>
            {items.map((x, i) => {
              const t = asTrack(x);
              return (
                <TrackRow
                  key={t.ref}
                  track={t}
                  index={i}
                  onPlay={() => (t.preview_url ? playTrack(t) : window.open(t.external_urls?.deezer || `https://www.deezer.com/track/${t.ref.split(":")[1]}`, "_blank"))}
                />
              );
            })}
          </div>
        </>
      ) : (
        <>
          <SectionHeader title={tab === "artist" ? "Artists" : "Albums"} subtitle={`Results for “${q}”`} />
          <div className="grid">
            {items.map((x) => (
              <MediaCard
                key={x.ref}
                title={x.title || x.name}
                subtitle={tab === "album" ? x.artist : undefined}
                imageUrl={x.cover_url || x.image_url}
                round={tab === "artist"}
                onOpen={() => nav(`/${tab}/${encodeURIComponent(x.ref)}`)}
              />
            ))}
          </div>
        </>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} />
      {busy && items.length > 0 ? <div className="muted2" style={{ padding: "12px 4px", fontSize: 13 }}>Loading more…</div> : null}
    </div>
  );
}
