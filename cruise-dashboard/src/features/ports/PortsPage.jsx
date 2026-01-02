/* =========================
   1) PortsPage.jsx (FULL FIX)
   - prevents chart overflow (overflow-hidden + min-w-0)
   - gives every chart a fixed height container
   - keeps FULL summary object for “all the data”
   - theme click filters feed
   ========================= */

import { useEffect, useMemo, useState } from "react";
import PortsMap from "./PortsMap";
import { CruiseAPI } from "../../api/cruiseApi";
import SentimentDonut from "../../components/charts/SentimentDonut";
import ThemeDonut from "../../components/charts/ThemeDonut";
import TrendLine from "../../components/charts/TrendLine";
import PortBreakdown from "./PortBreakdown";
function StatPill({ label, value }) {
  return (
    <div className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/60 min-w-0">
      <div className="text-[11px] text-zinc-400">{label}</div>
      <div className="text-sm font-semibold truncate">{value ?? "—"}</div>
    </div>
  );
}
function ComplaintsPraiseBar({ sentiment, feed, highSevThreshold = 0.66 }) {
  const neg = sentiment?.neg_count ?? 0;
  const pos = sentiment?.pos_count ?? 0;

  const highSevNeutral = (Array.isArray(feed) ? feed : []).reduce((acc, item) => {
    const sev = Number(item?.severity_score ?? 0);
    const lab = String(item?.sentiment_label ?? "").toLowerCase(); // "neg" | "neu" | "pos" (or words)

    const isNeutral = lab === "neu" || lab === "neutral";
    const isHighSev = sev >= highSevThreshold;

    return acc + (isNeutral && isHighSev ? 1 : 0);
  }, 0);

  const complaints = neg + highSevNeutral;
  const praise = pos;

  const total = complaints + praise || 1;
  const complaintsPct = (complaints / total) * 100;
  const praisePct = (praise / total) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
        <span>Complaints vs Praise</span>
        <span>{total} signals</span>
      </div>

      <div className="h-3 w-full rounded-full overflow-hidden bg-zinc-900 border border-zinc-800">
        <div className="h-full flex">
          <div style={{ width: `${complaintsPct}%` }} className="h-full bg-red-500/70" />
          <div style={{ width: `${praisePct}%` }} className="h-full bg-emerald-500/70" />
        </div>
      </div>

      <div className="mt-2 text-xs text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
        <span>
          Complaints: <span className="text-zinc-200">{complaints}</span>{" "}
          <span className="text-zinc-500">
            (neg {neg} + high-sev neu {highSevNeutral})
          </span>
        </span>
        <span>
          Praise: <span className="text-zinc-200">{praise}</span>
        </span>
        <span className="text-zinc-500">
          threshold: sev ≥ {highSevThreshold}
        </span>
      </div>
    </div>
  );
}
function VolatilityMeter({ feed }) {
  const scores = (Array.isArray(feed) ? feed : [])
    .map((f) => Number(f?.severity_score))
    .filter((n) => !Number.isNaN(n));

  if (!scores.length) {
    return <div className="text-xs text-zinc-500">No severity data</div>;
  }

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Normalize 0–0.5 → 0–100 (severity usually 0–1)
  const pct = Math.min(100, Math.max(0, (stdDev / 0.5) * 100));

  let label = "Stable";
  if (pct > 65) label = "Chaotic";
  else if (pct > 35) label = "Mixed";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
        <span>Experience volatility</span>
        <span>{label}</span>
      </div>

      <div className="relative h-3 w-full rounded-full bg-zinc-900 border border-zinc-800">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/60 via-amber-400/60 to-red-500/60" />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-5 rounded bg-white shadow"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
      </div>

      <div className="mt-2 text-xs text-zinc-500">
        Std dev of severity: {stdDev.toFixed(3)}
      </div>
    </div>
  );
}

