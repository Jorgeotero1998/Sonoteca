import { useEffect, useState } from "react";
import { api } from "../api";

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const w = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 6;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 46px", gap: 10, alignItems: "center" }}>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 720, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
          <div className="kicker">{value}</div>
        </div>
        <div style={{ height: 10, borderRadius: 999, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${w}%`, background: "linear-gradient(90deg, rgba(30,215,96,.65), rgba(30,215,96,.20))" }} />
        </div>
      </div>
      <div className="chip" style={{ justifyContent: "center" }}>{Math.min(100, w)}%</div>
    </div>
  );
}

export function StatsView({ toast }: { toast: (m: string) => void }) {
  const [data, setData] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      setData(await api.stats.overview());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const topGenres = (data?.top_genres || []) as { genre: string; count: number }[];
  const topArtists = (data?.top_artists || []) as { artist: string; count: number }[];
  const maxGenre = Math.max(1, ...topGenres.map((x) => x.count || 0));
  const maxArtist = Math.max(1, ...topArtists.map((x) => x.count || 0));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div className="row">
          <div>
            <div className="h2">Listening insights</div>
            <div className="kicker">Spotify-style snapshot of your library</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn" onClick={refresh} disabled={busy}>
            {busy ? "..." : "Refresh"}
          </button>
          <div className="chip">songs: {data?.songs ?? "—"}</div>
          <div className="chip">playlists: {data?.playlists ?? "—"}</div>
          <div className="chip">minutes: {Math.round((data?.total_duration_sec ?? 0) / 60)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="h2">Top genres</div>
          <div className="kicker" style={{ marginTop: 6 }}>
            What you listen to most
          </div>
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gap: 12 }}>
            {topGenres.map((g) => (
              <BarRow key={g.genre} label={g.genre} value={g.count} max={maxGenre} />
            ))}
            {topGenres.length === 0 ? <div className="muted">Seed demo library to see stats.</div> : null}
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="h2">Top artists</div>
          <div className="kicker" style={{ marginTop: 6 }}>
            Your most frequent artists
          </div>
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gap: 12 }}>
            {topArtists.map((a) => (
              <BarRow key={a.artist} label={a.artist} value={a.count} max={maxArtist} />
            ))}
            {topArtists.length === 0 ? <div className="muted">Seed demo library to see stats.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

