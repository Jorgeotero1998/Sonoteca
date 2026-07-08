import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";
import { EmptyState, RowSkeleton, SectionHeader, TrackRow } from "../../components/media";
import { PageHero } from "../../components/PageHero";
import { ClockIcon, HeartIcon, LibraryIcon, PlayIcon } from "../../components/icons";

type Tab = "favorites" | "saved" | "history";

function toTrack(r: any): Track {
  const x = r.item || r;
  return {
    ref: r.ref || x.ref,
    title: x.title,
    artist: x.artist,
    album: x.album,
    cover_url: x.cover_url,
    duration_ms: x.duration_ms,
    preview_url: x.preview_url,
    external_urls: x.external_urls,
  };
}

const META: Record<Tab, { title: string; subtitle: string; icon: React.ReactNode }> = {
  favorites: { title: "Liked Songs", subtitle: "Tracks you've saved to favorites", icon: <HeartIcon size={32} filled /> },
  saved: { title: "Saved", subtitle: "Everything you've added to your library", icon: <LibraryIcon size={32} /> },
  history: { title: "Recently Played", subtitle: "Your listening history", icon: <ClockIcon size={32} /> },
};

export function LibraryPage() {
  const setQueue = usePlayerStore((s) => s.setQueue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const curRef = usePlayerStore((s) => s.queue[s.idx]?.ref);
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("favorites");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  const tracks = useMemo(() => rows.map(toTrack), [rows]);
  const playable = useMemo(() => tracks.filter((t) => t.preview_url), [tracks]);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    (async () => {
      try {
        const data = tab === "favorites" ? await sonotecaApi.me.favorites() : tab === "saved" ? await sonotecaApi.me.library() : await sonotecaApi.me.history(80);
        if (!cancelled) setRows(data || []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  function playTrack(t: Track) {
    if (t.ref === curRef) return togglePlay();
    const start = playable.findIndex((x) => x.ref === t.ref);
    setQueue(playable, start < 0 ? 0 : start);
  }

  const meta = META[tab];

  return (
    <div className="page page--flush">
      <PageHero
        type="Your Library"
        title={meta.title}
        subtitle={meta.subtitle}
        fallback={meta.icon}
        actions={
          <button className="btn btn--primary" onClick={() => setQueue(playable, 0)} disabled={!playable.length}>
            <PlayIcon size={16} /> Play all
          </button>
        }
      />

      <div className="page__body">
        <div className="segControl">
          {(["favorites", "saved", "history"] as Tab[]).map((t) => (
            <button key={t} className={`segControl__btn${tab === t ? " segControl__btn--active" : ""}`} onClick={() => setTab(t)}>
              {t === "favorites" ? "Liked" : t === "saved" ? "Saved" : "History"}
            </button>
          ))}
        </div>

        <SectionHeader title={meta.title} subtitle={busy ? "Loading…" : `${tracks.length} track${tracks.length === 1 ? "" : "s"}`} />

        {busy ? (
          <RowSkeleton count={8} />
        ) : tracks.length === 0 ? (
          <EmptyState
            icon={meta.icon}
            title={tab === "favorites" ? "No liked songs yet" : tab === "saved" ? "Your library is empty" : "Nothing played yet"}
            hint={tab === "history" ? "Play a preview and it'll show up here." : "Tap the heart on any track to save it here."}
            action={
              <button className="btn" onClick={() => nav("/search")}>
                Find something to play
              </button>
            }
          />
        ) : (
          <div className="songList">
            {tracks.map((t, i) => (
              <TrackRow
                key={`${t.ref}-${i}`}
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
