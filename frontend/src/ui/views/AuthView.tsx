import { useEffect, useState } from "react";
import { API_BASE_URL, api, setToken } from "../api";

export function AuthView({ onAuthed, toast }: { onAuthed: () => void; toast: (m: string) => void }) {
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
      const t = await api.auth.login(email, password);
      setToken(t.access_token);
      onAuthed();
    } catch (e) {
      const m = e instanceof Error ? e.message : "Login failed";
      setErr(m);
      toast(m);
    } finally {
      setBusy(false);
    }
  }

  async function doRegister() {
    setBusy(true);
    setErr(null);
    try {
      const t = await api.auth.register(email, password, role);
      setToken(t.access_token);
      onAuthed();
    } catch (e) {
      const m = e instanceof Error ? e.message : "Register failed";
      setErr(m);
      toast(m);
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
    <div
      style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div className="card" style={{ width: "min(920px, 100%)", padding: 18 }}>
        <div className="row">
          <div>
            <div style={{ fontWeight: 900, letterSpacing: "-0.03em", fontSize: 22 }}>Sonoteca</div>
            <div className="kicker" style={{ marginTop: 6 }}>
              Spotify/YouTube‑Music inspired library · FastAPI + Postgres + JWT
            </div>
            <div className="kicker" style={{ marginTop: 8 }}>
              API: <b>{API_BASE_URL}</b> · health:{" "}
              <b style={{ color: health === "up" ? "rgba(30,215,96,.95)" : health === "down" ? "rgba(251,113,133,.95)" : "rgba(255,255,255,.72)" }}>
                {health}
              </b>
            </div>
          </div>
          <div className="chip" style={{ borderColor: "rgba(30,215,96,.22)" }}>
            Demo ready
          </div>
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
            <button className="btn btnPrimary" onClick={doLogin} disabled={busy}>
              {busy ? "..." : "Login"}
            </button>
          </div>

          <div className="tile" style={{ padding: 16 }}>
            <div className="h2">Register</div>
            <div className="kicker" style={{ marginTop: 6 }}>
              Role is just to showcase RBAC.
            </div>
            <div style={{ height: 10 }} />
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)} style={{ appearance: "none" }}>
              <option value="owner">owner</option>
              <option value="editor">editor</option>
              <option value="viewer">viewer</option>
            </select>
            <div style={{ height: 12 }} />
            <button className="btn btnPrimary" onClick={doRegister} disabled={busy}>
              {busy ? "..." : "Register"}
            </button>
            <div style={{ height: 12 }} />
            <button
              className="btn"
              onClick={() => {
                setToken(null);
                toast("Token cleared");
              }}
            >
              Clear token
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

