import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { EmptyState } from "../../components/media";
import { PageHero } from "../../components/PageHero";
import { AlertIcon, ExternalIcon, HeartIcon, PauseIcon, PlayIcon } from "../../components/icons";

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

export function TrackPage() {
  const { ref } = useParams();
  const nav = useNavigate();
  const setQueue = usePlayerStore((s) => s.setQueue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const curRef = usePlayerStore((s) => s.queue[s.idx]?.ref);
  const [t, setT] = useState<any | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(false);
  const favHas = useFavoritesStore((s) => (t?.ref ? s.refs.has(t.ref) : false));
  const toggleFav = useFavoritesStore((s) => s.toggle);

  const isCurrent = Boolean(t?.ref) && curRef === t?.ref;

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    setBusy(true);
    setErr(false);
    (async () => {
      try {
        const data = await sonotecaApi.catalog.track(decodeURIComponent(ref));
        if (!cancelled) setT(data);
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

  const track = t ? asTrack(t) : null;
  const canFav = Boolean(track?.ref?.startsWith("deezer:"));

  if (err) return <EmptyState icon={<AlertIcon size={28} />} title="Track not found" hint="This track could not be loaded." action={<button className="btn" onClick={() => nav("/")}>Back home</button>} />;

  function play() {
    if (!track) return;
    if (isCurrent) togglePlay();
    else setQueue([track], 0);
  }

  const subtitle = [track?.artist, track?.album].filter(Boolean).join(" · ");

  return (
    <div className="page page--flush">
      <PageHero
        type="Song"
        title={track?.title || (busy ? "Loading…" : "")}
        subtitle={subtitle}
        imageUrl={track?.cover_url}
        actions={
          <>
            {track?.preview_url ? (
              <button className="btn btn--primary" onClick={play}>
                {isCurrent && isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                {isCurrent && isPlaying ? "Pause" : "Play preview"}
              </button>
            ) : (
              <button className="btn btn--primary" disabled>
                No preview
              </button>
            )}
            {canFav ? (
              <button className="btn" onClick={() => track && toggleFav(track.ref, track.title)}>
                <HeartIcon size={16} filled={favHas} /> {favHas ? "Liked" : "Like"}
              </button>
            ) : null}
            {track?.external_urls?.deezer ? (
              <a className="btn" href={track.external_urls.deezer} target="_blank" rel="noreferrer">
                <ExternalIcon size={16} /> Deezer
              </a>
            ) : null}
          </>
        }
      >
        {track?.artist ? (
          <Link className="badge" to={`/search?q=${encodeURIComponent(track.artist)}&tab=artist`}>
            More from {track.artist}
          </Link>
        ) : null}
      </PageHero>
    </div>
  );
}
