export function Spinner() {
  return (
    <div className="inline-flex items-center gap-2 text-zinc-400">
      <span className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-zinc-300 animate-spin" />
      <span className="text-xs">Loading…</span>
    </div>
  );
}
