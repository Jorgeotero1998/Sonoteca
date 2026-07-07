import { useEffect, useState } from "react";
import { API_BASE_URL } from "../services/api/client";
import { AlertIcon } from "../components/icons";

type Health = "checking" | "up" | "down";

export function BackendStatusBanner() {
  const [health, setHealth] = useState<Health>("checking");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (cancelled) return;
        setHealth(res.ok ? "up" : "down");
      } catch {
        if (cancelled) return;
        setHealth("down");
      }
    }
    check();
    const t = window.setInterval(check, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  if (health !== "down") return null;

  return (
    <div
      role="alert"
      className="glass"
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 250,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        color: "var(--danger)",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      <AlertIcon size={18} />
      <span>Backend unreachable — some features may not work.</span>
    </div>
  );
}
