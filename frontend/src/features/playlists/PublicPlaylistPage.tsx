import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";
import { AlertIcon, PlayIcon, PlaylistIcon } from "../../components/icons";
import { EmptyState, RowSkeleton, fmtDuration } from "../../components/media";

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

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="hero">
        <div className="hero__art" style={{ display: "grid", placeItems: "center", background: "linear-gradient(145deg, var(--acc), var(--acc-2))", color: "var(--acc-contrast)" }}>
          {data?.items?.[0]?.item?.cover_url ? <img src={data.items[0].item.cover_url} alt="" /> : <PlaylistIcon size={48} />}
        </div>
        <div className="hero__meta">
          <div className="kicker">Shared playlist</div>
          <div className="hero__title">{busy ? "Loading…" : data?.name || "Playlist"}</div>
          {data?.description ? <div className="muted">{data.description}</div> : null}
          <div className="muted2" style={{ fontSize: 13 }}>{data?.items?.length || 0} tracks</div>
          <div className="row wrap gap2 mt3">
            <button className="btnPrimary" onClick={() => setQueue(queue, 0)} disabled={!queue.length}>
              <PlayIcon size={16} /> Play
            </button>
          </div>
        </div>
      </div>

      {busy ? (
        <RowSkeleton count={8} />
      ) : (data?.items || []).length === 0 ? (
        <EmptyState title="This playlist is empty" />
      ) : (
        <div className="stack" style={{ gap: 2 }}>
          {(data.items as any[]).map((it, i) => {
            const t = it?.item ? asTrack(it.item, it.ref) : null;
            const playing = t?.ref === curRef;
            return (
              <div key={it.id} className={`trackRow${playing ? " playing" : ""}`}>
                <div className="trackRow__idx">{i + 1}</div>
                <div className="trackRow__art">{t?.cover_url ? <img src={t.cover_url} alt="" /> : null}</div>
                <div className="truncate">
                  <div className="truncate" style={{ fontWeight: 650 }}>{t?.title || it.ref}</div>
                  <div className="muted truncate" style={{ fontSize: 13 }}>{t ? `${t.artist}${t.album ? ` · ${t.album}` : ""}` : ""}</div>
                </div>
                <div className="trackRow__actions" style={{ opacity: 1 }}>
                  {t?.duration_ms ? <span className="muted2" style={{ fontSize: 13 }}>{fmtDuration(t.duration_ms)}</span> : null}
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
  );
}
