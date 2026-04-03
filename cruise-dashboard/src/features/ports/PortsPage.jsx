/* eslint-disable react-hooks/set-state-in-effect */
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PortsMap from "./PortsMap";
import portsGeo from "./ports_geo.json";
import { CruiseAPI } from "../../api/cruiseApi";

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatSigned(value, digits = 2) {
  if (typeof value !== "number") return "n/a";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function formatPercent(part, total) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function formatMonth(month) {
  if (!month) return "";
  const [year, mon] = month.split("-");
  return new Date(Number(year), Number(mon) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function formatDate(utc) {
  if (!utc) return "n/a";
  return new Date(Number(utc) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sentimentBucket(value) {
  if (typeof value !== "number") return "mixed";
  if (value >= 0.15) return "positive";
  if (value <= -0.1) return "negative";
  return "mixed";
}

function topThemeLabel(rows) {
  return rows?.[0]?.theme_label || "Not enough theme data";
}

function topLineLabel(rows) {
  return rows?.[0]?.line_name || "No line signal";
}

function Surface({ title, subtitle, action, children, className = "" }) {
  return (
    <section
      className={`rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.68))] shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            {title ? <h2 className="text-lg font-semibold text-slate-50">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function KPI({ label, value, hint }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {hint ? <div className="mt-1 text-sm text-slate-400">{hint}</div> : null}
    </div>
  );
}

function ThemeChip({ label, count, tone = "neutral" }) {
  const tones = {
    neutral: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    positive: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    negative: "border-rose-400/25 bg-rose-400/10 text-rose-100",
  };

  return (
    <div className={`rounded-full border px-3 py-1.5 text-xs ${tones[tone]}`}>
      {label}
      {typeof count === "number" ? <span className="ml-1 text-slate-300">({count})</span> : null}
    </div>
  );
}

function PostCard({ post }) {
  return (
    <a
      href={post.permalink || post.url || "#"}
      target="_blank"
      rel="noreferrer"
      className="block rounded-[1.35rem] border border-white/10 bg-white/5 p-4 transition hover:border-cyan-300/30 hover:bg-white/8"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        <span>r/{post.subreddit || "unknown"}</span>
        <span>{formatDate(post.created_utc)}</span>
        <span>{formatNumber(post.score)} score</span>
        <span>{formatNumber(post.num_comments)} comments</span>
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-6 text-slate-50">
        {post.title || "Untitled Reddit post"}
      </h3>
      {post.preview ? <p className="mt-2 text-sm leading-6 text-slate-300">{post.preview}</p> : null}
      <div className="mt-3 text-xs text-cyan-200">
        {post.cruise_line || "Cruise line not inferred"} • sentiment {formatSigned(post.sentiment_score)}
      </div>
    </a>
  );
}

function CompareMetric({ label, left, right }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-slate-100">
        <div>{left}</div>
        <div>{right}</div>
      </div>
    </div>
  );
}

export default function PortsPage() {
  const [ports, setPorts] = useState([]);
  const [loadingPorts, setLoadingPorts] = useState(true);
  const [portsError, setPortsError] = useState("");
  const [selectedPortId, setSelectedPortId] = useState("");
  const [comparePortId, setComparePortId] = useState("");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("mentions");
  const [postTab, setPostTab] = useState("top");
  const [selectedOverview, setSelectedOverview] = useState(null);
  const [compareOverview, setCompareOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState("");

  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let alive = true;
    setLoadingPorts(true);
    setPortsError("");

    CruiseAPI.portsIntelligence(120)
      .then((rows) => {
        if (!alive) return;
        const merged = (Array.isArray(rows) ? rows : [])
          .map((row) => {
            const geo = portsGeo[row.port_id] || {};
            return {
              ...row,
              ...geo,
              country: geo.country || "Unknown",
              region: geo.region || "Other",
              lat: geo.lat,
              lon: geo.lon,
            };
          })
          .filter((row) => row.name);

        setPorts(merged);
        if (merged.length) {
          setSelectedPortId((current) => current || merged[0].port_id);
          setComparePortId((current) => current || merged[1]?.port_id || merged[0].port_id);
        }
      })
      .catch((error) => {
        if (!alive) return;
        setPortsError(String(error?.message || error));
      })
      .finally(() => {
        if (alive) setLoadingPorts(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedPortId) return;
    let alive = true;
    setLoadingOverview(true);
    setOverviewError("");

    Promise.all([
      CruiseAPI.portOverview(selectedPortId),
      comparePortId && comparePortId !== selectedPortId ? CruiseAPI.portOverview(comparePortId) : Promise.resolve(null),
    ])
      .then(([selected, compare]) => {
        if (!alive) return;
        setSelectedOverview(selected);
        setCompareOverview(compare);
      })
      .catch((error) => {
        if (!alive) return;
        setOverviewError(String(error?.message || error));
      })
      .finally(() => {
        if (alive) setLoadingOverview(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedPortId, comparePortId]);

  const filteredPorts = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const sorted = [...ports]
      .filter((port) => {
        const matchesQuery =
          !q ||
          `${port.name} ${port.country} ${port.region} ${port.port_id}`.toLowerCase().includes(q);
        const matchesRegion = region === "all" || port.region === region;
        const matchesSentiment =
          sentimentFilter === "all" || sentimentBucket(port.avg_sentiment) === sentimentFilter;
        return matchesQuery && matchesRegion && matchesSentiment;
      })
      .sort((a, b) => {
        if (sortBy === "pulse") return (b.pulse_score || 0) - (a.pulse_score || 0);
        if (sortBy === "sentiment") return (b.avg_sentiment || 0) - (a.avg_sentiment || 0);
        return (b.mentions || 0) - (a.mentions || 0);
      });

    return sorted;
  }, [deferredQuery, ports, region, sentimentFilter, sortBy]);

  const regions = useMemo(
    () => ["all", ...new Set(ports.map((port) => port.region).filter(Boolean))],
    [ports]
  );

  const selectedPort = useMemo(
    () => ports.find((port) => port.port_id === selectedPortId) || null,
    [ports, selectedPortId]
  );

  const aggregateStats = useMemo(() => {
    const totalMentions = filteredPorts.reduce((sum, port) => sum + (port.mentions || 0), 0);
    const avgPulse =
      filteredPorts.reduce((sum, port) => sum + Number(port.pulse_score || 0), 0) /
      Math.max(filteredPorts.length, 1);
    const positivePorts = filteredPorts.filter((port) => sentimentBucket(port.avg_sentiment) === "positive").length;
    return {
      totalMentions,
      avgPulse,
      positivePorts,
    };
  }, [filteredPorts]);

  const trendData = useMemo(
    () =>
      (selectedOverview?.trend || []).map((row) => ({
        month: formatMonth(row.month),
        mentions: row.mentions,
        avg_sent: row.avg_sent,
      })),
    [selectedOverview]
  );

  const postTabs = [
    { key: "top", label: "Top liked" },
    { key: "most_commented", label: "Most commented" },
    { key: "recent", label: "Most recent" },
  ];
  const postRows = selectedOverview?.posts?.[postTab] || [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.18),transparent_28%),linear-gradient(180deg,#020617,#081225_42%,#0f172a)] text-slate-100">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 py-6 lg:px-6">
        <Surface className="overflow-hidden">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_0.95fr]">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-100">
                Cruise Port Intelligence Map
              </div>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Explore what travelers are saying about cruise ports across Reddit.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                A location-based intelligence platform that maps traveler sentiment, engagement,
                themes, and cruise-line association by destination.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <KPI label="Tracked Ports" value={formatNumber(filteredPorts.length)} hint="Ports with mapped metadata and Reddit signal" />
              <KPI label="Mentions" value={formatNumber(aggregateStats.totalMentions)} hint="Comment-level mentions in the current view" />
              <KPI label="Avg Pulse" value={aggregateStats.avgPulse.toFixed(1)} hint="Weighted blend of volume, sentiment, and engagement" />
              <KPI
                label="Positive Ports"
                value={formatPercent(aggregateStats.positivePorts, filteredPorts.length)}
                hint="Share of visible ports trending positive"
              />
            </div>
          </div>
        </Surface>

        <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)_28rem]">
          <div className="space-y-6">
            <Surface title="Filters" subtitle="Focus the map by region, mood, and port name.">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-400">Search</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cozumel, Nassau, Miami..."
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none ring-0 transition placeholder:text-slate-500 focus:border-cyan-300/40"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-400">Region</span>
                  <select
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-cyan-300/40"
                  >
                    {regions.map((value) => (
                      <option key={value} value={value}>
                        {value === "all" ? "All regions" : value}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-400">Sentiment</span>
                  <select
                    value={sentimentFilter}
                    onChange={(event) => setSentimentFilter(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-cyan-300/40"
                  >
                    <option value="all">All sentiment</option>
                    <option value="positive">Positive leaning</option>
                    <option value="mixed">Mixed</option>
                    <option value="negative">Negative leaning</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-400">Sort</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-cyan-300/40"
                  >
                    <option value="mentions">Most mentions</option>
                    <option value="pulse">Highest pulse score</option>
                    <option value="sentiment">Best sentiment</option>
                  </select>
                </label>
              </div>
            </Surface>

            <Surface
              title="Port Leaderboard"
              subtitle={loadingPorts ? "Loading live Reddit destination signal..." : `${filteredPorts.length} ports in view`}
            >
              <div className="space-y-3">
                {filteredPorts.map((port) => {
                  const active = port.port_id === selectedPortId;
                  return (
                    <button
                      key={port.port_id}
                      onClick={() => setSelectedPortId(port.port_id)}
                      className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition ${
                        active
                          ? "border-cyan-300/40 bg-cyan-300/10"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-white">{port.name}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {port.country} • {port.region}
                          </div>
                        </div>
                        <div className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300">
                          {formatNumber(port.mentions)}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-300">
                        <div>
                          <div className="text-slate-500">Pulse</div>
                          <div className="mt-1">{port.pulse_score}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">Sentiment</div>
                          <div className="mt-1">{formatSigned(port.avg_sentiment)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">Posts</div>
                          <div className="mt-1">{formatNumber(port.post_mentions)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {!loadingPorts && filteredPorts.length === 0 ? (
                  <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
                    No ports match the current filter set.
                  </div>
                ) : null}

                {portsError ? <div className="text-sm text-rose-300">{portsError}</div> : null}
              </div>
            </Surface>
          </div>

          <div className="space-y-6">
            <Surface
              title="Interactive Destination Map"
              subtitle="Marker size reflects discussion volume. Marker color tracks sentiment balance."
              action={
                <div className="text-right text-xs text-slate-400">
                  <div>Selected port</div>
                  <div className="mt-1 font-semibold text-slate-100">{selectedPort?.name || "None"}</div>
                </div>
              }
            >
              <PortsMap
                ports={filteredPorts.filter((port) => typeof port.lat === "number" && typeof port.lon === "number")}
                selectedPortId={selectedPortId}
                onSelect={setSelectedPortId}
              />

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                <ThemeChip label="Positive signal" tone="positive" />
                <ThemeChip label="Mixed signal" tone="neutral" />
                <ThemeChip label="Negative signal" tone="negative" />
              </div>
            </Surface>

            <Surface
              title="Compare Ports"
              subtitle="Put two destinations side by side to contrast attention, mood, and traveler concerns."
              action={
                <select
                  value={comparePortId}
                  onChange={(event) => setComparePortId(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm outline-none focus:border-cyan-300/40"
                >
                  {ports
                    .filter((port) => port.port_id !== selectedPortId)
                    .map((port) => (
                      <option key={port.port_id} value={port.port_id}>
                        {port.name}
                      </option>
                    ))}
                </select>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/8 p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-cyan-100">Primary</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{selectedOverview?.port?.name || selectedPort?.name || "Select a port"}</div>
                  <div className="mt-2 text-sm text-slate-300">
                    {selectedPort?.country} • {selectedPort?.region}
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Comparison</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{compareOverview?.port?.name || "Pick a port"}</div>
                  <div className="mt-2 text-sm text-slate-300">
                    {ports.find((port) => port.port_id === comparePortId)?.country || "Unknown"} •{" "}
                    {ports.find((port) => port.port_id === comparePortId)?.region || "Unknown"}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <CompareMetric
                  label="Mentions"
                  left={formatNumber(selectedOverview?.port?.mentions)}
                  right={formatNumber(compareOverview?.port?.mentions)}
                />
                <CompareMetric
                  label="Pulse"
                  left={selectedOverview?.port?.pulse_score ?? "n/a"}
                  right={compareOverview?.port?.pulse_score ?? "n/a"}
                />
                <CompareMetric
                  label="Sentiment"
                  left={formatSigned(selectedOverview?.port?.avg_sentiment)}
                  right={formatSigned(compareOverview?.port?.avg_sentiment)}
                />
                <CompareMetric
                  label="Top Line"
                  left={topLineLabel(selectedOverview?.top_lines)}
                  right={topLineLabel(compareOverview?.top_lines)}
                />
                <CompareMetric
                  label="Traveler Concern"
                  left={topThemeLabel(selectedOverview?.traveler_concerns)}
                  right={topThemeLabel(compareOverview?.traveler_concerns)}
                />
                <CompareMetric
                  label="Traveler Favorite"
                  left={topThemeLabel(selectedOverview?.traveler_favorites)}
                  right={topThemeLabel(compareOverview?.traveler_favorites)}
                />
              </div>
            </Surface>
          </div>

          <div className="space-y-6">
            <Surface
              title={selectedOverview?.port?.name || "Port Detail"}
              subtitle="Destination-level Reddit intelligence panel"
              action={loadingOverview ? <div className="text-sm text-slate-400">Refreshing…</div> : null}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <KPI label="Mentions" value={formatNumber(selectedOverview?.port?.mentions)} hint="Comment-level references" />
                <KPI label="Port Pulse" value={selectedOverview?.port?.pulse_score ?? "n/a"} hint="Composite score out of 100" />
                <KPI
                  label="Sentiment"
                  value={formatSigned(selectedOverview?.port?.avg_sentiment)}
                  hint={`${formatPercent(selectedOverview?.port?.pos_count, selectedOverview?.port?.mentions)} positive`}
                />
                <KPI
                  label="Cruise Posts"
                  value={formatNumber(selectedOverview?.port?.post_mentions)}
                  hint="Posts explicitly tied to this port"
                />
              </div>

              <div className="mt-5 grid gap-5">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Most Associated Cruise Lines</div>
                  <div className="mt-3 space-y-3">
                    {(selectedOverview?.top_lines || []).map((row) => (
                      <div key={row.line_id} className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-slate-100">{row.line_name}</div>
                          <div className="text-xs text-slate-400">{row.mention_pct}%</div>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500" style={{ width: `${row.mention_pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Keyword Clusters</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(selectedOverview?.keywords || []).map((row) => (
                      <ThemeChip key={row.keyword} label={row.keyword} count={row.n} />
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Traveler Favorites</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(selectedOverview?.traveler_favorites || []).map((row) => (
                        <ThemeChip key={row.theme_label} label={row.theme_label} count={row.n} tone="positive" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Traveler Concerns</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(selectedOverview?.traveler_concerns || []).map((row) => (
                        <ThemeChip key={row.theme_label} label={row.theme_label} count={row.n} tone="negative" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Surface>

            <Surface title="Trends Over Time" subtitle="Mentions by month with average sentiment trendline.">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="mentionsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area yAxisId="left" type="monotone" dataKey="mentions" stroke="#22d3ee" fill="url(#mentionsGradient)" strokeWidth={2.5} />
                    <Bar yAxisId="right" dataKey="avg_sent" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={12} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Spike Detection</div>
                <div className="mt-3 grid gap-3">
                  {(selectedOverview?.spikes || []).map((spike) => (
                    <div key={spike.month} className="rounded-[1.25rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
                      {formatMonth(spike.month)} jumped by {formatNumber(spike.delta_mentions)} mentions to{" "}
                      {formatNumber(spike.mentions)} total, a {spike.spike_ratio}x month-over-month increase.
                    </div>
                  ))}
                  {!selectedOverview?.spikes?.length ? (
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                      No sharp mention spikes detected in the current monthly series.
                    </div>
                  ) : null}
                </div>
              </div>
            </Surface>

            <Surface title="Post Explorer" subtitle="Top liked, most debated, and freshest port discussions.">
              <div className="mb-4 flex flex-wrap gap-2">
                {postTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setPostTab(tab.key)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      postTab === tab.key
                        ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {postRows.map((post) => (
                  <PostCard key={`${postTab}-${post.post_id}`} post={post} />
                ))}
                {!postRows.length ? (
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
                    No posts available for this port and view.
                  </div>
                ) : null}
              </div>
            </Surface>

            {overviewError ? (
              <div className="rounded-[1.5rem] border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
                {overviewError}
              </div>
            ) : null}
          </div>
        </div>

        <Surface title="Theme Composition Snapshot" subtitle="Highest-volume topics tied to the selected port.">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(selectedOverview?.themes || []).slice(0, 10).map((row) => ({
                  theme: row.theme_label,
                  mentions: row.n,
                }))}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 12, bottom: 0 }}
              >
                <CartesianGrid stroke="rgba(148,163,184,0.12)" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="theme" stroke="#cbd5e1" tickLine={false} axisLine={false} width={120} />
                <Tooltip />
                <Bar dataKey="mentions" fill="#38bdf8" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>
    </div>
  );
}
