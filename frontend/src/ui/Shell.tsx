import { ReactNode } from "react";

export type Route = "home" | "library" | "playlists" | "stats";

export function Shell({
  route,
  setRoute,
  topLeft,
  topRight,
  children,
  playerLeft,
  playerRight,
}: {
  route: Route;
  setRoute: (r: Route) => void;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  children: ReactNode;
  playerLeft?: ReactNode;
  playerRight?: ReactNode;
}) {
  return (
    <div className="appShell">
      <aside className="side">
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "grid" }}>
                <div style={{ fontWeight: 900, letterSpacing: "-0.03em", fontSize: 20 }}>Sonoteca</div>
                <div className="kicker">Your music library</div>
              </div>
              <div className="chip" style={{ borderColor: "rgba(30,215,96,.22)", color: "rgba(255,255,255,.86)" }}>
                Pro demo
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 10 }}>
            <button
              className={`navItem ${route === "home" ? "navItemActive" : ""}`}
              onClick={() => setRoute("home")}
            >
              <span>Home</span>
              <span className="kicker">Browse</span>
            </button>
            <button
              className={`navItem ${route === "library" ? "navItemActive" : ""}`}
              onClick={() => setRoute("library")}
            >
              <span>Library</span>
              <span className="kicker">Songs</span>
            </button>
            <button
              className={`navItem ${route === "playlists" ? "navItemActive" : ""}`}
              onClick={() => setRoute("playlists")}
            >
              <span>Playlists</span>
              <span className="kicker">Curate</span>
            </button>
            <button
              className={`navItem ${route === "stats" ? "navItemActive" : ""}`}
              onClick={() => setRoute("stats")}
            >
              <span>Stats</span>
              <span className="kicker">Insights</span>
            </button>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <div className="kicker">Tip</div>
            <div style={{ marginTop: 8, color: "rgba(255,255,255,.86)", fontSize: 13, lineHeight: 1.35 }}>
              Use <b>Seed demo library</b> to generate artists, albums, genres, years + cover art.
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            {topLeft ?? <div className="h1">Browse</div>}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{topRight}</div>
        </div>
        <div className="content">{children}</div>
      </main>

      <footer className="player">
        <div style={{ minWidth: 0 }}>{playerLeft}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{playerRight}</div>
      </footer>
    </div>
  );
}

