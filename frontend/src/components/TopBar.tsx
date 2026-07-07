import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useUIStore } from "../store/uiStore";
import { useAuthStore } from "../store/authStore";
import { useFavoritesStore } from "../store/favoritesStore";
import { usePlaylistsStore } from "../store/playlistsStore";
import { ChevronLeftIcon, ChevronRightIcon, LogoutIcon, MenuIcon, SearchIcon } from "./icons";

export function TopBar() {
  const nav = useNavigate();
  const loc = useLocation();
  const [sp] = useSearchParams();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const logout = useAuthStore((s) => s.logout);
  const token = useAuthStore((s) => s.token);
  const resetFav = useFavoritesStore((s) => s.reset);
  const resetPls = usePlaylistsStore((s) => s.reset);

  const onSearch = loc.pathname === "/search";
  const [q, setQ] = useState(sp.get("q") || "");

  useEffect(() => {
    if (onSearch) setQ(sp.get("q") || "");
  }, [sp, onSearch]);

  function submit(value: string) {
    setQ(value);
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    nav(`/search${params.toString() ? `?${params}` : ""}`, { replace: onSearch });
  }

  function doLogout() {
    logout();
    resetFav();
    resetPls();
    nav("/auth", { replace: true });
  }

  return (
    <header className="topbar">
      <button className="iconBtn ghost menuBtn" aria-label="Open menu" onClick={toggleSidebar}>
        <MenuIcon size={20} />
      </button>
      <div className="row gap2" style={{ flex: "0 0 auto" }}>
        <button className="iconBtn" aria-label="Go back" onClick={() => nav(-1)}>
          <ChevronLeftIcon size={20} />
        </button>
        <button className="iconBtn" aria-label="Go forward" onClick={() => nav(1)}>
          <ChevronRightIcon size={20} />
        </button>
      </div>

      <div className="topbar__search">
        <SearchIcon size={18} />
        <input
          className="input pill"
          type="search"
          value={q}
          placeholder="Search songs, artists, albums…"
          aria-label="Search"
          onChange={(e) => {
            setQ(e.target.value);
            if (onSearch) submit(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit(q);
          }}
        />
      </div>

      <div className="topbar__spacer" />

      {token ? (
        <button className="btn" onClick={doLogout} title="Log out">
          <LogoutIcon size={16} />
          <span className="hideMobile">Log out</span>
        </button>
      ) : (
        <button className="btnPrimary" onClick={() => nav("/auth")}>Sign in</button>
      )}
    </header>
  );
}
