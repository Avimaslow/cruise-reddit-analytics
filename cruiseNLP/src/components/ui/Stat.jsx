export function Stat({ label, value, sub }) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      {sub ? <div className="text-xs text-zinc-400 mt-1">{sub}</div> : null}
    </div>
  );
}
