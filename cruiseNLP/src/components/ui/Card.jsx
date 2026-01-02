export function Card({ className = "", children }) {
  return (
    <div className={`bg-zinc-900/60 border border-zinc-800 rounded-2xl shadow-soft ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, right }) {
  return (
    <div className="p-4 border-b border-zinc-800 flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-semibold tracking-wide text-zinc-100">{title}</div>
        {subtitle ? <div className="text-xs text-zinc-400 mt-1">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function CardBody({ className = "", children }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
