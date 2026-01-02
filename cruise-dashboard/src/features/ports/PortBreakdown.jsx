import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CruiseAPI } from "../../api/cruiseApi";
import { useNavigate } from "react-router-dom";
function StackCard({ title, rows, labelKey, valueKey, colors, onRowClick }) {
  const data = useMemo(() => {
    return (rows || [])
      .map((r) => ({
        label: r[labelKey],
        value: Number(r[valueKey]) || 0,
        raw: r,
      }))
      .filter((d) => d.label && d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [rows, labelKey, valueKey]);

  const total = useMemo(
    () => data.reduce((acc, d) => acc + d.value, 0) || 1,
    [data]
  );

  const top = useMemo(() => data.slice(0, 10), [data]);
  const restSum = useMemo(() => data.slice(10).reduce((a, d) => a + d.value, 0), [data]);

  const segments = restSum > 0 ? [...top, { label: "Other", value: restSum, raw: null }] : top;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-zinc-500">{total} mentions</div>
      </div>

      {/* stacked bar */}
      <div className="px-4 pt-4">
        <div className="h-3 w-full rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex">
          {segments.map((s, i) => {
            const pct = Math.max(0, Math.min(100, (s.value / total) * 100));
            return (
              <div
                key={s.label + i}
                style={{ width: `${pct}%`, background: colors[i % colors.length], opacity: 0.85 }}
                className="h-full"
                title={`${s.label}: ${s.value} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        <div className="mt-2 text-[11px] text-zinc-500 flex flex-wrap gap-x-3 gap-y-1">
          {segments.slice(0, 6).map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ background: colors[i % colors.length], opacity: 0.85 }}
              />
              <span className="text-zinc-300">{s.label}</span>
              <span>{Math.round((s.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* list */}
      <div className="p-4 space-y-2">
        {top.map((d, i) => {
          const pct = (d.value / total) * 100;
          return (
            <button
              key={d.label}
              onClick={() => onRowClick?.(d.raw)}
              className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/50 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium truncate">{d.label}</div>
                <div className="text-xs text-zinc-500 shrink-0">
                  {d.value} • {pct.toFixed(1)}%
                </div>
              </div>

              <div className="mt-2 h-2 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${pct}%`,
                    background: colors[i % colors.length],
                    opacity: 0.85,
                  }}
                />
              </div>
            </button>
          );
        })}

        {(!rows || rows.length === 0) && (
          <div className="text-sm text-zinc-500">No data yet.</div>
        )}
      </div>
    </div>
  );
}

// Simple slug->title guesses for Wikipedia lookup
function titleizeLine(lineName) {
  // keep it simple; you can customize later for edge cases
  return lineName;
}

function titleizeShip(shipId) {
  // ship ids are like "wonder-of-the-seas" -> "Wonder of the Seas"
  return shipId
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Wikipedia REST summary gives a thumbnail if available
async function fetchWikiThumb(title) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title
    )}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.thumbnail?.source || null;
  } catch {
    return null;
  }
}

function DonutCard({ title, rows, labelKey, valueKey, colors, onRowClick, getThumbTitle }) {
  const total = useMemo(
    () => (rows || []).reduce((acc, r) => acc + (Number(r[valueKey]) || 0), 0) || 1,
    [rows, valueKey]
  );

  const data = useMemo(() => {
    return (rows || []).map((r) => ({
      name: r[labelKey],
      value: Number(r[valueKey]) || 0,
      raw: r,
    }));
  }, [rows, labelKey, valueKey]);

  const top = useMemo(() => data.slice(0, 10), [data]);

  // thumbs cache
  const [thumbs, setThumbs] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const missing = top
        .map((d) => ({ key: d.name, title: getThumbTitle?.(d.raw) }))
        .filter((x) => x.title && !thumbs[x.key]);

      if (!missing.length) return;

      const next = { ...thumbs };
      for (const m of missing) {
        const src = await fetchWikiThumb(m.title);
        if (!alive) return;
        if (src) next[m.key] = src;
      }
      if (alive) setThumbs(next);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top.map((x) => x.name).join("|")]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-zinc-500">{total} mentions</div>
      </div>

      <div className="p-4 grid grid-cols-[220px_1fr] gap-4">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={top}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={78}
                paddingAngle={2}
              >
                {top.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, n) => [`${v} (${((v / total) * 100).toFixed(1)}%)`, n]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {top.map((d, i) => {
            const pct = ((d.value / total) * 100).toFixed(1);
            const img = thumbs[d.name];

            return (
              <button
                key={d.name}
                onClick={() => onRowClick?.(d.raw)}
                className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/50 px-3 py-2 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-zinc-900/60 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                  {img ? (
                    <img src={img} alt={d.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-[11px] text-zinc-500">wiki</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-xs text-zinc-500 shrink-0">
                      {pct}%
                    </div>
                  </div>

                  <div className="mt-1 h-2 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${pct}%`,
                        background: colors[i % colors.length],
                        opacity: 0.85,
                      }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
          {(!rows || rows.length === 0) && (
            <div className="text-sm text-zinc-500">No data yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PortBreakdown({ portId }) {
  const navigate = useNavigate();

  const [lines, setLines] = useState([]);
  const [ships, setShips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!portId) return;
    let alive = true;
    setLoading(true);
    setErr("");

    Promise.all([CruiseAPI.portLines(portId, 30), CruiseAPI.portShips(portId, 30)])
      .then(([l, s]) => {
        if (!alive) return;
        setLines(Array.isArray(l) ? l : []);
        setShips(Array.isArray(s) ? s : []);
      })
      .catch((e) => alive && setErr(String(e?.message || e)))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [portId]);

  const colorsA = ["#22c55e", "#60a5fa", "#f97316", "#e879f9", "#f59e0b", "#34d399", "#f43f5e", "#a78bfa"];
  const colorsB = ["#60a5fa", "#22c55e", "#f97316", "#f43f5e", "#a78bfa", "#f59e0b", "#34d399", "#e879f9"];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-400">At this port</div>
          <div className="text-lg font-semibold">Traffic Breakdown</div>
        </div>
        <div className="text-xs text-zinc-500">{loading ? "Loading…" : ""}</div>
      </div>

      {err && <div className="text-xs text-red-300 whitespace-pre-wrap">{err}</div>}

      <div className="space-y-4">
        <StackCard
            title="Cruise lines at this port"
            rows={lines.map((r) => ({...r, label: r.line_name, value: r.mentions}))}
            labelKey="label"
            valueKey="value"
            colors={colorsA}
            onRowClick={(row) => navigate(`/lines/${row.line_id}`)}
        />

        <StackCard
            title="Ships at this port"
            rows={ships.map((r) => ({...r, label: r.ship_id, value: r.mentions}))}
            labelKey="label"
            valueKey="value"
            colors={colorsB}
            onRowClick={(row) => navigate(`/ships/${row.ship_id}`)}
        />
      </div>


      <div className="text-xs text-zinc-500">
        Images are pulled client-side from Wikipedia summaries (thumbnail when available).
      </div>
    </div>
  );
}
