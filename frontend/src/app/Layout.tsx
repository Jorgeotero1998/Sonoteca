import { lazy, Suspense, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PlayerBar } from "../features/player/PlayerBar";
import { Sidebar } from "../components/Sidebar";
import { TopBar } from "../components/TopBar";
import { MobileNav } from "../components/MobileNav";
import { Toaster } from "../components/Toaster";
import { PageTransition } from "../components/PageTransition";
import { BackendStatusBanner } from "./BackendStatusBanner";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useFavoritesStore } from "../store/favoritesStore";
import { usePlaylistsStore } from "../store/playlistsStore";

const AmbientMesh = lazy(() => import("../components/AmbientMesh").then((m) => ({ default: m.AmbientMesh })));

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

  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [loc.pathname]);

  return (
    <div className="app">
      <Suspense fallback={null}>
        <AmbientMesh />
      </Suspense>

      <div className="appShell">
        <Sidebar />
        <div className="mainCol">
          <TopBar />
          <div className="content" ref={contentRef}>
            <div className="contentInner">
              <PageTransition />
            </div>
          </div>
        </div>
        <PlayerBar />
        <MobileNav />
      </div>

      {sidebarOpen ? <div className="drawerScrim hideDesktop" onClick={() => setSidebar(false)} aria-hidden /> : null}

      <BackendStatusBanner />
      <Toaster />
    </div>
  );
}
