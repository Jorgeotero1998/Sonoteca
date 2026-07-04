import { useMemo, useState } from "react";
import { setToken } from "./api";
import { AuthView } from "./views/AuthView";
import { LibraryView } from "./views/LibraryView";
import { PlaylistsView } from "./views/PlaylistsView";
import { StatsView } from "./views/StatsView";
import { PublicPlaylistView } from "./views/PublicPlaylistView";

type Route = "library" | "playlists" | "stats";

export function App() {
  const [route, setRoute] = useState<Route>("library");
  const [authed, setAuthed] = useState<boolean>(() => Boolean(localStorage.getItem("sonoteca_token")));
  const [toast, setToast] = useState<string | null>(null);

  const publicSlug = (() => {
    const url = new URL(location.href);
    return url.searchParams.get("public");
  })();

  if (publicSlug) {
    return <PublicPlaylistView slug={publicSlug} toast={(m) => setToast(m)} />;
  }

  const shell = useMemo(() => {
    return (
      <div className="container">
        <div className="glass" style={{ padding: 14 }}>
          <div className="row">
            <div>
              <div style={{ fontWeight: 760, letterSpacing: "-0.02em" }}>Sonoteca</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Music library · playlists · stats
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className={route === "library" ? "btn btnPrimary" : "btn"} onClick={() => setRoute("library")}>
                Library
              </button>
              <button className={route === "playlists" ? "btn btnPrimary" : "btn"} onClick={() => setRoute("playlists")}>
                Playlists
              </button>
              <button className={route === "stats" ? "btn btnPrimary" : "btn"} onClick={() => setRoute("stats")}>
                Stats
              </button>
              <button
                className="btn"
                onClick={() => {
                  setToken(null);
                  setAuthed(false);
                }}
              >
                Logout
              </button>
            </div>
          </div>

          {toast ? (
            <div style={{ marginTop: 12 }} className="pill">
              <span>{toast}</span>
              <button className="btn" style={{ padding: "6px 10px" }} onClick={() => setToast(null)}>
                OK
              </button>
            </div>
          ) : null}

          <div style={{ height: 12 }} />
          {route === "library" ? <LibraryView toast={setToast} /> : null}
          {route === "playlists" ? <PlaylistsView toast={setToast} /> : null}
          {route === "stats" ? <StatsView toast={setToast} /> : null}
        </div>
      </div>
    );
  }, [route, toast]);

  if (!authed) {
    return (
      <AuthView
        onAuthed={() => setAuthed(true)}
        toast={setToast}
      />
    );
  }

  return shell;
}

