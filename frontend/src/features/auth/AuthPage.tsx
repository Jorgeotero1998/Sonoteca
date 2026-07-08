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
    <div className="auth">
      <aside className="auth__showcase">
        <div className="auth__glow" aria-hidden />
        <div className="auth__brand">
          <span className="auth__logo">S</span>
          <span className="auth__name">Sonoteca</span>
        </div>

        <div className="auth__pitch">
          <h1 className="auth__headline">
            Your music,
            <br />
            <em>elevated.</em>
          </h1>
          <p className="auth__tagline">A premium Deezer-powered library with playlists, favorites, and a studio-grade player.</p>
          <ul className="auth__features">
            {FEATURES.map((f, i) => (
              <li key={i} className="auth__feature">
                <span className="auth__featureIcon">{f.icon}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="auth__credit">Built by Jorge Otero · FastAPI + React + PostgreSQL</p>
      </aside>

      <main className="auth__formArea">
        <div className="auth__card">
          <div className="auth__mobileBrand hideDesktop">
            <span className="auth__logo">S</span>
            <div>
              <div className="auth__name">Sonoteca</div>
              <div className="auth__cardSub">Music Library</div>
            </div>
          </div>

          <div className="segControl">
            <button className={`segControl__btn${mode === "login" ? " segControl__btn--active" : ""}`} onClick={() => setMode("login")}>
              Log in
            </button>
            <button className={`segControl__btn${mode === "register" ? " segControl__btn--active" : ""}`} onClick={() => setMode("register")}>
              Create account
            </button>
          </div>

          <h2 className="auth__formTitle">{mode === "login" ? "Welcome back" : "Get started"}</h2>
          <p className="auth__formSub">
            {mode === "login" ? "Log in to your Sonoteca account." : "Create an account to save playlists & favorites."}
          </p>

          {err ? (
            <div className="alert alert--error">
              <AlertIcon size={16} />
              <span className="truncate">{err}</span>
            </div>
          ) : null}

          <form className="auth__form" onSubmit={submit}>
            <label className="field">
              <span className="field__label">Email</span>
              <input className="field__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </label>
            <label className="field">
              <span className="field__label">Password</span>
              <input className="field__input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </label>
            {mode === "register" ? (
              <label className="field">
                <span className="field__label">Role (demonstrates RBAC)</span>
                <select className="field__input" value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="owner">Owner</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
            ) : null}
            <button className="btn btn--primary btn--full" type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <div className="auth__meta">
            <span className="badge">
              <span className={`statusDot${health === "up" ? " statusDot--ok" : health === "down" ? " statusDot--err" : ""}`} />
              API {health}
            </span>
            <span className="auth__demo">Demo: me@sonoteca.dev / password123</span>
          </div>
        </div>
      </main>
    </div>
  );
}
