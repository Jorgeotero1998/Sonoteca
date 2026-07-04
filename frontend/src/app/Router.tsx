import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./Layout";
import { HomePage } from "../features/home/HomePage";
import { SearchPage } from "../features/search/SearchPage";
import { LibraryPage } from "../features/library/LibraryPage";
import { PlaylistsPage } from "../features/playlists/PlaylistsPage";
import { AlbumPage } from "../features/catalog/AlbumPage";
import { ArtistPage } from "../features/catalog/ArtistPage";
import { TrackPage } from "../features/catalog/TrackPage";
import { PublicPlaylistPage } from "../features/playlists/PublicPlaylistPage";
import { AuthPage } from "../features/auth/AuthPage";

export const router = createBrowserRouter([
  { path: "/auth", element: <AuthPage /> },
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "search", element: <SearchPage /> },
      { path: "library", element: <LibraryPage /> },
      { path: "playlists", element: <PlaylistsPage /> },
      { path: "artist/:ref", element: <ArtistPage /> },
      { path: "album/:ref", element: <AlbumPage /> },
      { path: "track/:ref", element: <TrackPage /> },
      { path: "public/:slug", element: <PublicPlaylistPage /> },
    ],
  },
]);

