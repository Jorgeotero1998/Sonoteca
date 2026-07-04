import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../services/api/client";

type Health = "checking" | "up" | "down";

export function BackendStatusBanner() {
  const [health, setHealth] = useState<Health>("checking");
  const [detail, setDetail] = useState<string | null>(null);

  const label = useMemo(() => {
    if (health === "checking") return "Checking backend…";
    if (health === "up") return null;
    return `Backend unreachable at ${API_BASE_URL}`;
  }, [health]);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (cancelled) return;
        setHealth(res.ok ? "up" : "down");
        setDetail(res.ok ? null : `HTTP ${res.status}`);
      } catch (e) {
        if (cancelled) return;
        setHealth("down");
        setDetail(e instanceof Error ? e.message : "Network error");
      }
    }

    check();
    const t = window.setInterval(check, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  if (!label) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        right: 12,
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div className="chip glass" style={{ pointerEvents: "auto" }}>
        <b style={{ color: health === "down" ? "rgba(251,113,133,.95)" : "rgba(255,255,255,.78)" }}>{health}</b>
        <span>{label}</span>
        {detail ? <span className="muted2">({detail})</span> : null}
        <span className="muted2">Tip: set</span>
        <code style={{ opacity: 0.85 }}>VITE_API_BASE_URL</code>
      </div>
    </div>
  );
}

