export default function TopNav() {
  return (
    <div className="h-14 px-4 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur flex items-center justify-between">
      <div className="text-sm font-semibold tracking-wide">
        Cruise Intel
        <span className="text-zinc-500 font-normal ml-2">Reddit NLP Dashboard</span>
      </div>
      <div className="text-xs text-zinc-500">
        Local API • 127.0.0.1:8000
      </div>
    </div>
  );
}
