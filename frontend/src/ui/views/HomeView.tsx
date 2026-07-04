import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

function pickCover(songs: any[]) {
  const first = songs.find((s) => s.cover_url) || songs[0];
  return first?.cover_url || null;
}

export function HomeView({ toast, onPlay }: { toast: (m: string) => void; onPlay: (s: any, q?: any[]) => void }) {
  const [songs, setSongs] = useState<any[]>([]);
  const [facets, setFacets] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const out = await api.catalog.charts({ limit: "30" });
      setSongs(out.tracks || []);
      setFacets(out);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const byAlbum = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const s of songs) {
      const key = s.album || "Singles";
      m.set(key, [...(m.get(key) || []), s]);
    }
    return [...m.entries()]
      .map(([name, items]) => ({ name, items, cover: pickCover(items), artist: items[0]?.artist }))
      .slice(0, 12);
  }, [songs]);

  const byArtist = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const s of songs) m.set(s.artist, [...(m.get(s.artist) || []), s]);
    return [...m.entries()]
      .map(([name, items]) => ({ name, items, cover: pickCover(items) }))
      .slice(0, 12);
  }, [songs]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div className="row">
          <div>
            <div className="h1">Good afternoon</div>
            <div className="kicker">Trending charts from Deezer (real previews + covers).</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={refresh} disabled={busy}>
              {busy ? "..." : "Refresh"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span className="chip">Songs: {songs.length}</span>
          <span className="chip">Top artists: {facets?.artists?.length ?? "—"}</span>
          <span className="chip">Top albums: {facets?.albums?.length ?? "—"}</span>
        </div>
      </div>

      <Section title="Albums">
        <Grid>
          {byAlbum.map((a) => (
            <div key={a.name} className="tile" style={{ padding: 12 }}>
              <div className="cover">{a.cover ? <img src={a.cover} alt="" /> : null}</div>
              <div style={{ height: 10 }} />
              <div style={{ fontWeight: 780, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {a.name}
              </div>
              <div className="kicker" style={{ marginTop: 6 }}>
                {a.artist ?? "Various"}
              </div>
              <div style={{ height: 10 }} />
              <button
                className="btn btnPrimary"
                onClick={() => onPlay(a.items.find((x: any) => x?.preview_url || x?.audio_url) ?? a.items[0], a.items)}
                disabled={!a.items?.some((x: any) => x?.preview_url || x?.audio_url)}
              >
                Play
              </button>
            </div>
          ))}
        </Grid>
      </Section>

      <Section title="Artists">
        <Grid>
          {byArtist.map((a) => (
            <div key={a.name} className="tile" style={{ padding: 12 }}>
              <div className="cover" style={{ borderRadius: 999 }}>
                {a.cover ? <img src={a.cover} alt="" /> : null}
              </div>
              <div style={{ height: 10 }} />
              <div style={{ fontWeight: 780, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {a.name}
              </div>
              <div className="kicker" style={{ marginTop: 6 }}>
                Artist
              </div>
              <div style={{ height: 10 }} />
              <button
                className="btn btnPrimary"
                onClick={() => onPlay(a.items.find((x: any) => x?.preview_url || x?.audio_url) ?? a.items[0], a.items)}
                disabled={!a.items?.some((x: any) => x?.preview_url || x?.audio_url)}
              >
                Play
              </button>
            </div>
          ))}
        </Grid>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="row">
        <div className="h2">{title}</div>
        <div className="kicker">Curated from your library</div>
      </div>
      {children}
    </div>
  );
}

function Grid({ children }: { children: any }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

