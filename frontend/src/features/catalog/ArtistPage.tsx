import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";
import { EmptyState, GridSkeleton, MediaCard, RowSkeleton, SectionHeader, TrackRow } from "../../components/media";
import { ExternalIcon, PlayIcon } from "../../components/icons";

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

export function ArtistPage() {
  const { ref } = useParams();
  const nav = useNavigate();
  const setQueue = usePlayerStore((s) => s.setQueue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const curRef = usePlayerStore((s) => s.queue[s.idx]?.ref);
  const realRef = useMemo(() => (ref ? decodeURIComponent(ref) : ""), [ref]);

  const [a, setA] = useState<any | null>(null);
  const [top, setTop] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [topLoading, setTopLoading] = useState(true);
  const [albLoading, setAlbLoading] = useState(true);
  const [topIndex, setTopIndex] = useState(0);
  const [albIndex, setAlbIndex] = useState(0);
  const [topMore, setTopMore] = useState(true);
  const [albMore, setAlbMore] = useState(true);
  const albSentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!realRef) return;
    let cancelled = false;
    setA(null);
    setTop([]);
    setAlbums([]);
    setTopIndex(0);
    setAlbIndex(0);
    setTopMore(true);
    setAlbMore(true);
    setTopLoading(true);
    setAlbLoading(true);
    (async () => {
      try {
        const data = await sonotecaApi.catalog.artist(realRef);
        if (!cancelled) setA(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [realRef]);

  const loadTop = useCallback(async () => {
    if (!realRef) return;
    try {
      const out = await sonotecaApi.catalog.artistTop(realRef, { limit: "20", index: String(topIndex) });
      const items = out.items || [];
      setTop((prev) => [...prev, ...items]);
      setTopMore(Boolean(out.has_more) && items.length > 0);
      setTopIndex(typeof out.next_index === "number" ? out.next_index : topIndex + items.length);
    } finally {
      setTopLoading(false);
    }
  }, [realRef, topIndex]);

  const loadAlbums = useCallback(async () => {
    if (!realRef) return;
    try {
      const out = await sonotecaApi.catalog.artistAlbums(realRef, { limit: "18", index: String(albIndex) });
      const items = out.items || [];
      setAlbums((prev) => [...prev, ...items]);
      setAlbMore(Boolean(out.has_more) && items.length > 0);
      setAlbIndex(typeof out.next_index === "number" ? out.next_index : albIndex + items.length);
    } finally {
      setAlbLoading(false);
    }
  }, [realRef, albIndex]);

  useEffect(() => {
    if (realRef) {
      loadTop();
      loadAlbums();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realRef]);

  useEffect(() => {
    const el = albSentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && albMore && !albLoading && loadAlbums(), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [albMore, albLoading, loadAlbums]);

  const playableTop = useMemo(() => top.map(asTrack).filter((t) => t.preview_url), [top]);

  function playTrack(t: Track) {
    if (t.ref === curRef) return togglePlay();
    const start = playableTop.findIndex((x) => x.ref === t.ref);
    setQueue(playableTop, start < 0 ? 0 : start);
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="hero">
        <div className="hero__art round">
          {a?.image_url ? <img src={a.image_url} alt="" /> : <div className="skeleton" style={{ width: "100%", height: "100%" }} />}
        </div>
        <div className="hero__meta">
          <div className="kicker">Artist</div>
          <div className="hero__title">{a?.name || "Loading…"}</div>
          {a?.nb_fan ? <div className="muted">{Number(a.nb_fan).toLocaleString()} fans</div> : null}
          <div className="row wrap gap2 mt3">
            <button className="btnPrimary" onClick={() => setQueue(playableTop, 0)} disabled={!playableTop.length}>
              <PlayIcon size={16} /> Play top tracks
            </button>
            {a?.external_urls?.deezer ? (
              <a className="btn" href={a.external_urls.deezer} target="_blank" rel="noreferrer">
                <ExternalIcon size={16} /> Deezer
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <SectionHeader title="Popular" subtitle="Top tracks with 30s previews" />
      {topLoading ? (
        <RowSkeleton count={6} />
      ) : top.length === 0 ? (
        <EmptyState title="No tracks found" />
      ) : (
        <div className="stack" style={{ gap: 2 }}>
          {top.map((x, i) => {
            const t = asTrack(x);
            return (
              <TrackRow
                key={`${t.ref}-${i}`}
                track={t}
                index={i}
                onPlay={() => (t.preview_url ? playTrack(t) : window.open(t.external_urls?.deezer || `https://www.deezer.com/track/${t.ref.split(":")[1]}`, "_blank"))}
              />
            );
          })}
          {topMore ? (
            <button className="btn" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={loadTop}>
              Show more
            </button>
          ) : null}
        </div>
      )}

      <SectionHeader title="Discography" subtitle="Albums & singles" />
      {albLoading && albums.length === 0 ? (
        <GridSkeleton count={12} />
      ) : albums.length === 0 ? (
        <EmptyState title="No albums found" />
      ) : (
        <div className="grid">
          {albums.map((al) => (
            <MediaCard
              key={al.ref}
              title={al.title}
              subtitle={al.release_date ? String(al.release_date).slice(0, 4) : undefined}
              imageUrl={al.cover_url}
              onOpen={() => nav(`/album/${encodeURIComponent(al.ref)}`)}
            />
          ))}
        </div>
      )}
      <div ref={albSentinel} style={{ height: 1 }} />
    </div>
  );
}
