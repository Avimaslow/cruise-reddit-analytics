export default function Shell({ children }) {
  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between">
        <div className="font-semibold tracking-wide">
          Cruise Intel
          <span className="ml-2 text-xs text-zinc-400">
            Reddit NLP Analytics
          </span>
        </div>
        <div className="text-xs text-zinc-500">Live</div>
      </header>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
