import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
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

function PortRankCard({ title, rows, kind = "best" }) {
  // kind: best = low severity + high sentiment, worst = high severity + low sentiment
  const ranked = useMemo(() => {
    const arr = Array.isArray(rows) ? rows : [];
    const safe = arr
      .map((r) => ({
        ...r,
        mentions: Number(r.mentions || 0),
        avg_sev: Number(r.avg_sev ?? 0),
        avg_sent: Number(r.avg_sent ?? 0),
      }))
      .filter((r) => r.port_id);

    const score = (r) =>
      kind === "best"
        ? (1 - r.avg_sev) * 0.6 + (r.avg_sent + 1) * 0.4
        : r.avg_sev * 0.6 + (1 - (r.avg_sent + 1) / 2) * 0.4;

    safe.sort((a, b) => score(b) - score(a));
    return safe.slice(0, 8);
  }, [rows, kind]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-zinc-500">{ranked.length} ports</div>
      </div>

      <div className="p-4 space-y-2">
        {ranked.map((p) => (
          <Link
            key={p.port_id}
            to={`/ports`} // if you later make /ports/:portId, change this
            className="block rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/50 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium truncate">{p.port_id}</div>
              <div className="text-xs text-zinc-500 shrink-0">
                {p.mentions} mentions
              </div>
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              avg_sev {p.avg_sev.toFixed(3)} • avg_sent {p.avg_sent.toFixed(3)}
            </div>
          </Link>
        ))}
        {!ranked.length && <div className="text-sm text-zinc-500">No data yet.</div>}
      </div>
    </div>
  );
}

function CommentCard({ item }) {
  return (
    <a
      href={item.permalink || "#"}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/50 p-4"
    >
      <div className="flex items-center justify-between text-xs text-zinc-500 gap-2">
        <span className="truncate">{item.subreddit || "—"}</span>
        <span className="shrink-0">
          score {item.score ?? "—"} • sev {item.severity_score?.toFixed?.(3) ?? "—"} • sent{" "}
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
  );
}

export default function LinePage() {
  const { lineId } = useParams();

  const [summary, setSummary] = useState(null);
  const [themes, setThemes] = useState([]);
  const [trend, setTrend] = useState([]);
  const [ports, setPorts] = useState([]);

  const [topComments, setTopComments] = useState([]);
  const [worstComments, setWorstComments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!lineId) return;
    let alive = true;
    setLoading(true);
    setErr("");

    Promise.all([
      CruiseAPI.lineSummary(lineId),
      CruiseAPI.lineThemes(lineId, 15, 30),
      CruiseAPI.lineTrend(lineId),
      CruiseAPI.linePorts(lineId, 80),
      CruiseAPI.lineTopComments(lineId, 15),
      CruiseAPI.lineWorstComments(lineId, 15),
    ])
      .then(([s, t, tr, p, top, worst]) => {
        if (!alive) return;
        setSummary(s || null);
        setThemes(Array.isArray(t) ? t : []);
        setTrend(Array.isArray(tr) ? tr : []);
        setPorts(Array.isArray(p) ? p : []);
        setTopComments(Array.isArray(top) ? top : []);
        setWorstComments(Array.isArray(worst) ? worst : []);
      })
      .catch((e) => alive && setErr(String(e?.message || e)))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [lineId]);

  const sentiment = summary?.sentiment || summary || null;

  const mentions = sentiment?.mentions ?? null;
  const avgSent = sentiment?.avg_sentiment ?? null;
  const avgSev = sentiment?.avg_severity ?? null;

  const niceName = useMemo(() => {
    // optional: if you want to show a nicer name than slug
    return (lineId || "").split("-").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
  }, [lineId]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-zinc-400">Cruise line</div>
            <div className="mt-1 text-2xl font-semibold truncate">{niceName}</div>
            <div className="mt-2 text-xs text-zinc-500">
              id: <span className="text-zinc-300">{lineId}</span> {loading ? " • Loading…" : ""}
            </div>
          </div>

          <Link
            to="/ports"
            className="text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/50"
          >
            Back to ports
          </Link>
        </div>

        {err && <div className="mt-4 text-xs text-red-300 whitespace-pre-wrap">{err}</div>}

        {/* Stats */}
        <div className="mt-5 grid grid-cols-4 gap-3">
          <StatPill label="Mentions" value={mentions} />
          <StatPill label="Avg Sentiment" value={typeof avgSent === "number" ? avgSent.toFixed(3) : "—"} />
          <StatPill label="Avg Severity" value={typeof avgSev === "number" ? avgSev.toFixed(3) : "—"} />
          <StatPill label="Ports Mentioned" value={ports?.length ?? 0} />
        </div>

        {/* Top row cards */}
        <div className="mt-5 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 overflow-hidden">
            <div className="text-sm font-semibold mb-2">Sentiment Mix</div>
            <div className="h-[240px]">
              <SentimentDonut summary={sentiment} />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 overflow-hidden">
            <div className="text-sm font-semibold mb-2">Theme Composition</div>
            <div className="h-[240px]">
              <ThemeDonut themes={themes} />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 overflow-hidden">
            <div className="text-sm font-semibold mb-2">Line Trend</div>
            <div className="h-[240px]">
              <TrendLine data={trend} />
            </div>
          </div>
        </div>

        {/* Best/Worst ports */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <PortRankCard title="Best ports for this line" rows={ports} kind="best" />
          <PortRankCard title="Worst ports for this line" rows={ports} kind="worst" />
        </div>

        {/* Comments */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <div className="text-sm font-semibold">Most liked comments</div>
              <div className="text-xs text-zinc-500">{topComments.length}</div>
            </div>
            <div className="p-4 space-y-3">
              {topComments.map((c) => (
                <CommentCard key={c.object_id || c.permalink} item={c} />
              ))}
              {!loading && topComments.length === 0 && (
                <div className="text-sm text-zinc-500">No comments found.</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <div className="text-sm font-semibold">Worst experiences</div>
              <div className="text-xs text-zinc-500">{worstComments.length}</div>
            </div>
            <div className="p-4 space-y-3">
              {worstComments.map((c) => (
                <CommentCard key={c.object_id || c.permalink} item={c} />
              ))}
              {!loading && worstComments.length === 0 && (
                <div className="text-sm text-zinc-500">No comments found.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
