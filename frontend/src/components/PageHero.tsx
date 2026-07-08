import type { ReactNode } from "react";

type Props = {
  type: string;
  title: string;
  subtitle?: ReactNode;
  imageUrl?: string | null;
  round?: boolean;
  fallback?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

export function PageHero({ type, title, subtitle, imageUrl, round, fallback, actions, children }: Props) {
  return (
    <section className="pageHero">
      {imageUrl ? (
        <div className="pageHero__backdrop" aria-hidden>
          <img src={imageUrl} alt="" />
          <div className="pageHero__backdropFade" />
        </div>
      ) : (
        <div className="pageHero__backdrop pageHero__backdrop--mesh" aria-hidden />
      )}

      <div className="pageHero__inner">
        <div className={`pageHero__art${round ? " pageHero__art--round" : ""}`}>
          {imageUrl ? (
            <img src={imageUrl} alt="" />
          ) : fallback ? (
            <div className="pageHero__fallback">{fallback}</div>
          ) : (
            <div className="skeleton" style={{ width: "100%", height: "100%" }} />
          )}
        </div>

        <div className="pageHero__copy">
          <span className="pageHero__type">{type}</span>
          <h1 className="pageHero__title">{title}</h1>
          {subtitle ? <div className="pageHero__subtitle">{subtitle}</div> : null}
          {actions ? <div className="pageHero__actions">{actions}</div> : null}
          {children}
        </div>
      </div>
    </section>
  );
}
