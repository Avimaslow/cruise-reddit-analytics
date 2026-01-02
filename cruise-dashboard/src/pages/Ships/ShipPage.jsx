import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CruiseAPI } from "../../api/cruiseApi";
import SentimentDonut from "../../components/charts/SentimentDonut";
import ThemeDonut from "../../components/charts/ThemeDonut";
import TrendLine from "../../components/charts/TrendLine";

function StatPill({ label, value }) {
  return (
    <div className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/60 min-w-0">
      <div className="text-[11px] text-zinc-400">{label}</div>
      <div className="text-sm font-semibold truncate">{value ?? "—"}</div>
    </div>
  );
}

function titleizeShip(shipId) {
  return (shipId || "")
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export default function ShipPage() {
  const { shipId } = useParams();

  const [summary, setSummary] = useState(null);
  const [ports, setPorts] = useState([]);
  const [themes, setThemes] = useState([]);
  const [trend, setTrend] = useState([]);
  const [topComments, setTopComments] = useState([]);
  const [worstComments, setWorstComments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!shipId) return;

    let alive = true;
    setLoading(true);
    setErr("");

    // ✅ Use allSettled so one endpoint failing doesn't nuke the page
    Promise.allSettled([
      CruiseAPI.shipSummary(shipId),
      CruiseAPI.shipPorts(shipId, 80),
      CruiseAPI.shipThemes(shipId, 15, 20),
      CruiseAPI.shipTrend(shipId),
      CruiseAPI.shipTopComments(shipId, 15),
      CruiseAPI.shipWorstComments(shipId, 15),
    ])
      .then((results) => {
        if (!alive) return;

        const [
          rSummary,
          rPorts,
          rThemes,
          rTrend,
          rTop,
          rWorst,
        ] = results;

        if (rSummary.status === "fulfilled") setSummary(rSummary.value);
        else setErr((prev) => prev || String(rSummary.reason?.message || rSummary.reason));

        if (rPorts.status === "fulfilled") setPorts(Array.isArray(rPorts.value) ? rPorts.value : []);
        if (rThemes.status === "fulfilled") setThemes(Array.isArray(rThemes.value) ? rThemes.value : []);
        if (rTrend.status === "fulfilled") setTrend(Array.isArray(rTrend.value) ? rTrend.value : []);
        if (rTop.status === "fulfilled") setTopComments(Array.isArray(rTop.value) ? rTop.value : []);
        if (rWorst.status === "fulfilled") setWorstComments(Array.isArray(rWorst.value) ? rWorst.value : []);
      })
      .catch((e) => alive && setErr(String(e?.message || e)))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [shipId]);

  // ✅ Correct shape normalization
  const sentiment = summary?.sentiment || summary || null;

  const mentions =
    sentiment?.mentions ??
    summary?.mentions ??
    null;

  const avgSent =
    sentiment?.avg_sentiment ??
    summary?.avg_sentiment ??
    null;

  const avgSev =
    sentiment?.avg_severity ??
    summary?.avg_severity ??
    null;

  const shipTitle = useMemo(() => titleizeShip(shipId), [shipId]);

  // Best/worst ports from ship_ports query
  const portsSorted = useMemo(() => {
    const arr = Array.isArray(ports) ? [...ports] : [];
    arr.sort((a, b) => (b.mentions ?? 0) - (a.mentions ?? 0));
    return arr;
  }, [ports]);

  const bestPorts = portsSorted.slice(0, 6);
  const worstPorts = [...portsSorted].reverse().slice(0, 6);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="p-6 border-b border-zinc-900/60">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-zinc-400">Cruise ship</div>
            <div className="text-2xl font-semibold mt-1 truncate">{shipTitle}</div>
            <div className="text-[11px] text-zinc-500 mt-1 truncate">id: {shipId}</div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <div className="text-xs text-zinc-500">{loading ? "Loading…" : ""}</div>
            <Link
              to="/"
              className="text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/50"
            >
              ← Back to ports
            </Link>
          </div>
        </div>

        {err && (
          <div className="mt-4 text-xs text-red-300 whitespace-pre-wrap">
            Load failed: {err}
          </div>
        )}
      </div>

      <div className="p-6 grid grid-cols-[1fr_420px] gap-6">
        {/* LEFT MAIN */}
        <div className="space-y-6 min-w-0">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3">
            <StatPill label="Mentions" value={mentions} />
            <StatPill label="Avg Sentiment" value={typeof avgSent === "number" ? avgSent.toFixed(3) : "—"} />
            <StatPill label="Avg Severity" value={typeof avgSev === "number" ? avgSev.toFixed(3) : "—"} />
          </div>

          {/* Trend */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <div className="text-sm font-semibold">Sentiment & Severity Trend</div>
              <div className="text-xs text-zinc-500">monthly</div>
            </div>
            <div className="p-4 h-[280px]">
              <TrendLine data={trend} />
            </div>
          </div>

          {/* Ports best/worst */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <div className="text-sm font-semibold">Best ports (most mentions)</div>
              </div>
              <div className="p-4 space-y-2">
                {bestPorts.map((p) => (
                  <div key={p.port_id} className="flex items-center justify-between text-sm border border-zinc-800 bg-zinc-950/60 rounded-xl px-3 py-2">
                    <span className="truncate">{p.port_id}</span>
                    <span className="text-xs text-zinc-500 shrink-0">{p.mentions ?? 0}</span>
                  </div>
                ))}
                {!bestPorts.length && <div className="text-sm text-zinc-500">No ports yet.</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <div className="text-sm font-semibold">Least mentioned ports</div>
              </div>
              <div className="p-4 space-y-2">
                {worstPorts.map((p) => (
                  <div key={p.port_id} className="flex items-center justify-between text-sm border border-zinc-800 bg-zinc-950/60 rounded-xl px-3 py-2">
                    <span className="truncate">{p.port_id}</span>
                    <span className="text-xs text-zinc-500 shrink-0">{p.mentions ?? 0}</span>
                  </div>
                ))}
                {!worstPorts.length && <div className="text-sm text-zinc-500">No ports yet.</div>}
              </div>
            </div>
          </div>

          {/* Top / Worst comments */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <div className="text-sm font-semibold">Most liked comments</div>
              </div>
              <div className="p-4 space-y-3">
                {topComments.slice(0, 10).map((c) => (
                  <a
                    key={c.object_id || c.permalink}
                    href={c.permalink || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/50 p-3"
                  >
                    <div className="text-xs text-zinc-500 flex items-center justify-between">
                      <span className="truncate">{c.subreddit || "—"}</span>
                      <span className="shrink-0">score {c.score ?? 0}</span>
                    </div>
                    <div className="mt-2 text-sm text-zinc-200 leading-relaxed">
                      {c.preview || ""}
                      {c.preview?.length >= 230 ? "…" : ""}
                    </div>
                  </a>
                ))}
                {!topComments.length && <div className="text-sm text-zinc-500">No comments yet.</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <div className="text-sm font-semibold">Worst experiences</div>
              </div>
              <div className="p-4 space-y-3">
                {worstComments.slice(0, 10).map((c) => (
                  <a
                    key={c.object_id || c.permalink}
                    href={c.permalink || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/50 p-3"
                  >
                    <div className="text-xs text-zinc-500 flex items-center justify-between">
                      <span className="truncate">{c.subreddit || "—"}</span>
                      <span className="shrink-0">sev {c.severity_score?.toFixed?.(3) ?? "—"}</span>
                    </div>
                    <div className="mt-2 text-sm text-zinc-200 leading-relaxed">
                      {c.preview || ""}
                      {c.preview?.length >= 230 ? "…" : ""}
                    </div>
                  </a>
                ))}
                {!worstComments.length && <div className="text-sm text-zinc-500">No comments yet.</div>}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT RAIL */}
        <div className="space-y-4 min-w-0">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <div className="text-sm font-semibold">Sentiment mix</div>
            </div>
            <div className="p-4 h-[240px]">
              <SentimentDonut summary={sentiment} />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <div className="text-sm font-semibold">Theme composition</div>
            </div>
            <div className="p-4 h-[300px]">
              <ThemeDonut themes={themes} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
