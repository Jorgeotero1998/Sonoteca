const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type Token = { access_token: string; token_type: string };

export function getToken() {
  return localStorage.getItem("sonoteca_token");
}

export function setToken(t: string | null) {
  if (!t) localStorage.removeItem("sonoteca_token");
  else localStorage.setItem("sonoteca_token", t);
}

async function request(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg = (body && (body.detail || body.error)) ? (body.detail || body.error) : text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

function safeJson(txt: string) {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

export const api = {
  auth: {
    register: (email: string, password: string, role: string) =>
      request("/auth/register", { method: "POST", body: JSON.stringify({ email, password, role }) }) as Promise<Token>,
    login: (email: string, password: string) =>
      request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }) as Promise<Token>,
  },
  songs: {
    list: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/songs${qs ? `?${qs}` : ""}`) as Promise<any[]>;
    },
    create: (payload: any) => request("/songs", { method: "POST", body: JSON.stringify(payload) }) as Promise<any>,
    patch: (id: string, payload: any) =>
      request(`/songs/${id}`, { method: "PATCH", body: JSON.stringify(payload) }) as Promise<any>,
    del: (id: string) => request(`/songs/${id}`, { method: "DELETE" }) as Promise<any>,
  },
  playlists: {
    list: () => request("/playlists") as Promise<any[]>,
    create: (payload: any) => request("/playlists", { method: "POST", body: JSON.stringify(payload) }) as Promise<any>,
    get: (id: string) => request(`/playlists/${id}`) as Promise<any>,
    patch: (id: string, payload: any) =>
      request(`/playlists/${id}`, { method: "PATCH", body: JSON.stringify(payload) }) as Promise<any>,
    del: (id: string) => request(`/playlists/${id}`, { method: "DELETE" }) as Promise<any>,
    addItem: (id: string, payload: any) =>
      request(`/playlists/${id}/items`, { method: "POST", body: JSON.stringify(payload) }) as Promise<any>,
    removeItem: (pid: string, itemId: string) =>
      request(`/playlists/${pid}/items/${itemId}`, { method: "DELETE" }) as Promise<any>,
    reorder: (pid: string, ordered_item_ids: string[]) =>
      request(`/playlists/${pid}/reorder`, { method: "POST", body: JSON.stringify({ ordered_item_ids }) }) as Promise<any>,
    public: (slug: string) => request(`/playlists/public/${slug}`) as Promise<any>,
  },
  stats: {
    overview: () => request("/stats/overview") as Promise<any>,
  },
};

