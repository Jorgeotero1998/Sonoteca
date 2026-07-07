import { NavLink } from "react-router-dom";
import { HomeIcon, LibraryIcon, PlaylistIcon, SearchIcon } from "./icons";

const NAV = [
  { to: "/", label: "Home", icon: HomeIcon, end: true },
  { to: "/search", label: "Search", icon: SearchIcon },
  { to: "/library", label: "Library", icon: LibraryIcon },
  { to: "/playlists", label: "Playlists", icon: PlaylistIcon },
];

export function MobileNav() {
  return (
    <nav className="mobileNav" aria-label="Primary mobile">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `mobileNav__item navItem${isActive ? " active" : ""}`}>
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
