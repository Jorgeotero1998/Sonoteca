import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../services/api/client";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { useAuthStore } from "../../store/authStore";

export function AuthPage() {
  const nav = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const [email, setEmail] = useState("me@sonoteca.dev");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState<"owner" | "editor" | "viewer">("owner");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [health, setHealth] = useState<"checking" | "up" | "down">("checking");

  async function doLogin() {
    setBusy(true);
    setErr(null);
    try {
      const t = await sonotecaApi.auth.login(email, password);
      setToken(t.access_token);
      nav("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function doRegister() {
    setBusy(true);
    setErr(null);
    try {
      const t = await sonotecaApi.auth.register(email, password, role);
      setToken(t.access_token);
      nav("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Register failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        setHealth(res.ok ? "up" : "down");
      } catch {
        setHealth("down");
      }
    })();
  }, []);

  return (
    <div className="page" style={{ display: "grid", placeItems: "center", padding: 16 }}>
      <div className="card glass" style={{ width: "min(980px, 100%)", padding: 18 }}>
        <div className="row">
          <div className="brand">
            <div className="logo">S</div>
            <div>
              <div className="title">Sonoteca</div>
              <div className="subtitle">Deezer-first · previews only · refs-only persistence</div>
            </div>
          </div>
          <Link className="btn" to="/">
            Continue
          </Link>
        </div>

        <div style={{ marginTop: 12 }} className="chip">
          API: <b>{API_BASE_URL}</b> · health:{" "}
          <b style={{ color: health === "up" ? "rgba(30,215,96,.95)" : health === "down" ? "rgba(251,113,133,.95)" : "rgba(255,255,255,.72)" }}>
            {health}
          </b>
        </div>

        {err ? (
          <div style={{ marginTop: 12 }} className="chip">
            <b style={{ color: "rgba(251,113,133,.95)" }}>Error:</b> <span>{err}</span>
          </div>
        ) : null}

        <div style={{ height: 14 }} />
        <div className="grid2">
          <div className="tile" style={{ padding: 16 }}>
            <div className="h2">Login</div>
            <div style={{ height: 10 }} />
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
            <div style={{ height: 10 }} />
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
            <div style={{ height: 12 }} />
            <button className="btnPrimary" onClick={doLogin} disabled={busy}>
              {busy ? "..." : "Login"}
            </button>
          </div>

          <div className="tile" style={{ padding: 16 }}>
            <div className="h2">Register</div>
            <div className="kicker">Role is only to showcase RBAC.</div>
            <div style={{ height: 10 }} />
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)} style={{ appearance: "none" }}>
              <option value="owner">owner</option>
              <option value="editor">editor</option>
              <option value="viewer">viewer</option>
            </select>
            <div style={{ height: 12 }} />
            <button className="btnPrimary" onClick={doRegister} disabled={busy}>
              {busy ? "..." : "Register"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

