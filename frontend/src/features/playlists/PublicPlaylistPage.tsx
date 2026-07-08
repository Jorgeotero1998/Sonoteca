import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";
import { AlertIcon, PlayIcon, PlaylistIcon } from "../../components/icons";
import { EmptyState, RowSkeleton, fmtDuration } from "../../components/media";
import { PageHero } from "../../components/PageHero";

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

export function PublicPlaylistPage() {
  const { slug } = useParams();
  const setQueue = usePlayerStore((s) => s.setQueue);
  const curRef = usePlayerStore((s) => s.queue[s.idx]?.ref);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const [data, setData] = useState<any | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setBusy(true);
    (async () => {
      try {
        const d = await sonotecaApi.playlists.public(slug);
        if (!cancelled) setData(d);
      } catch {
        if (!cancelled) setErr(true);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const queue = useMemo(() => {
    const items = (data?.items || []).map((it: any) => (it?.item ? asTrack(it.item, it.ref) : null));
    return items.filter((x: any) => x && x.preview_url) as Track[];
  }, [data]);

  function playItem(t: Track) {
    if (t.ref === curRef) return togglePlay();
    const start = queue.findIndex((x) => x.ref === t.ref);
    setQueue(queue, start < 0 ? 0 : start);
  }

  if (err) return <EmptyState icon={<AlertIcon size={28} />} title="Playlist unavailable" hint="This playlist is private or no longer exists." />;

  const coverUrl = data?.items?.[0]?.item?.cover_url;

  return (
    <div className="page page--flush">
      <PageHero
        type="Shared playlist"
        title={busy ? "Loading…" : data?.name || "Playlist"}
        subtitle={
          <>
            {data?.description ? <span>{data.description}</span> : null}
            <span>{data?.items?.length || 0} tracks</span>
          </>
        }
        imageUrl={coverUrl}
        fallback={<PlaylistIcon size={48} />}
        actions={
          <button className="btn btn--primary" onClick={() => setQueue(queue, 0)} disabled={!queue.length}>
            <PlayIcon size={16} /> Play
          </button>
        }
      />

      <div className="page__body">
        {busy ? (
          <RowSkeleton count={8} />
        ) : (data?.items || []).length === 0 ? (
          <EmptyState title="This playlist is empty" />
        ) : (
          <div className="songList">
            {(data.items as any[]).map((it, i) => {
              const t = it?.item ? asTrack(it.item, it.ref) : null;
              const playing = t?.ref === curRef;
              return (
                <div key={it.id} className={`songRow${playing ? " songRow--active" : ""}`}>
                  <div className="songRow__num">{i + 1}</div>
                  <div className="songRow__thumb">{t?.cover_url ? <img src={t.cover_url} alt="" /> : null}</div>
                  <div className="songRow__info truncate">
                    <div className="songRow__title truncate">{t?.title || it.ref}</div>
                    <div className="songRow__artist truncate">{t ? `${t.artist}${t.album ? ` · ${t.album}` : ""}` : ""}</div>
                  </div>
                  <div className="songRow__end">
                    {t?.duration_ms ? <span className="songRow__dur">{fmtDuration(t.duration_ms)}</span> : null}
                    {t?.preview_url ? (
                      <button className="iconBtn ghost" aria-label="Play" onClick={() => playItem(t)}>
                        <PlayIcon size={16} />
                      </button>
                    ) : null}
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
