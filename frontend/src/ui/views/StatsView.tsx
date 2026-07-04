import { useEffect, useState } from "react";
import { api } from "../api";

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

  return (
    <div className="grid3">
      <div className="card" style={{ padding: 16 }}>
        <div className="row">
          <div style={{ fontWeight: 760, letterSpacing: "-0.02em" }}>Overview</div>
          <button className="btn" onClick={refresh} disabled={busy}>
            {busy ? "..." : "Refresh"}
          </button>
        </div>
        <div style={{ height: 10 }} />
        <div className="pill">songs: {data?.songs ?? "—"}</div>
        <div style={{ height: 8 }} />
        <div className="pill">playlists: {data?.playlists ?? "—"}</div>
        <div style={{ height: 8 }} />
        <div className="pill">duration: {Math.round((data?.total_duration_sec ?? 0) / 60)} min</div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 760, letterSpacing: "-0.02em" }}>Top genres</div>
        <div style={{ height: 10 }} />
        <div style={{ display: "grid", gap: 10 }}>
          {(data?.top_genres || []).map((g: any) => (
            <div key={g.genre} className="pill">
              <span>{g.genre}</span>
              <span className="muted">({g.count})</span>
            </div>
          ))}
          {(data?.top_genres || []).length === 0 ? <div className="muted">—</div> : null}
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 760, letterSpacing: "-0.02em" }}>Top artists</div>
        <div style={{ height: 10 }} />
        <div style={{ display: "grid", gap: 10 }}>
          {(data?.top_artists || []).map((a: any) => (
            <div key={a.artist} className="pill">
              <span>{a.artist}</span>
              <span className="muted">({a.count})</span>
            </div>
          ))}
          {(data?.top_artists || []).length === 0 ? <div className="muted">—</div> : null}
        </div>
      </div>
    </div>
  );
}

