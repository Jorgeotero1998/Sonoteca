import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { PlayerBar } from "../features/player/PlayerBar";
import { Sidebar } from "../components/Sidebar";
import { TopBar } from "../components/TopBar";
import { MobileNav } from "../components/MobileNav";
import { Toaster } from "../components/Toaster";
import { BackendStatusBanner } from "./BackendStatusBanner";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useFavoritesStore } from "../store/favoritesStore";
import { usePlaylistsStore } from "../store/playlistsStore";

export function Layout() {
  const token = useAuthStore((s) => s.token);
  const nav = useNavigate();
  const loc = useLocation();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebar = useUIStore((s) => s.setSidebar);
  const loadFav = useFavoritesStore((s) => s.load);
  const refreshPls = usePlaylistsStore((s) => s.refresh);

  const isPublic = loc.pathname.startsWith("/public");

  useEffect(() => {
    if (!token && !isPublic) nav("/auth", { replace: true });
  }, [token, isPublic, nav]);

  useEffect(() => {
    if (token) {
      loadFav();
      refreshPls();
    }
  }, [token, loadFav, refreshPls]);

  // Close mobile drawer on route change.
  useEffect(() => {
    setSidebar(false);
  }, [loc.pathname, setSidebar]);

  const contentRef = (el: HTMLDivElement | null) => {
    if (el) el.scrollTop = 0;
  };

  return (
    <div className="app">
      <Sidebar />
      {sidebarOpen ? <div className="drawerScrim hideDesktop" onClick={() => setSidebar(false)} aria-hidden /> : null}

      <div className="mainCol">
        <TopBar />
        <div className="content" key={loc.pathname} ref={contentRef}>
          <div className="contentInner">
            <Outlet />
          </div>
        </div>
      </div>

      <PlayerBar />
      <MobileNav />

      <BackendStatusBanner />
      <Toaster />
    </div>
  );
}
