import { NavLink, useNavigate } from "react-router-dom";
import { useUIStore } from "../store/uiStore";
import { usePlaylistsStore } from "../store/playlistsStore";
import { useAuthStore } from "../store/authStore";
import { CloseIcon, HomeIcon, LibraryIcon, MusicIcon, PlaylistIcon, PlusIcon, SearchIcon } from "./icons";

const NAV = [
  { to: "/", label: "Home", icon: HomeIcon, end: true },
  { to: "/search", label: "Search", icon: SearchIcon },
  { to: "/library", label: "Library", icon: LibraryIcon },
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
    <aside className={`rail${sidebarOpen ? " rail--open" : ""}`} aria-label="Primary">
      <div className="rail__top">
        <button className="rail__brand" onClick={() => go("/")} aria-label="Sonoteca home">
          <span className="rail__logo">S</span>
          <span className="rail__wordmark">
            <span className="rail__name">Sonoteca</span>
            <span className="rail__tag">Music</span>
          </span>
        </button>
        <button className="iconBtn ghost rail__close hideDesktop" aria-label="Close menu" onClick={() => setSidebar(false)}>
          <CloseIcon size={18} />
        </button>
      </div>

      <nav className="rail__nav">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `rail__link${isActive ? " rail__link--active" : ""}`}
            onClick={() => setSidebar(false)}
            title={label}
          >
            <span className="rail__linkIcon">
              <Icon size={22} />
            </span>
            <span className="rail__linkLabel">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="rail__library">
        <div className="rail__libraryHead">
          <span className="rail__sectionLabel">Your playlists</span>
          <button className="iconBtn ghost rail__addBtn" aria-label="New playlist" onClick={() => go("/playlists")}>
            <PlusIcon size={16} />
          </button>
        </div>

        <div className="rail__scroll">
          {!token ? (
            <p className="rail__empty">Sign in to see playlists</p>
          ) : !loaded ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rail__pl" aria-hidden>
                <div className="rail__plArt skeleton" />
                <div className="rail__plText">
                  <div className="skeleton skLine" style={{ width: "72%", marginTop: 0 }} />
                  <div className="skeleton skLine" style={{ width: "45%" }} />
                </div>
              </div>
            ))
          ) : playlists.length === 0 ? (
            <p className="rail__empty">No playlists yet</p>
          ) : (
            playlists.map((p) => (
              <button key={p.id} className="rail__pl" onClick={() => go(`/playlists?id=${p.id}`)}>
                <div className="rail__plArt">
                  {p.cover_url ? <img src={p.cover_url} alt="" /> : <MusicIcon size={16} />}
                </div>
                <div className="rail__plText">
                  <span className="rail__plName truncate">{p.name}</span>
                  <span className="rail__plMeta truncate">{p.is_public ? "Public" : "Private"}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
