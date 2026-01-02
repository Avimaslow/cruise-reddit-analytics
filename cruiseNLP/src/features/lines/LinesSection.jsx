import { useMemo, useState } from "react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import LinePanel from "./LinePanel";

export default function LinesSection({ lines, selectedLine, onSelectLine }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return lines.slice(0, 80);
    return lines
      .filter(l => (l.name || "").toLowerCase().includes(s) || (l.id || "").includes(s))
      .slice(0, 80);
  }, [lines, q]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-4">
      <Card>
        <CardHeader title="Cruise Lines" subtitle="Scroll, search, click to load line intelligence." />
        <CardBody className="space-y-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lines… e.g. royal, carnival, ncl" />
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {filtered.map(l => (
              <button
                key={l.id}
                onClick={() => onSelectLine(l.id)}
                className={`w-full text-left px-3 py-2 rounded-xl border transition ${
                  selectedLine === l.id
                    ? "bg-orange-500/90 border-orange-500/60 text-zinc-950"
                    : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 text-zinc-200"
                }`}
              >
                <div className="text-sm font-semibold">{l.name}</div>
                <div className="text-xs opacity-80">mentions: {l.mentions ?? 0}</div>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <LinePanel lineId={selectedLine} lines={lines} />
    </div>
  );
}
