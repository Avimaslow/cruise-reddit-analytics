import { useEffect, useState } from "react";
import { fetchPorts } from "../../api/cruiseApi";
import PortsMap from "./PortsMap";

export default function PortsPage() {
  const [ports, setPorts] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchPorts(100).then(setPorts).catch(console.error);
  }, []);

  return (
    <div className="h-full grid grid-cols-[320px_1fr]">
      {/* LEFT: ports list */}
      <aside className="border-r border-zinc-800 overflow-y-auto">
        <div className="p-3 text-sm font-semibold border-b border-zinc-800">
          Ports
        </div>
        {ports.map(p => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-900 ${
              selected === p.id ? "bg-zinc-900" : ""
            }`}
          >
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-zinc-500">
              {p.mentions} mentions
            </div>
          </button>
        ))}
      </aside>

      {/* RIGHT: detail panel */}
      <section className="p-6">
        {selected ? (
          <div className="text-xl font-semibold">
            {selected}
          </div>
        ) : (
          <div className="text-zinc-500">
            Select a port to view analytics
          </div>
        )}
      </section>
    </div>
  );
}