function SentimentBar({ sentiment }) {
  const neg = sentiment?.neg_count ?? 0;
  const neu = sentiment?.neu_count ?? 0;
  const pos = sentiment?.pos_count ?? 0;
  const total = neg + neu + pos || 1;

  const negPct = (neg / total) * 100;
  const neuPct = (neu / total) * 100;
  const posPct = (pos / total) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
        <span>Sentiment mix</span>
        <span>{total} comments</span>
      </div>

      <div className="h-3 w-full rounded-full overflow-hidden bg-zinc-900 border border-zinc-800">
        <div className="h-full flex">
          <div style={{ width: `${negPct}%` }} className="h-full bg-red-500/70" />
          <div style={{ width: `${neuPct}%` }} className="h-full bg-zinc-500/70" />
          <div style={{ width: `${posPct}%` }} className="h-full bg-emerald-500/70" />
        </div>
      </div>

      <div className="mt-2 flex gap-3 text-xs text-zinc-400">
        <span>
          Neg: <span className="text-zinc-200">{neg}</span>
        </span>
        <span>
          Neu: <span className="text-zinc-200">{neu}</span>
        </span>
        <span>
          Pos: <span className="text-zinc-200">{pos}</span>
        </span>
      </div>
    </div>
  );
}

export default function PortsPage() {
  // list
  const [ports, setPorts] = useState([]);
  const [portsLoading, setPortsLoading] = useState(true);
  const [portsErr, setPortsErr] = useState("");

  const [query, setQuery] = useState("");
  const [selectedPortId, setSelectedPortId] = useState(null);

  // detail
  const [summary, setSummary] = useState(null); // keep whole summary object
  const [themes, setThemes] = useState([]);
  const [feed, setFeed] = useState([]);
  const [trend, setTrend] = useState([]);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");

  // filters
  const [activeTheme, setActiveTheme] = useState(null);
  const [themeQuery, setThemeQuery] = useState("");

  // load ports
  useEffect(() => {
    let alive = true;
    setPortsLoading(true);
    setPortsErr("");

    CruiseAPI.ports(500)
      .then((data) => {
        if (!alive) return;
        const arr = Array.isArray(data) ? data : [];
        setPorts(arr);
        if (!selectedPortId && arr.length) setSelectedPortId(arr[0].id);
      })
      .catch((e) => alive && setPortsErr(String(e?.message || e)))
      .finally(() => alive && setPortsLoading(false));

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPortObj = useMemo(() => {
    if (!selectedPortId) return null;
    return ports.find((p) => p.id === selectedPortId) || null;
  }, [ports, selectedPortId]);

  const filteredPorts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ports;
    return ports.filter((p) => ((p.name || p.id || "") + "").toLowerCase().includes(q));
  }, [ports, query]);

  const filteredThemes = useMemo(() => {
    const q = themeQuery.trim().toLowerCase();
    if (!q) return themes;
    return themes.filter((t) => (t?.theme_label || "").toLowerCase().includes(q));
  }, [themes, themeQuery]);

  // load details
  useEffect(() => {
    if (!selectedPortId) return;
    let alive = true;

    setDetailLoading(true);
    setDetailErr("");

    Promise.all([
      CruiseAPI.portSummary(selectedPortId),
      CruiseAPI.portThemes(selectedPortId, 15, 30),
      CruiseAPI.portFeed(selectedPortId, 25, activeTheme),
      CruiseAPI.portTrend(selectedPortId),
    ])
      .then(([s, t, f, tr]) => {
        if (!alive) return;
        setSummary(s || null);
        setThemes(Array.isArray(t) ? t : []);
        setFeed(Array.isArray(f) ? f : []);
        setTrend(Array.isArray(tr) ? tr : []);
      })
      .catch((e) => alive && setDetailErr(String(e?.message || e)))
      .finally(() => alive && setDetailLoading(false));

    return () => {
      alive = false;
    };
  }, [selectedPortId, activeTheme]);

  // clear theme filter when switching ports
  useEffect(() => {
    setActiveTheme(null);
    setThemeQuery("");
  }, [selectedPortId]);

  // normalize
  const sentiment = summary?.sentiment || summary || null; // supports either shape

  const mentions =
    summary?.mentions ??
    sentiment?.mentions ??
    selectedPortObj?.mentions ??
    null;

  const avgSent =
    summary?.avg_sentiment ??
    sentiment?.avg_sentiment ??
    null;

  const avgSev =
    summary?.avg_severity ??
    sentiment?.avg_severity ??
    null;

  const selectedPortTitle = selectedPortObj?.name || selectedPortId || "—";

  return (
    <div className="h-full grid grid-cols-[360px_1fr_440px]">
      {/* LEFT */}
      <aside className="border-r border-zinc-800 bg-zinc-950/40 overflow-hidden flex flex-col min-w-0">
        <div className="p-4 border-b border-zinc-800">
          <div className="text-xs text-zinc-400 mb-2">Search ports</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cozumel, Nassau, Roatan…"
            className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-600"
          />

          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>{portsLoading ? "Loading…" : `${filteredPorts.length} ports`}</span>
            <span className="truncate">Top by mentions</span>
          </div>

          {portsErr && <div className="mt-3 text-xs text-red-300 whitespace-pre-wrap">{portsErr}</div>}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredPorts.map((p) => {
            const active = p.id === selectedPortId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPortId(p.id)}
                className={`w-full text-left px-4 py-3 border-b border-zinc-900/60 hover:bg-zinc-900/40 ${
                  active ? "bg-zinc-900/60" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-[11px] text-zinc-500 shrink-0">{p.mentions ?? 0}</div>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1 truncate">id: {p.id}</div>
              </button>
            );
          })}

          {!portsLoading && filteredPorts.length === 0 && (
            <div className="p-4 text-sm text-zinc-500">No ports match that search.</div>
          )}
        </div>
      </aside>

      {/* CENTER */}
      <section className="relative overflow-hidden min-w-0">
        <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.10),transparent_45%),radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.10),transparent_40%),radial-gradient(circle_at_60%_80%,rgba(244,63,94,0.10),transparent_45%)]"/>

        <div className="relative h-full p-6 min-w-0 flex flex-col min-h-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-zinc-400">World view</div>
              <div className="text-lg font-semibold">Port Map</div>
            </div>
            <div className="text-xs text-zinc-500">Click a marker → select port</div>
          </div>

          <div className="mt-6 h-[520px] min-w-0 shrink-0">
            <PortsMap ports={ports} selectedPort={selectedPortId} onSelect={setSelectedPortId}/>
          </div>

          <div className="mt-6 min-w-0 flex-1 min-h-0 overflow-y-auto pr-1">
            {selectedPortId ? <PortBreakdown portId={selectedPortId}/> : null}
          </div>
        </div>
      </section>


      {/* RIGHT */}
      <aside className="border-l border-zinc-800 bg-zinc-950/40 overflow-hidden flex flex-col min-w-0">
        {/* summary header */}
        <div className="p-5 border-b border-zinc-800 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-zinc-400">Selected port</div>
              <div className="mt-1 text-xl font-semibold truncate">{selectedPortTitle}</div>
              <div className="text-[11px] text-zinc-500 mt-1 truncate">id: {selectedPortId || "—"}</div>
            </div>
            <div className="text-xs text-zinc-500 pt-1">{detailLoading ? "Loading…" : ""}</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 min-w-0">
            <StatPill label="Mentions" value={mentions}/>
            <StatPill
                label="Avg Sentiment"
                value={typeof avgSent === "number" ? avgSent.toFixed(3) : "—"}
            />
            <StatPill
              label="Avg Severity"
              value={typeof avgSev === "number" ? avgSev.toFixed(3) : "—"}
            />
            <StatPill label="Number of Themes" value={themes?.length ?? 0} />
          </div>

          {/* IMPORTANT: these two cards MUST have overflow-hidden + fixed heights */}
          <div className="mt-4 grid grid-cols-2 gap-3 min-w-0">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 overflow-hidden min-w-0">
              <div className="text-xs text-zinc-400 mb-2">Sentiment Donut</div>
              <div className="w-full h-[220px] min-w-0">
                <SentimentDonut summary={sentiment}/>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 overflow-hidden min-w-0">
              <div className="text-xs text-zinc-400 mb-2">Volatility</div>
              <VolatilityMeter feed={feed}/>
            </div>
          </div>

          {detailErr && <div className="mt-4 text-xs text-red-300 whitespace-pre-wrap">{detailErr}</div>}
        </div>

        {/* scroll */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {/* themes */}
          <div className="p-5 border-b border-zinc-900/60 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Theme Composition</div>
              {activeTheme ? (
                <button
                  onClick={() => setActiveTheme(null)}
                  className="text-xs px-2 py-1 rounded-md border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/50"
                >
                  Clear filter
                </button>
              ) : null}
            </div>

            {/* Fixed height + overflow-hidden prevents pie from drawing over other cards */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 overflow-hidden min-w-0">
              <div className="w-full h-[260px] min-w-0">
                <ThemeDonut themes={themes} />
              </div>
            </div>

            <input
              value={themeQuery}
              onChange={(e) => setThemeQuery(e.target.value)}
              placeholder="Filter themes…"
              className="mt-4 w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            />

            {activeTheme && (
              <div className="mt-3 text-xs text-zinc-400">
                Filtering feed by: <span className="text-zinc-200 font-medium">{activeTheme}</span>
              </div>
            )}

            <div className="mt-3 space-y-2 min-w-0">
              {filteredThemes.slice(0, 20).map((t) => {
                const label = t?.theme_label || "—";
                const isActive = label === activeTheme;

                return (
                  <button
                    key={label}
                    onClick={() => setActiveTheme((cur) => (cur === label ? null : label))}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition min-w-0 ${
                      isActive
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="text-sm font-medium truncate">{label}</div>
                      <div className="text-xs text-zinc-500 shrink-0">{t?.n ?? 0}</div>
                    </div>

                    <div className="mt-1 text-xs text-zinc-500">
                      avg_sent: {t?.avg_sent?.toFixed?.(3) ?? "—"} • neg: {t?.neg_count ?? 0}
                    </div>

                    {isActive && (
                      <div className="mt-1 text-[11px] text-emerald-300/90">Applied to feed</div>
                    )}
                  </button>
                );
              })}

              {!detailLoading && filteredThemes.length === 0 && (
                <div className="text-sm text-zinc-500">No themes match that filter.</div>
              )}
            </div>
          </div>

          {/* trend */}
          <div className="p-5 border-b border-zinc-900/60 min-w-0">
            <div className="text-sm font-semibold mb-2">Trend</div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 overflow-hidden min-w-0">
              <div className="w-full h-[260px] min-w-0">
                <TrendLine data={trend} />
              </div>
            </div>
          </div>

          {/* feed */}
          <div className="p-5 min-w-0">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <div className="text-sm font-semibold truncate">
                Worst experiences (by severity){activeTheme ? ` • ${activeTheme}` : ""}
              </div>
              <div className="text-xs text-zinc-500 shrink-0">{detailLoading ? "Loading…" : ""}</div>
            </div>

            <div className="mt-3 space-y-3 min-w-0">
              {feed.slice(0, 25).map((item) => (
                <a
                  key={item.object_id || item.permalink}
                  href={item.permalink || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/50 p-4 min-w-0"
                >
                  <div className="flex items-center justify-between text-xs text-zinc-500 gap-2 min-w-0">
                    <span className="truncate">{item.subreddit || "—"}</span>
                    <span className="shrink-0">
                      sev {item.severity_score?.toFixed?.(3) ?? "—"} • sent{" "}
                      {item.sentiment_score?.toFixed?.(3) ?? "—"}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-zinc-200 leading-relaxed">
                    {item.preview || ""}
                    {item.preview?.length >= 230 ? "…" : ""}
                  </div>

                  <div className="mt-2 text-xs text-zinc-500">
                    {item.sentiment_label?.toUpperCase?.() || "—"}
                  </div>
                </a>
              ))}

              {!detailLoading && feed.length === 0 && (
                <div className="text-sm text-zinc-500">No feed items found for this port.</div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
