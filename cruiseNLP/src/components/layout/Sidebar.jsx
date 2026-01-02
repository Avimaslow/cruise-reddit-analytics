import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const link = ({ isActive }) =>
    `block px-3 py-2 rounded-xl text-sm border ${
      isActive
        ? "bg-zinc-900/60 border-zinc-700 text-zinc-100"
        : "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40"
    }`;

  return (
    <aside className="w-64 border-r border-zinc-900 bg-zinc-950/60 backdrop-blur p-3 hidden md:block">
      <div className="px-3 py-3 text-xs text-zinc-500">Explore</div>
      <nav className="space-y-1">
        <NavLink to="/" className={link} end>Ports</NavLink>
      </nav>

      <div className="mt-6 px-3 py-3 text-xs text-zinc-500">About</div>
      <div className="px-3 text-xs text-zinc-400 leading-relaxed">
        Click a port on the map or search to see sentiment, themes, and worst experiences extracted from Reddit comments.
      </div>
    </aside>
  );
}
