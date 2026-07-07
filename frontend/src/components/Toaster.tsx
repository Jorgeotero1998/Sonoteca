import { useUIStore } from "../store/uiStore";
import { AlertIcon, CheckIcon, CloseIcon, MusicIcon } from "./icons";

export function Toaster() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismiss);

  return (
    <div className="toaster" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} role="status">
          <span style={{ color: t.kind === "success" ? "var(--acc)" : t.kind === "error" ? "var(--danger)" : "var(--acc-3)", display: "flex" }}>
            {t.kind === "success" ? <CheckIcon size={18} /> : t.kind === "error" ? <AlertIcon size={18} /> : <MusicIcon size={18} />}
          </span>
          <span className="truncate" style={{ flex: 1 }}>
            {t.message}
          </span>
          <button className="iconBtn ghost" style={{ width: 26, height: 26 }} aria-label="Dismiss" onClick={() => dismiss(t.id)}>
            <CloseIcon size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
