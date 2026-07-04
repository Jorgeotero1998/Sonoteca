import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { PlayerBar } from "../features/player/PlayerBar";
import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { BackendStatusBanner } from "./BackendStatusBanner";

export function Layout() {
  const token = useAuthStore((s) => s.token);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!token && !loc.pathname.startsWith("/public")) {
      nav("/auth", { replace: true });
    }
  }, [token, loc.pathname, nav]);

  return (
    <>
      <BackendStatusBanner />
      <Outlet />
      <div style={{ height: 96 }} />
      <PlayerBar />
    </>
  );
}

