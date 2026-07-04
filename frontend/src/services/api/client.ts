export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "/api");

export function getToken() {
  return localStorage.getItem("sonoteca_token");
}

export function setToken(t: string | null) {
  if (!t) localStorage.removeItem("sonoteca_token");
  else localStorage.setItem("sonoteca_token", t);
}

function safeJson(txt: string) {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

export async function request(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (e) {
    const msg =
      e instanceof Error && e.message
        ? e.message
        : "Network error";
    throw new Error(
      `Cannot reach backend at ${API_BASE_URL}. Check backend is running, VITE_API_BASE_URL, and CORS. (${msg})`
    );
  }
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const raw = body && (body.detail || body.error) ? (body.detail || body.error) : text || `HTTP ${res.status}`;
    const msg = typeof raw === "string" ? raw : JSON.stringify(raw);
    throw new Error(msg);
  }
  return body;
}

