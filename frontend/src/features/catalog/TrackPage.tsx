import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { useIsCurrent } from "../../components/media";
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
  const [t, setT] = useState<any | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(false);
  const favHas = useFavoritesStore((s) => (t?.ref ? s.refs.has(t.ref) : false));
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const { isCurrent, isPlaying } = useIsCurrent(t?.ref);

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

  if (err) return <div className="stateBox"><div className="stateBox__icon"><AlertIcon size={26} /></div><div className="h2">Track not found</div><button className="btn" onClick={() => nav("/")}>Back home</button></div>;

  function play() {
    if (!track) return;
    if (isCurrent) togglePlay();
    else setQueue([track], 0);
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="hero">
        <div className="hero__art">
          {track?.cover_url ? <img src={track.cover_url} alt="" /> : <div className="skeleton" style={{ width: "100%", height: "100%" }} />}
        </div>
        <div className="hero__meta">
          <div className="kicker">Song</div>
          <div className="hero__title">{track?.title || (busy ? "Loading…" : "")}</div>
          <div className="muted">
            {track?.artist}
            {track?.album ? ` · ${track.album}` : ""}
          </div>
          <div className="row wrap gap2 mt3">
            {track?.preview_url ? (
              <button className="btnPrimary" onClick={play}>
                {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />} {isPlaying ? "Pause" : "Play preview"}
              </button>
            ) : (
              <button className="btnPrimary" disabled>No preview</button>
            )}
            {canFav ? (
              <button className={`btn${favHas ? "" : ""}`} onClick={() => track && toggleFav(track.ref, track.title)}>
                <HeartIcon size={16} filled={favHas} /> {favHas ? "Liked" : "Like"}
              </button>
            ) : null}
            {track?.external_urls?.deezer ? (
              <a className="btn" href={track.external_urls.deezer} target="_blank" rel="noreferrer">
                <ExternalIcon size={16} /> Deezer
              </a>
            ) : null}
          </div>
          {track?.album ? (
            <div className="mt3">
              <Link className="chip" to={`/search?q=${encodeURIComponent(track.artist)}&tab=artist`}>More from {track.artist}</Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
