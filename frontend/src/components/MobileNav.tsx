import { NavLink } from "react-router-dom";
import { HomeIcon, LibraryIcon, PlaylistIcon, SearchIcon } from "./icons";

const NAV = [
  { to: "/", label: "Home", icon: HomeIcon, end: true },
  { to: "/search", label: "Search", icon: SearchIcon },
  { to: "/library", label: "Library", icon: LibraryIcon },
  { to: "/playlists", label: "Lists", icon: PlaylistIcon },
];

export function MobileNav() {
  return (
    <nav className="tabDock" aria-label="Primary mobile">
      <div className="tabDock__pill">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `tabDock__item${isActive ? " tabDock__item--active" : ""}`}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
