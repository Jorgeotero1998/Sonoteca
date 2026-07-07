import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { usePlayerStore, type Track } from "../../store/playerStore";
import { GridSkeleton, MediaCard, SectionHeader, useIsCurrent } from "../../components/media";
import { MotionGrid, motionCard } from "../../components/motion";
import { motion } from "framer-motion";
import { PlayIcon } from "../../components/icons";

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

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function ChartCard({ track, queue }: { track: Track; queue: Track[] }) {
  const setQueue = usePlayerStore((s) => s.setQueue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const nav = useNavigate();
  const { isCurrent, isPlaying } = useIsCurrent(track.ref);
  return (
    <motion.div variants={motionCard}>
      <MediaCard
        title={track.title}
        subtitle={track.artist}
        imageUrl={track.cover_url}
        playing={isPlaying}
        onOpen={() => nav(`/track/${encodeURIComponent(track.ref)}`)}
        onPlay={
          track.preview_url
            ? () => {
                if (isCurrent) togglePlay();
                else {
                  const start = queue.findIndex((t) => t.ref === track.ref);
                  setQueue(queue, start < 0 ? 0 : start);
                }
              }
            : undefined
        }
      />
    </motion.div>
  );
}

export function HomePage() {
  const setQueue = usePlayerStore((s) => s.setQueue);
  const nav = useNavigate();
  const [charts, setCharts] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [relLoading, setRelLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [chartsIndex, setChartsIndex] = useState(0);
  const [relIndex, setRelIndex] = useState(0);
  const [chartsMore, setChartsMore] = useState(true);
  const [relMore, setRelMore] = useState(true);
  const chartsSentinel = useRef<HTMLDivElement | null>(null);
  const relSentinel = useRef<HTMLDivElement | null>(null);

  const playable = useMemo(() => charts.map(asTrack).filter((t) => t.preview_url), [charts]);

  const loadCharts = useCallback(
    async (reset = false) => {
      setBusy(true);
      try {
        const index = reset ? 0 : chartsIndex;
        const out = await sonotecaApi.catalog.charts({ limit: "30", index: String(index) });
        const items = out.tracks || [];
        setCharts((prev) => (reset ? items : [...prev, ...items]));
        setChartsMore(items.length > 0);
        setChartsIndex(index + items.length);
      } finally {
        setBusy(false);
        setChartsLoading(false);
      }
    },
    [chartsIndex]
  );

  const loadReleases = useCallback(
    async (reset = false) => {
      try {
        const index = reset ? 0 : relIndex;
        const out = await sonotecaApi.catalog.newReleases({ limit: "24", index: String(index) });
        const items = out.items || [];
        setReleases((prev) => (reset ? items : [...prev, ...items]));
        setRelMore(items.length > 0);
        setRelIndex(index + items.length);
      } finally {
        setRelLoading(false);
      }
    },
    [relIndex]
  );

  useEffect(() => {
    loadCharts(true);
    loadReleases(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = chartsSentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && chartsMore && !busy && loadCharts(false), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [chartsMore, busy, loadCharts]);

  useEffect(() => {
    const el = relSentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && relMore && loadReleases(false), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [relMore, loadReleases]);

  return (
    <div className="stack" style={{ gap: 8 }}>
      <section className="editorialHero">
        <div className="editorialHero__copy">
          <span className="eyebrow">Sonoteca · Deezer catalog</span>
          <h1 className="display">{greeting()}</h1>
          <p className="lede">
            Charts, fresh releases, and your library — every track with a 30-second preview.
          </p>
          {playable.length ? (
            <button
              className="btnPrimary"
              style={{ marginTop: 20 }}
              onClick={() => setQueue(playable, 0)}
            >
              <PlayIcon size={16} /> Start listening
            </button>
          ) : null}
        </div>
        {charts[0]?.cover_url ? (
          <div className="editorialHero__art" aria-hidden>
            <img src={charts[0].cover_url} alt="" />
          </div>
        ) : null}
      </section>

      <SectionHeader
        title="Top Charts"
        subtitle="What the world is listening to right now"
        action={
          <button className="btnPrimary" onClick={() => setQueue(playable, 0)} disabled={!playable.length}>
            <PlayIcon size={16} /> Play all
          </button>
        }
      />
      {chartsLoading ? (
        <GridSkeleton count={12} />
      ) : (
        <MotionGrid>
          {charts.map((c) => (
            <ChartCard key={c.ref} track={asTrack(c)} queue={playable} />
          ))}
        </MotionGrid>
      )}
      <div ref={chartsSentinel} style={{ height: 1 }} />

      <SectionHeader title="New Releases" subtitle="Fresh albums picked by Deezer editors" />
      {relLoading ? (
        <GridSkeleton count={12} />
      ) : (
        <MotionGrid>
          {releases.map((a) => (
            <motion.div key={a.ref} variants={motionCard}>
              <MediaCard
                title={a.title}
                subtitle={a.artist}
                imageUrl={a.cover_url}
                onOpen={() => nav(`/album/${encodeURIComponent(a.ref)}`)}
              />
            </motion.div>
          ))}
        </MotionGrid>
      )}
      <div ref={relSentinel} style={{ height: 1 }} />
      {busy || relLoading ? <div className="muted2" style={{ padding: "16px 4px", fontSize: 13 }}>Loading more…</div> : null}
    </div>
  );
}
