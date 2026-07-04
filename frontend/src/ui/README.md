# Legacy UI (unused)

This folder contains the **legacy, pre-router UI** (`src/ui/*`).

The runtime entrypoint (`src/main.tsx`) mounts the new router-based app under `src/app/*`.
Nothing in `src/ui/*` is imported by the current app, so it is **not included in the Vite bundle**.

