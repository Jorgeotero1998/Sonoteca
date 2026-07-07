import { NavLink, useNavigate } from "react-router-dom";
import { useUIStore } from "../store/uiStore";
import { usePlaylistsStore } from "../store/playlistsStore";
import { useAuthStore } from "../store/authStore";
import { CloseIcon, HomeIcon, LibraryIcon, MusicIcon, PlaylistIcon, PlusIcon, SearchIcon } from "./icons";

const NAV = [
  { to: "/", label: "Home", icon: HomeIcon, end: true },
  { to: "/search", label: "Search", icon: SearchIcon },
  { to: "/library", label: "Your Library", icon: LibraryIcon },
  { to: "/playlists", label: "Playlists", icon: PlaylistIcon },
];

export function Sidebar() {
  const nav = useNavigate();
  const setSidebar = useUIStore((s) => s.setSidebar);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const playlists = usePlaylistsStore((s) => s.list);
  const loaded = usePlaylistsStore((s) => s.loaded);
  const token = useAuthStore((s) => s.token);

  function go(to: string) {
    nav(to);
    setSidebar(false);
  }

  return (
    <aside className={`sidebar${sidebarOpen ? " open" : ""}`} aria-label="Primary">
      <div className="sidebar__block">
        <div className="rowBetween">
          <button className="brand" onClick={() => go("/")} style={{ border: "none", background: "none", cursor: "pointer", color: "inherit" }}>
            <div className="logo">S</div>
            <div style={{ textAlign: "left" }}>
              <div className="brandName">Sonoteca</div>
              <div className="brandTag">Music Library</div>
            </div>
          </button>
          <button className="iconBtn ghost sidebar__mobileClose" aria-label="Close menu" onClick={() => setSidebar(false)}>
            <CloseIcon size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `navItem${isActive ? " active" : ""}`}
              onClick={() => setSidebar(false)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar__block sidebar__library">
        <div className="sidebar__libraryHead">
          <div className="kicker">Playlists</div>
          <button className="iconBtn ghost" style={{ width: 30, height: 30 }} aria-label="New playlist" onClick={() => go("/playlists")}>
            <PlusIcon size={18} />
          </button>
        </div>

        <div className="sidebar__scroll">
          {!token ? (
            <div className="muted2" style={{ fontSize: 13, padding: "8px 4px" }}>Sign in to see your playlists.</div>
          ) : !loaded ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="plItem" aria-hidden>
                <div className="plItem__art skeleton" />
                <div style={{ flex: 1 }}>
                  <div className="skeleton skLine" style={{ width: "70%", marginTop: 0 }} />
                  <div className="skeleton skLine" style={{ width: "40%" }} />
                </div>
              </div>
            ))
          ) : playlists.length === 0 ? (
            <div className="muted2" style={{ fontSize: 13, padding: "8px 4px" }}>No playlists yet — create your first one.</div>
          ) : (
            playlists.map((p) => (
              <button key={p.id} className="plItem" onClick={() => go(`/playlists?id=${p.id}`)}>
                <div className="plItem__art">
                  {p.cover_url ? <img src={p.cover_url} alt="" /> : <MusicIcon size={18} />}
                </div>
                <div style={{ minWidth: 0, textAlign: "left" }}>
                  <div className="truncate" style={{ fontWeight: 650, fontSize: 14, color: "var(--text)" }}>{p.name}</div>
                  <div className="truncate muted2" style={{ fontSize: 12 }}>
                    Playlist{p.is_public ? " · Public" : ""}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
