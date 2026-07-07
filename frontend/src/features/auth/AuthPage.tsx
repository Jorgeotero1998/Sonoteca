import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../services/api/client";
import { sonotecaApi } from "../../services/api/sonotecaApi";
import { useAuthStore } from "../../store/authStore";
import { toast } from "../../store/uiStore";
import { AlertIcon, MusicIcon, PlaylistIcon, SearchIcon } from "../../components/icons";

type Mode = "login" | "register";

const FEATURES = [
  { icon: <SearchIcon size={18} />, text: "Search millions of tracks from the Deezer catalog" },
  { icon: <MusicIcon size={18} />, text: "Stream 30-second previews with a polished player" },
  { icon: <PlaylistIcon size={18} />, text: "Build playlists, save favorites & share publicly" },
];

export function AuthPage() {
  const nav = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("me@sonoteca.dev");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState<"owner" | "editor" | "viewer">("owner");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [health, setHealth] = useState<"checking" | "up" | "down">("checking");

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const t = mode === "login" ? await sonotecaApi.auth.login(email, password) : await sonotecaApi.auth.register(email, password, role);
      setToken(t.access_token);
      toast(mode === "login" ? "Welcome back!" : "Account created — welcome!", "success");
      nav("/");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : `${mode === "login" ? "Login" : "Register"} failed`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authScreen">
      <aside className="authAside">
        <div className="brand">
          <div className="logo">S</div>
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.03em" }}>Sonoteca</div>
        </div>
        <div>
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05 }}>
            Your music,
            <br />
            beautifully organized.
          </div>
          <div className="muted" style={{ marginTop: 16, maxWidth: 420, fontSize: 16 }}>
            A production-grade music library — Deezer catalog, playlists, favorites and a premium player.
          </div>
          <div className="stack gap3" style={{ marginTop: 28 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="row gap3">
                <div style={{ width: 36, height: 36, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(255,255,255,.08)", color: "var(--acc)" }}>{f.icon}</div>
                <span style={{ fontWeight: 600 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="muted2" style={{ fontSize: 13 }}>Built by Jorge Otero · FastAPI + React + PostgreSQL</div>
      </aside>

      <main className="authMain">
        <div className="authCard panel" style={{ padding: 28 }}>
          <div className="brand hideDesktop" style={{ marginBottom: 20 }}>
            <div className="logo">S</div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>Sonoteca</div>
          </div>

          <div className="tabs" style={{ marginBottom: 20 }}>
            <button className={`tab${mode === "login" ? " active" : ""}`} onClick={() => setMode("login")}>Log in</button>
            <button className={`tab${mode === "register" ? " active" : ""}`} onClick={() => setMode("register")}>Create account</button>
          </div>

          <h1 className="h1" style={{ marginBottom: 4 }}>{mode === "login" ? "Welcome back" : "Get started"}</h1>
          <div className="muted" style={{ marginBottom: 20 }}>
            {mode === "login" ? "Log in to your Sonoteca account." : "Create an account to save playlists & favorites."}
          </div>

          {err ? (
            <div className="chip" style={{ color: "var(--danger)", borderColor: "rgba(251,113,133,.4)", marginBottom: 16, width: "100%" }}>
              <AlertIcon size={16} /> <span className="truncate">{err}</span>
            </div>
          ) : null}

          <form className="stack gap3" onSubmit={submit}>
            <label className="stack" style={{ gap: 6 }}>
              <span className="kicker">Email</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </label>
            <label className="stack" style={{ gap: 6 }}>
              <span className="kicker">Password</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </label>
            {mode === "register" ? (
              <label className="stack" style={{ gap: 6 }}>
                <span className="kicker">Role (demonstrates RBAC)</span>
                <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="owner">Owner</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
            ) : null}
            <button className="btnPrimary" type="submit" disabled={busy} style={{ marginTop: 6, padding: "12px 16px" }}>
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <div className="row gap2" style={{ marginTop: 18, fontSize: 12 }}>
            <span className="chip" style={{ padding: "4px 10px" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: health === "up" ? "var(--acc)" : health === "down" ? "var(--danger)" : "var(--muted-2)" }} />
              API {health}
            </span>
            <span className="muted2">Demo: me@sonoteca.dev / password123</span>
          </div>
        </div>
      </main>
    </div>
  );
}
