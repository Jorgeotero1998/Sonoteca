import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";
import { EmptyState, RowSkeleton, SectionHeader, TrackRow } from "../../components/media";
import { PageHero } from "../../components/PageHero";
import { AlertIcon, ExternalIcon, PlayIcon } from "../../components/icons";

function asTrack(x: any, cover?: string | null): Track {
  return {
    ref: x.ref,
    title: x.title,
    artist: x.artist,
    album: x.album,
    cover_url: x.cover_url || cover,
    duration_ms: x.duration_ms,
    preview_url: x.preview_url,
    external_urls: x.external_urls,
  };
}

export function AlbumPage() {
  const { ref } = useParams();
  const nav = useNavigate();
  const setQueue = usePlayerStore((s) => s.setQueue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const curRef = usePlayerStore((s) => s.queue[s.idx]?.ref);
  const [a, setA] = useState<any | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    setBusy(true);
    setErr(false);
    (async () => {
      try {
        const data = await sonotecaApi.catalog.album(decodeURIComponent(ref));
        if (!cancelled) setA(data);
      } catch {
        if (!cancelled) setErr(true);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ref]);

  const allTracks = useMemo(() => ((a?.tracks || []) as any[]).map((t) => asTrack(t, a?.cover_url)), [a]);
  const playable = useMemo(() => allTracks.filter((t) => t.preview_url), [allTracks]);

  function playTrack(t: Track) {
    if (t.ref === curRef) return togglePlay();
    const start = playable.findIndex((x) => x.ref === t.ref);
    setQueue(playable, start < 0 ? 0 : start);
  }

  if (err) return <EmptyState icon={<AlertIcon size={28} />} title="Album not found" hint="This album could not be loaded." action={<button className="btn" onClick={() => nav("/")}>Back home</button>} />;

  const subtitle = [a?.artist, a?.release_date ? String(a.release_date).slice(0, 4) : null, a?.tracks?.length ? `${a.tracks.length} tracks` : null].filter(Boolean).join(" · ");

  return (
    <div className="page page--flush">
      <PageHero
        type="Album"
        title={a?.title || "Loading…"}
        subtitle={subtitle}
        imageUrl={a?.cover_url}
        actions={
          <>
            <button className="btn btn--primary" onClick={() => setQueue(playable, 0)} disabled={!playable.length}>
              <PlayIcon size={16} /> Play
            </button>
            {a?.external_urls?.deezer ? (
              <a className="btn" href={a.external_urls.deezer} target="_blank" rel="noreferrer">
                <ExternalIcon size={16} /> Deezer
              </a>
            ) : null}
          </>
        }
      />

      <div className="page__body">
        <SectionHeader title="Tracklist" subtitle={playable.length ? `${playable.length} playable previews` : undefined} />
        {busy ? (
          <RowSkeleton count={8} />
        ) : allTracks.length === 0 ? (
          <EmptyState title="No tracks available" />
        ) : (
          <div className="songList">
            {allTracks.map((t, i) => (
              <TrackRow
                key={t.ref}
                track={t}
                index={i}
                onPlay={() => (t.preview_url ? playTrack(t) : window.open(t.external_urls?.deezer || `https://www.deezer.com/track/${t.ref.split(":")[1]}`, "_blank"))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
