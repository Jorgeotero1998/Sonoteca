import { useState } from "react";
import { api, setToken } from "../api";

export function AuthView({ onAuthed, toast }: { onAuthed: () => void; toast: (m: string) => void }) {
  const [email, setEmail] = useState("me@sonoteca.dev");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState<"owner" | "editor" | "viewer">("owner");
  const [busy, setBusy] = useState(false);

  async function doLogin() {
    setBusy(true);
    try {
      const t = await api.auth.login(email, password);
      setToken(t.access_token);
      onAuthed();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function doRegister() {
    setBusy(true);
    try {
      const t = await api.auth.register(email, password, role);
      setToken(t.access_token);
      onAuthed();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Register failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="glass" style={{ padding: 18 }}>
        <div style={{ fontWeight: 780, letterSpacing: "-0.02em", fontSize: 20 }}>Sonoteca</div>
        <div className="muted" style={{ marginTop: 8 }}>
          Sign in or create an account. Render deploy uses Postgres + JWT.
        </div>

        <div style={{ height: 14 }} />
        <div className="grid2">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700 }}>Login</div>
            <div style={{ height: 10 }} />
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
            <div style={{ height: 10 }} />
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
            />
            <div style={{ height: 12 }} />
            <button className="btn btnPrimary" onClick={doLogin} disabled={busy}>
              {busy ? "..." : "Login"}
            </button>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700 }}>Register</div>
            <div style={{ height: 10 }} />
            <div className="muted" style={{ fontSize: 12 }}>
              Role is just to showcase RBAC.
            </div>
            <div style={{ height: 10 }} />
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              style={{ appearance: "none" }}
            >
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

