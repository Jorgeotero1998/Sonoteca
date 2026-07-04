import { request } from "./client";

export const sonotecaApi = {
  auth: {
    register: (email: string, password: string, role: string) =>
      request("/auth/register", { method: "POST", body: JSON.stringify({ email, password, role }) }) as Promise<{
        access_token: string;
        token_type: string;
      }>,
    login: (email: string, password: string) =>
      request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }) as Promise<{
        access_token: string;
        token_type: string;
      }>,
  },
  catalog: {
    charts: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/catalog/charts${qs ? `?${qs}` : ""}`) as Promise<any>;
    },
    newReleases: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/catalog/new-releases${qs ? `?${qs}` : ""}`) as Promise<any>;
    },
    search: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/catalog/search${qs ? `?${qs}` : ""}`) as Promise<any>;
    },
    track: (ref: string) => request(`/catalog/track/${encodeURIComponent(ref)}`) as Promise<any>,
    album: (ref: string) => request(`/catalog/album/${encodeURIComponent(ref)}`) as Promise<any>,
    artist: (ref: string) => request(`/catalog/artist/${encodeURIComponent(ref)}`) as Promise<any>,
    artistTop: (ref: string, params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/catalog/artist/${encodeURIComponent(ref)}/top${qs ? `?${qs}` : ""}`) as Promise<any>;
    },
    artistAlbums: (ref: string, params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/catalog/artist/${encodeURIComponent(ref)}/albums${qs ? `?${qs}` : ""}`) as Promise<any>;
    },
  },
  me: {
    favorites: () => request("/me/favorites") as Promise<any[]>,
    favoriteAdd: (ref: string) => request(`/me/favorites/${encodeURIComponent(ref)}`, { method: "POST" }) as Promise<any>,
    favoriteDel: (ref: string) => request(`/me/favorites/${encodeURIComponent(ref)}`, { method: "DELETE" }) as Promise<any>,
    history: (limit?: number) => request(`/me/history${limit ? `?limit=${limit}` : ""}`) as Promise<any[]>,
    historyAdd: (payload: any) => request("/me/history", { method: "POST", body: JSON.stringify(payload) }) as Promise<any>,
    library: () => request("/me/library") as Promise<any[]>,
    libraryAdd: (ref: string) => request(`/me/library/${encodeURIComponent(ref)}`, { method: "POST" }) as Promise<any>,
    libraryDel: (ref: string) => request(`/me/library/${encodeURIComponent(ref)}`, { method: "DELETE" }) as Promise<any>,
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
};

