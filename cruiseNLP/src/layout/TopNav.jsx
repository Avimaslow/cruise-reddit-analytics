export default function TopNav() {
  return (
    <div className="h-14 px-4 border-b border-zinc-800 flex items-center justify-between">
      <div className="text-sm font-semibold">
        Cruise Intel
        <span className="ml-2 text-zinc-400 font-normal">
          Reddit NLP Dashboard
        </span>
      </div>
      <div className="text-xs text-zinc-500">
        API: 127.0.0.1:8000
      </div>
    </div>
  );
}
